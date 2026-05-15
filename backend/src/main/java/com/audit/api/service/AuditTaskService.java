package com.audit.api.service;

import com.audit.api.entity.AuditTask;
import com.audit.api.entity.TaskComment;
import com.audit.api.entity.User;
import com.audit.api.entity.AuditActionLog;
import com.audit.api.repository.AuditTaskRepository;
import com.audit.api.repository.TaskCommentRepository;
import com.audit.api.repository.RiskRepository;
import com.audit.api.repository.ProjectRepository;
import com.audit.api.repository.UserRepository;
import com.audit.api.repository.AuditActionLogRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.HashSet;
import java.util.Set;

@Service
public class AuditTaskService {
    private final AuditTaskRepository auditTaskRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final RiskRepository riskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AuditActionLogRepository auditActionLogRepository;
    private final SecurityUtils securityUtils;

    public AuditTaskService(AuditTaskRepository auditTaskRepository,
                            TaskCommentRepository taskCommentRepository,
                            RiskRepository riskRepository,
                            ProjectRepository projectRepository,
                            UserRepository userRepository,
                            EmailService emailService,
                            AuditActionLogRepository auditActionLogRepository,
                            SecurityUtils securityUtils) {
        this.auditTaskRepository = auditTaskRepository;
        this.taskCommentRepository = taskCommentRepository;
        this.riskRepository = riskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.auditActionLogRepository = auditActionLogRepository;
        this.securityUtils = securityUtils;
    }

    public List<AuditTask> getAllTasks() {
        return auditTaskRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<AuditTask> getTasksByProject(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        return auditTaskRepository.findByProjectId(projectId).stream()
                .filter(t -> orgId.equals(t.getOrganizationId()))
                .toList();
    }

    @Transactional
    public AuditTask createTask(String title, String description, UUID assignedTo, UUID projectId, UUID riskId, UUID transactionId) {
        AuditTask task = new AuditTask();
        task.setTitle(title);
        task.setDescription(description);
        task.setAssignedTo(assignedTo);
        task.setProjectId(projectId);
        task.setRiskId(riskId);
        task.setTransactionId(transactionId);
        task.setStatus("OPEN");
        task.setPriority("MEDIUM");
        task.setOrganizationId(securityUtils.getCurrentOrganizationId());
        return auditTaskRepository.save(task);
    }

    @Transactional
    public AuditTask updateStatus(UUID taskId, String status, UUID userId) {
        AuditTask task = auditTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        
        if (userId == null) {
            userId = securityUtils.getCurrentUser().getId();
        }

        String oldStatus = task.getStatus();
        task.setStatus(status);
        AuditTask updatedTask = auditTaskRepository.save(task);

        // Update associated risk if all tasks are closed/completed
        if ("COMPLETED".equals(status) || "CLOSED".equals(status)) {
            updateRiskStatusIfAllTasksClosed(task.getRiskId(), userId);
        }

        // Log action
        auditActionLogRepository.save(AuditActionLog.builder()
                .entityType("TASK")
                .entityId(taskId)
                .actionType("STATUS_CHANGE")
                .performedBy(userId)
                .details("Status changed from " + oldStatus + " to " + status)
                .projectId(task.getProjectId())
                .build());

        notifyTaskStakeholders(updatedTask, "Status Updated: " + status);
        return updatedTask;
    }

    @Transactional
    public TaskComment addComment(UUID taskId, String content, UUID userId) {
        AuditTask task = auditTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (userId == null) {
            userId = securityUtils.getCurrentUser().getId();
        }

        TaskComment comment = new TaskComment();
        comment.setTaskId(taskId);
        comment.setUserId(userId);
        comment.setComment(content);
        comment.setOrganizationId(securityUtils.getCurrentOrganizationId());
        
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            comment.setUserName(user.getFullName());
        }

        TaskComment savedComment = taskCommentRepository.save(comment);

        // Log action
        auditActionLogRepository.save(AuditActionLog.builder()
                .entityType("TASK")
                .entityId(taskId)
                .actionType("COMMENT_ADDED")
                .performedBy(userId)
                .details("Comment added: " + (content.length() > 50 ? content.substring(0, 47) + "..." : content))
                .projectId(task.getProjectId())
                .build());

        notifyTaskStakeholders(task, "New Comment added");
        return savedComment;
    }

