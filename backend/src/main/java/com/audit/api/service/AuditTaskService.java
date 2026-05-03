package com.audit.api.service;

import com.audit.api.entity.AuditTask;
import com.audit.api.entity.Finding;
import com.audit.api.repository.AuditTaskRepository;
import com.audit.api.repository.FindingRepository;
import com.audit.api.repository.TransactionRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class AuditTaskService {

    private final AuditTaskRepository taskRepository;
    private final FindingRepository findingRepository;
    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public AuditTaskService(AuditTaskRepository taskRepository,
                             FindingRepository findingRepository,
                             TransactionRepository transactionRepository,
                             SecurityUtils securityUtils) {
        this.taskRepository = taskRepository;
        this.findingRepository = findingRepository;
        this.transactionRepository = transactionRepository;
        this.securityUtils = securityUtils;
    }

    public List<AuditTask> getAllTasks() {
        return taskRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<AuditTask> getMyTasks() {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        UUID userId = securityUtils.getCurrentUser().getId();
        return taskRepository.findByOrganizationIdAndAssignedTo(orgId, userId);
    }

    public List<AuditTask> getTasksByTransaction(UUID transactionId) {
        return taskRepository.findByOrganizationIdAndTransactionId(
                securityUtils.getCurrentOrganizationId(), transactionId);
    }

    @Transactional
    public AuditTask createTask(AuditTask task) {
        task.setOrganizationId(securityUtils.getCurrentOrganizationId());
        if (task.getStatus() == null) task.setStatus("OPEN");
        if (task.getPriority() == null) task.setPriority("MEDIUM");
        return taskRepository.save(task);
    }

    @Transactional
    public AuditTask updateTask(UUID id, AuditTask updates) {
        AuditTask task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        if (!task.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
            throw new RuntimeException("Unauthorized");

        if (updates.getTitle() != null)       task.setTitle(updates.getTitle());
        if (updates.getDescription() != null) task.setDescription(updates.getDescription());
        if (updates.getStatus() != null)      task.setStatus(updates.getStatus());
        if (updates.getPriority() != null)    task.setPriority(updates.getPriority());
        if (updates.getAssignedTo() != null)  task.setAssignedTo(updates.getAssignedTo());
        if (updates.getDueDate() != null)     task.setDueDate(updates.getDueDate());
        return taskRepository.save(task);
    }

    public void deleteTask(UUID id) {
        taskRepository.deleteById(id);
    }

    /**
     * Auto-generate tasks for a finding:
     * - RESUBMIT_EVIDENCE task assigned to the transaction owner
     * - AUDIT_REVIEW task assigned to the CA (auditor)
     */
    @Transactional
    public List<AuditTask> generateTasksForFinding(UUID findingId, UUID assigneeId, UUID auditorId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new RuntimeException("Finding not found"));

        AuditTask resubmit = new AuditTask();
        resubmit.setOrganizationId(orgId);
        resubmit.setFindingId(findingId);
        resubmit.setTransactionId(finding.getTransactionId());
        resubmit.setTitle("Resubmit evidence for: " + finding.getTitle());
        resubmit.setDescription("Finding raised: " + finding.getDescription()
                + "\nPlease resubmit corrected evidence.");
        resubmit.setTaskType("RESUBMIT_EVIDENCE");
        resubmit.setPriority(finding.getSeverity());
        resubmit.setStatus("OPEN");
        resubmit.setAssignedTo(assigneeId);
        resubmit.setDueDate(LocalDate.now().plusDays(7));

        AuditTask review = new AuditTask();
        review.setOrganizationId(orgId);
        review.setFindingId(findingId);
        review.setTransactionId(finding.getTransactionId());
        review.setTitle("CA Review: " + finding.getTitle());
        review.setDescription("Review resubmitted evidence after remediation.");
        review.setTaskType("AUDIT_REVIEW");
        review.setPriority(finding.getSeverity());
        review.setStatus("OPEN");
        review.setAssignedTo(auditorId);
        review.setDueDate(LocalDate.now().plusDays(14));

        return taskRepository.saveAll(List.of(resubmit, review));
    }
}
