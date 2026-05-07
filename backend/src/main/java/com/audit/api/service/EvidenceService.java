package com.audit.api.service;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class EvidenceService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final ChecklistTemplateRepository templateRepository;
    private final ChecklistItemTemplateRepository templateItemRepository;
    private final DocumentRepository documentRepository;
    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;
    private final BankValidationService bankValidationService;

    @Autowired
    public EvidenceService(ChecklistRepository checklistRepository,
                           ChecklistItemRepository checklistItemRepository,
                           ChecklistTemplateRepository templateRepository,
                           ChecklistItemTemplateRepository templateItemRepository,
                           DocumentRepository documentRepository,
                           TransactionRepository transactionRepository,
                           SecurityUtils securityUtils,
                           BankValidationService bankValidationService) {
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.templateRepository = templateRepository;
        this.templateItemRepository = templateItemRepository;
        this.documentRepository = documentRepository;
        this.transactionRepository = transactionRepository;
        this.securityUtils = securityUtils;
        this.bankValidationService = bankValidationService;
    }

    /** Get or create checklist for a transaction, seeding from matching template */
    @Transactional
    public Checklist getOrCreateChecklist(UUID transactionId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        return checklistRepository.findByTransactionId(transactionId).orElseGet(() -> {
            Transaction tx = transactionRepository.findById(transactionId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));

            Checklist checklist = new Checklist();
            checklist.setTransactionId(transactionId);
            checklist.setCompleted(false);
            checklist.setOrganizationId(orgId);
            checklist = checklistRepository.save(checklist);

            // Seed items from matching template (by category name — supports comma-separated multi-category)
            List<ChecklistTemplate> templates = templateRepository.findByOrganizationId(orgId);
            ChecklistTemplate matched = templates.stream()
                    .filter(t -> t.getDescription() != null && tx.getCategoryName() != null
                            && java.util.Arrays.stream(t.getDescription().split(","))
                                .map(String::trim)
                                .anyMatch(cat -> cat.equalsIgnoreCase(tx.getCategoryName())))
                    .findFirst()
                    .orElse(templates.isEmpty() ? null : templates.get(0));

            if (matched != null) {
                List<ChecklistItemTemplate> templateItems = templateItemRepository.findByTemplateId(matched.getId());
                final UUID checklistId = checklist.getId();
                templateItems.forEach(ti -> {
                    ChecklistItem item = new ChecklistItem();
                    item.setChecklistId(checklistId);
                    item.setDescription(ti.getDescription());
                    item.setMandatory(ti.isMandatory());
                    item.setProvided(false);
                    item.setOrganizationId(orgId);
                    checklistItemRepository.save(item);
                });
            }

            return checklist;
        });
    }

    public List<ChecklistItem> getChecklistItems(UUID checklistId) {
        return checklistItemRepository.findByChecklistId(checklistId);
    }

    /** Upload evidence file and link it to a checklist item */
    @Transactional
    public ChecklistItem uploadEvidence(UUID checklistItemId, MultipartFile file) throws Exception {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ChecklistItem item = checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));

        // Save file to local storage
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, orgId.toString(), "evidence", fileName);
        Files.createDirectories(filePath.getParent());
        Files.copy(file.getInputStream(), filePath);

        // Save document metadata
        Document doc = Document.builder()
                .fileName(file.getOriginalFilename())
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .build();
        doc.setOrganizationId(orgId);
        doc = documentRepository.save(doc);

        // Mark item as provided
        item.setDocumentId(doc.getId());
        item.setProvided(true);
        item = checklistItemRepository.save(item);

        // Recompute checklist completion
        updateChecklistCompletion(item.getChecklistId());

        // Trigger bank validation re-evaluation when evidence is uploaded
        checklistRepository.findById(item.getChecklistId()).ifPresent(cl ->
            transactionRepository.findById(cl.getTransactionId()).ifPresent(tx -> {
                bankValidationService.evaluateBankValidationRequirement(tx);
                transactionRepository.save(tx);
            })
        );

        return item;
    }

    /** Remove evidence from a checklist item */
    @Transactional
    public ChecklistItem removeEvidence(UUID checklistItemId) {
        ChecklistItem item = checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));
        item.setDocumentId(null);
        item.setProvided(false);
        item = checklistItemRepository.save(item);
        updateChecklistCompletion(item.getChecklistId());

        // Re-evaluate bank validation since evidence was removed
        checklistRepository.findById(item.getChecklistId()).ifPresent(cl ->
            transactionRepository.findById(cl.getTransactionId()).ifPresent(tx -> {
                bankValidationService.evaluateBankValidationRequirement(tx);
                transactionRepository.save(tx);
            })
        );

        return item;
    }

    private void updateChecklistCompletion(UUID checklistId) {
        long mandatory = checklistItemRepository.countByChecklistIdAndMandatory(checklistId, true);
        long mandatoryProvided = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(checklistId, true, true);
        boolean complete = mandatory > 0 && mandatory == mandatoryProvided;

        checklistRepository.findById(checklistId).ifPresent(cl -> {
            cl.setCompleted(complete);
            checklistRepository.save(cl);
        });
    }

    /** Audit readiness for a single transaction: % of mandatory items provided */
    public ReadinessScore getTransactionReadiness(UUID transactionId) {
        Checklist cl = checklistRepository.findByTransactionId(transactionId).orElse(null);
        if (cl == null) return new ReadinessScore(0, 0, 0, false);

        long total    = checklistItemRepository.countByChecklistIdAndMandatory(cl.getId(), true);
        long provided = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(cl.getId(), true, true);
        int pct       = total == 0 ? 100 : (int) Math.round((provided * 100.0) / total);
        return new ReadinessScore((int) total, (int) provided, pct, cl.isCompleted());
    }

    public record ReadinessScore(int total, int provided, int percentage, boolean complete) {}
}
