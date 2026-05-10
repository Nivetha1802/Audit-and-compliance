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
    @Autowired private FindingRepository findingRepository;
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
        if (check.openCriticalFindings() > 0) {
            throw new RuntimeException("Cannot sign off: " + check.openCriticalFindings() + " CRITICAL finding(s) are still open.");
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
        List<Finding> findings = findingRepository.findByOrganizationId(orgId);
        List<Checklist> checklists = checklistRepository.findByOrganizationId(orgId);

        long totalTx      = transactions.size();
        long approvedTx   = transactions.stream().filter(t -> "APPROVED".equals(t.getStatus())).count();
        long pendingTx    = transactions.stream().filter(t -> "PENDING_EVIDENCE".equals(t.getStatus())).count();
        long openFindings = findings.stream().filter(f -> !"CLOSED".equals(f.getStatus())).count();
        long criticalOpen = findings.stream().filter(f -> "CRITICAL".equals(f.getSeverity()) && !"CLOSED".equals(f.getStatus())).count();
        long completedCL  = checklists.stream().filter(Checklist::isCompleted).count();
        int readinessPct  = totalTx == 0 ? 0 : (int) Math.round((approvedTx * 100.0) / totalTx);

        return new AuditReadinessCheck(project.getAuditStatus(), totalTx, approvedTx, pendingTx,
                openFindings, criticalOpen, completedCL, checklists.size(), readinessPct, project.isLocked());
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
        long pendingEvidenceTransactions, long openFindings, long openCriticalFindings,
        long checklistsCompleted, long checklistsTotal, int readinessPct, boolean locked
    ) {}

    // ── Transaction Compliance Validation ────────────────────────────────────

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
