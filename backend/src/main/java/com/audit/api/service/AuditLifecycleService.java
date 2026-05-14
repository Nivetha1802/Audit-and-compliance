package com.audit.api.service;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuditLifecycleService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private RiskRepository riskRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private ChecklistRepository checklistRepository;
    @Autowired private SecurityUtils securityUtils;

    private static final BigDecimal TOLERANCE = new BigDecimal("0.02");

    // ── Audit Status Transitions ──────────────────────────────────────────────

    @Transactional
    public Project advanceAuditStatus(UUID projectId, String targetStatus,
                                       LocalDate auditPeriodStart, LocalDate auditPeriodEnd,
                                       LocalDate auditDeadline) {
        Project project = getProject(projectId);
        validateTransition(project.getAuditStatus(), targetStatus);
        project.setAuditStatus(targetStatus);
        if (auditPeriodStart != null) project.setAuditPeriodStart(auditPeriodStart);
        if (auditPeriodEnd   != null) project.setAuditPeriodEnd(auditPeriodEnd);
        if (auditDeadline    != null) project.setAuditDeadline(auditDeadline);
        return projectRepository.save(project);
    }

    @Transactional
    public Project signOff(UUID projectId, String notes) {
        Project project = getProject(projectId);
        User ca = securityUtils.getCurrentUser();
        if (!List.of("AUDITOR", "ADMIN").contains(ca.getRole().name())) {
            throw new RuntimeException("Only an Auditor or Admin can sign off a project.");
        }
        AuditReadinessCheck check = getReadinessCheck(projectId);
        if (check.openCriticalRisks() > 0) {
            throw new RuntimeException("Cannot sign off: " + check.openCriticalRisks() + " CRITICAL risk(s) are still open.");
        }
        project.setAuditStatus("SIGNED_OFF");
        project.setStatus("COMPLETED");
        project.setSignedOffBy(ca.getId());
        project.setSignedOffAt(LocalDateTime.now());
        project.setSignOffNotes(notes);
        project.setLocked(true);
        return projectRepository.save(project);
    }

    public AuditReadinessCheck getReadinessCheck(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        Project project = getProject(projectId);
        List<Transaction> transactions = transactionRepository.findByOrganizationIdAndProjectId(orgId, projectId);
        List<Risk> risks = riskRepository.findByOrganizationId(orgId);
        List<Checklist> checklists = checklistRepository.findByOrganizationId(orgId);

        long totalTx      = transactions.size();
        long approvedTx   = transactions.stream().filter(t -> "APPROVED".equals(t.getStatus())).count();
        long pendingTx    = transactions.stream().filter(t -> "PENDING_EVIDENCE".equals(t.getStatus())).count();
        long openRisks = risks.stream().filter(r -> !"CLOSED".equals(r.getStatus())).count();
        long criticalOpen = risks.stream().filter(r -> "CRITICAL".equals(r.getSeverity()) && !"CLOSED".equals(r.getStatus())).count();
        long completedCL  = checklists.stream().filter(Checklist::isCompleted).count();
        int readinessPct  = totalTx == 0 ? 0 : (int) Math.round((approvedTx * 100.0) / totalTx);

        return new AuditReadinessCheck(project.getAuditStatus(), totalTx, approvedTx, pendingTx,
                openRisks, criticalOpen, completedCL, checklists.size(), readinessPct, project.isLocked());
    }

    private void validateTransition(String current, String target) {
        Map<String, List<String>> allowed = Map.of(
            "DRAFT",        List.of("IN_PROGRESS"),
            "IN_PROGRESS",  List.of("UNDER_REVIEW", "DRAFT"),
            "UNDER_REVIEW", List.of("SIGNED_OFF", "IN_PROGRESS"),
            "SIGNED_OFF",   List.of("CLOSED"),
            "CLOSED",       List.of()
        );
        String cur = current != null ? current : "DRAFT";
        if (!allowed.getOrDefault(cur, List.of()).contains(target)) {
            throw new RuntimeException("Invalid audit status transition: " + cur + " → " + target);
        }
    }

    private Project getProject(UUID id) {
        return projectRepository.findById(id)
                .filter(p -> p.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public record AuditReadinessCheck(
        String auditStatus, long totalTransactions, long approvedTransactions,
        long pendingEvidenceTransactions, long openRisks, long openCriticalRisks,
        long checklistsCompleted, long checklistsTotal, int readinessPct, boolean locked
    ) {}

    // ── Transaction Compliance Validation ────────────────────────────────────

    @Transactional
    public List<String> validateTransaction(UUID transactionId) {
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

        // 3. Vendor Match
        if (txn.getVendorCustomer() != null) {
            if (txn.getPoVendor() != null && !txn.getVendorCustomer().equalsIgnoreCase(txn.getPoVendor())) {
                issues.add("Vendor mismatch: Ledger Vendor (" + txn.getVendorCustomer() + ") vs PO Vendor (" + txn.getPoVendor() + ")");
            }
            if (txn.getInvoiceVendor() != null && !txn.getVendorCustomer().equalsIgnoreCase(txn.getInvoiceVendor())) {
                issues.add("Vendor mismatch: Ledger Vendor (" + txn.getVendorCustomer() + ") vs Invoice Vendor (" + txn.getInvoiceVendor() + ")");
            }
        }

        // 4. Four-way match (Adds Bank)
        if (txn.getBankMatched() != null && txn.getBankMatched() && txn.getInvoiceAmount() != null) {
            // Check bank payment matches invoice (Simplified as we'd need bank entry amount)
        }
        
        if (txn.getBankValidationRequired() != null && txn.getBankValidationRequired()) {
            if (txn.getBankMatched() == null || !txn.getBankMatched()) {
                issues.add("Bank Validation: Invoice payment not matched in bank statements");
            }
        }

        // Update Compliance Status
        if (issues.isEmpty()) {
            txn.setComplianceStatus("COMPLIANT");
        } else {
            txn.setComplianceStatus(txn.getInvoiceNumber() == null ? "NON_COMPLIANT" : "FLAGGED");
            // Create Risks
            for (String issue : issues) {
                createRisk(txn, issue);
            }
        }

        transactionRepository.save(txn);
        updateProjectCompliance(txn.getProjectId());
        return issues;
    }

    private boolean isOutsideTolerance(BigDecimal val1, BigDecimal val2) {
        if (val1 == null || val2 == null) return false;
        BigDecimal diff = val1.subtract(val2).abs();
        BigDecimal maxDiff = val2.multiply(TOLERANCE);
        return diff.compareTo(maxDiff) > 0;
    }

    private void createRisk(Transaction txn, String issue) {
        Risk risk = new Risk();
        risk.setTransactionId(txn.getId());
        risk.setOrganizationId(txn.getOrganizationId());
        risk.setTitle("Audit Match Failure: " + txn.getTransactionNumber());
        risk.setDescription(issue);
        risk.setSeverity("HIGH");
        risk.setStatus("OPEN");
        riskRepository.save(risk);
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
        long openRisks = riskRepository.countByProjectIdAndStatus(projectId, "OPEN");
        
        if (openRisks > 0) {
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
        long openRisks = riskRepository.countByProjectIdAndStatus(projectId, "OPEN");
        // Simplified sign-off check
        return openRisks == 0 && "COMPLIANT".equals(project.getAuditStatus());
    }
}