    private void notifyTaskStakeholders(AuditTask task, String action) {
        Set<String> recipients = new HashSet<>();
        
        // 1. Task Assignee
        if (task.getAssignedTo() != null) {
            userRepository.findById(task.getAssignedTo())
                .ifPresent(u -> { if (u.getEmail() != null) recipients.add(u.getEmail()); });
        }

        // 2. Risk Creator (if associated)
        if (task.getRiskId() != null) {
            riskRepository.findById(task.getRiskId()).ifPresent(risk -> {
                if (risk.getRiskCreatorId() != null) {
                    userRepository.findById(risk.getRiskCreatorId())
                        .ifPresent(u -> { if (u.getEmail() != null) recipients.add(u.getEmail()); });
                }
            });
        }

        // 3. Project Owner
        if (task.getProjectId() != null) {
            projectRepository.findById(task.getProjectId()).ifPresent(project -> {
                if (project.getProjectOwnerId() != null) {
                    userRepository.findById(project.getProjectOwnerId())
                        .ifPresent(u -> { if (u.getEmail() != null) recipients.add(u.getEmail()); });
                }
            });
        }

        String subject = "Audit Task Notification: " + task.getTitle();
        String message = "The following action occurred on task '" + task.getTitle() + "': " + action;
        
        for (String email : recipients) {
            emailService.sendEmail(email, subject, message);
        }
    }

    private void updateRiskStatusIfAllTasksClosed(UUID riskId, UUID userId) {
        if (riskId == null) return;

        List<AuditTask> tasks = auditTaskRepository.findByRiskId(riskId);
        boolean allClosed = tasks.stream()
                .allMatch(t -> "COMPLETED".equals(t.getStatus()) || "CLOSED".equals(t.getStatus()));

        if (allClosed) {
            riskRepository.findById(riskId).ifPresent(risk -> {
                if (!"RESOLVED".equals(risk.getStatus())) {
                    String oldStatus = risk.getStatus();
                    risk.setStatus("RESOLVED");
                    riskRepository.save(risk);

                    // Log action
                    auditActionLogRepository.save(AuditActionLog.builder()
                            .entityType("RISK")
                            .entityId(riskId)
                            .actionType("STATUS_CHANGE")
                            .performedBy(userId)
                            .details("Risk automatically moved to RESOLVED because all associated tasks are closed (previously: " + oldStatus + ")")
                            .projectId(risk.getProjectId())
                            .build());
                }
            });
        }
    }

    public List<TaskComment> getComments(UUID taskId) {
        return taskCommentRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
    }

    @Transactional
    public void deleteTasksByRiskId(UUID riskId) {
        List<AuditTask> tasks = auditTaskRepository.findByRiskId(riskId);
        for (AuditTask task : tasks) {
            taskCommentRepository.deleteByTaskIdIn(List.of(task.getId()));
        }
        auditTaskRepository.deleteByRiskId(riskId);
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        taskCommentRepository.deleteByTaskIdIn(List.of(taskId));
        auditTaskRepository.deleteById(taskId);
    }

    @Transactional
    public int deleteTestTasks() {
        List<AuditTask> testTasks = auditTaskRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase("test", "test");
        if (testTasks.isEmpty()) return 0;
        
        List<UUID> taskIds = testTasks.stream().map(AuditTask::getId).toList();
        taskCommentRepository.deleteByTaskIdIn(taskIds);
        auditTaskRepository.deleteAllById(taskIds);
        return testTasks.size();
    }
}
