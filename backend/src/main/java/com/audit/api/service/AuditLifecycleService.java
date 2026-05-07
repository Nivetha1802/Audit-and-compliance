package com.audit.api.service;

import com.audit.api.entity.Finding;
import com.audit.api.entity.Project;
import com.audit.api.entity.Transaction;
import com.audit.api.repository.FindingRepository;
import com.audit.api.repository.ProjectRepository;
import com.audit.api.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AuditLifecycleService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private FindingRepository findingRepository;

    @Autowired
    private ProjectRepository projectRepository;

    private static final BigDecimal TOLERANCE = new BigDecimal("0.02");

    @Transactional
    public void validateTransaction(UUID transactionId) {
        Transaction txn = transactionRepository.findById(transactionId).orElseThrow();
        List<String> issues = new ArrayList<>();

        // 1. Two-way match (Invoice vs Ledger)
        if (txn.getInvoiceAmount() != null) {
            if (txn.getAmount().compareTo(txn.getInvoiceAmount()) != 0) {
                issues.add("Invoice Amount (" + txn.getInvoiceAmount() + ") does not match Ledger Amount (" + txn.getAmount() + ")");
            }
        }

        // 2. Three-way match (PO <-> GRN <-> Invoice)
        if (txn.getPoNumber() != null && txn.getGrnNumber() != null && txn.getInvoiceNumber() != null) {
            // Amount checks
            if (isOutsideTolerance(txn.getInvoiceAmount(), txn.getPoAmount())) {
                issues.add("Invoice Amount outside tolerance of PO Amount");
            }
            if (isOutsideTolerance(txn.getInvoiceAmount(), txn.getGrnAmount())) {
                issues.add("Invoice Amount outside tolerance of GRN Amount");
            }

            // Quantity checks
            if (txn.getPoQty() != null && txn.getGrnQty() != null && txn.getGrnQty() > txn.getPoQty()) {
                issues.add("GRN Quantity (" + txn.getGrnQty() + ") exceeds PO Quantity (" + txn.getPoQty() + ")");
            }
            if (txn.getGrnQty() != null && txn.getInvoiceQty() != null && txn.getInvoiceQty() > txn.getGrnQty()) {
                issues.add("Invoice Quantity (" + txn.getInvoiceQty() + ") exceeds GRN Quantity (" + txn.getGrnQty() + ")");
            }

            // Date validation
            if (txn.getPoDate() != null && txn.getGrnDate() != null && txn.getGrnDate().isBefore(txn.getPoDate())) {
                issues.add("GRN Date is before PO Date");
            }
            if (txn.getGrnDate() != null && txn.getInvoiceDate() != null && txn.getInvoiceDate().isBefore(txn.getGrnDate())) {
                issues.add("Invoice Date is before GRN Date");
            }
        }

        // 4. Four-way match (Adds Bank)
        if (txn.getBankMatched() != null && txn.getBankMatched() && txn.getInvoiceAmount() != null) {
            // Check bank payment matches invoice (Simplified as we'd need bank entry amount)
            // For now using the bankMatched flag logic from BankValidationService
        }

        // Update Compliance Status
        if (issues.isEmpty()) {
            txn.setComplianceStatus("COMPLIANT");
        } else {
            txn.setComplianceStatus(txn.getInvoiceNumber() == null ? "NON_COMPLIANT" : "FLAGGED");
            // Create Findings
            for (String issue : issues) {
                createFinding(txn, issue);
            }
        }

        transactionRepository.save(txn);
        updateProjectCompliance(txn.getProjectId());
    }

    private boolean isOutsideTolerance(BigDecimal val1, BigDecimal val2) {
        if (val1 == null || val2 == null) return false;
        BigDecimal diff = val1.subtract(val2).abs();
        BigDecimal maxDiff = val2.multiply(TOLERANCE);
        return diff.compareTo(maxDiff) > 0;
    }

    private void createFinding(Transaction txn, String issue) {
        Finding finding = new Finding();
        finding.setTransactionId(txn.getId());
        finding.setOrganizationId(txn.getOrganizationId());
        finding.setTitle("Audit Match Failure: " + txn.getTransactionNumber());
        finding.setDescription(issue);
        finding.setSeverity("HIGH");
        finding.setStatus("OPEN");
        findingRepository.save(finding);
    }

    @Transactional
    public void updateProjectCompliance(UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        List<Transaction> txns = transactionRepository.findByProjectId(projectId);

        if (txns.isEmpty()) return;

        long total = txns.size();
        long compliant = txns.stream().filter(t -> "COMPLIANT".equals(t.getComplianceStatus())).count();
        long flagged = txns.stream().filter(t -> "FLAGGED".equals(t.getComplianceStatus())).count();

        double score = ((double) compliant / total) * 100;
        project.setComplianceScore(score);

        // Project Status Logic
        long openFindings = findingRepository.countByProjectIdAndStatus(projectId, "OPEN");
        
        if (openFindings > 0) {
            project.setAuditStatus("IN_PROGRESS");
            project.setRiskStatus("NEEDS_REVIEW");
        } else if (score > 90) {
            project.setAuditStatus("COMPLIANT");
            project.setRiskStatus("COMPLIANT");
        } else {
            project.setAuditStatus("PARTIAL");
            project.setRiskStatus("AT_RISK");
        }

        projectRepository.save(project);
    }

    public boolean isAuditComplete(UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        long openFindings = findingRepository.countByProjectIdAndStatus(projectId, "OPEN");
        // Simplified sign-off check
        return openFindings == 0 && "COMPLIANT".equals(project.getAuditStatus());
    }
}
