package com.audit.api.service;

import com.audit.api.entity.Transaction;
import com.audit.api.repository.TransactionRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;
    private final CategoryMappingService categoryMappingService;
    private final BankValidationService bankValidationService;
    private final AuditLifecycleService auditLifecycleService;

    @Autowired
    public TransactionService(TransactionRepository transactionRepository,
                               SecurityUtils securityUtils,
                               CategoryMappingService categoryMappingService,
                               BankValidationService bankValidationService,
                               AuditLifecycleService auditLifecycleService) {
        this.transactionRepository = transactionRepository;
        this.securityUtils = securityUtils;
        this.categoryMappingService = categoryMappingService;
        this.bankValidationService = bankValidationService;
        this.auditLifecycleService = auditLifecycleService;
    }

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<Transaction> getTransactionsByProject(UUID projectId) {
        return transactionRepository.findByOrganizationIdAndProjectId(
                securityUtils.getCurrentOrganizationId(), projectId);
    }

    public ImportResult importFromCsv(MultipartFile file, UUID projectId) throws Exception {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Transaction> transactions = new ArrayList<>();
        int skipped = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isBlank()) continue;
                if (firstLine) { firstLine = false; continue; }

                String[] data = line.split(",", -1);
                if (data.length < 5) { skipped++; continue; }

                Transaction tx = new Transaction();
                tx.setTransactionNumber(data[0].trim());
                tx.setTransactionDate(parseDate(data[1].trim()));
                tx.setDescription(data[2].trim());
                tx.setDebitCredit(data[3].trim());
                tx.setAmount(parseBigDecimal(data[4].trim()));
                tx.setLedgerName(get(data, 5));
                tx.setProjectCode(get(data, 6));
                tx.setCategoryName(get(data, 7));
                tx.setSubcategory(get(data, 8));
                tx.setVendorCustomer(get(data, 9));
                tx.setReferenceNo(get(data, 10));
                tx.setProjectId(projectId);
                tx.setStatus("PENDING_EVIDENCE");
                tx.setOrganizationId(orgId);
                categoryMappingService.autoTag(tx, orgId);
                bankValidationService.evaluateBankValidationRequirement(tx);
                transactions.add(tx);
            }
        }
        transactionRepository.saveAll(transactions);
        return new ImportResult(transactions.size(), skipped);
    }

    public BankImportResult importBankStatement(MultipartFile file, UUID projectId) throws Exception {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Transaction> existing = transactionRepository.findByOrganizationIdAndProjectId(orgId, projectId);

        int matched = 0, created = 0, skipped = 0;
        List<Transaction> toSave = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isBlank()) continue;
                if (firstLine) { firstLine = false; continue; }

                String[] data = line.split(",", -1);
                if (data.length < 4) { skipped++; continue; }

                LocalDate date = parseDate(data[0].trim());
                String desc = data[1].trim();
                BigDecimal debit  = parseBigDecimal(data[2].trim());
                BigDecimal credit = parseBigDecimal(data[3].trim());
                String bankRef = get(data, 5);

                BigDecimal amount = debit.compareTo(BigDecimal.ZERO) != 0 ? debit : credit;
                String drCr = debit.compareTo(BigDecimal.ZERO) != 0 ? "Debit" : "Credit";

                Transaction match = existing.stream()
                        .filter(t -> t.getTransactionDate().equals(date)
                                && t.getAmount().compareTo(amount) == 0
                                && (t.getBankRefNo() == null || t.getBankRefNo().isBlank()))
                        .findFirst().orElse(null);

                if (match != null) {
                    match.setBankRefNo(bankRef);
                    match.setBankMatched(true);
                    toSave.add(match);
                    matched++;
                } else {
                    Transaction tx = new Transaction();
                    tx.setTransactionDate(date);
                    tx.setDescription(desc);
                    tx.setDebitCredit(drCr);
                    tx.setAmount(amount);
                    tx.setBankRefNo(bankRef);
                    tx.setBankMatched(false);
                    tx.setTransactionNumber("BANK-" + (bankRef.isBlank()
                            ? UUID.randomUUID().toString().substring(0, 8) : bankRef));
                    tx.setProjectId(projectId);
                    tx.setStatus("PENDING_EVIDENCE");
                    tx.setOrganizationId(orgId);
                    bankValidationService.evaluateBankValidationRequirement(tx);
                    toSave.add(tx);
                    created++;
                }
            }
        }
        transactionRepository.saveAll(toSave);
        return new BankImportResult(matched, created, skipped);
    }

    public Transaction updateStatus(UUID id, String status) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!tx.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
            throw new RuntimeException("Unauthorized access");
        tx.setStatus(status);
        bankValidationService.evaluateBankValidationRequirement(tx);
        transactionRepository.save(tx);
        // Run compliance validation when a transaction is approved
        if ("APPROVED".equals(status)) {
            auditLifecycleService.validateTransaction(id);
        }
        return transactionRepository.findById(id).orElse(tx);
    }

    public Transaction linkVendor(UUID id, UUID vendorId) {
        Transaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!tx.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
            throw new RuntimeException("Unauthorized access");
        tx.setVendorId(vendorId);
        bankValidationService.evaluateBankValidationRequirement(tx);
        return transactionRepository.save(tx);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private LocalDate parseDate(String s) {
        String[] patterns = {"dd-MM-yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "d-M-yyyy"};
        for (String p : patterns) {
            try { return LocalDate.parse(s, DateTimeFormatter.ofPattern(p)); }
            catch (DateTimeParseException ignored) {}
        }
        return LocalDate.now();
    }

    private BigDecimal parseBigDecimal(String s) {
        try { return new BigDecimal(s.replaceAll("[^0-9.]", "")); }
        catch (Exception e) { return BigDecimal.ZERO; }
    }

    private String get(String[] arr, int idx) {
        return arr.length > idx ? arr[idx].trim() : "";
    }

    // ── result records ────────────────────────────────────────────────────────

    public record ImportResult(int imported, int skipped) {}
    public record BankImportResult(int matched, int created, int skipped) {}
}
