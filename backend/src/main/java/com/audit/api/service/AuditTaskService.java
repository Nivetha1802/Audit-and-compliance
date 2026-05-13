package com.audit.api.service;

import com.audit.api.entity.AuditTask;
import com.audit.api.entity.Risk;
import com.audit.api.entity.User;
import com.audit.api.entity.TaskComment;
import com.audit.api.repository.AuditTaskRepository;
import com.audit.api.repository.RiskRepository;
import com.audit.api.repository.UserRepository;
import com.audit.api.repository.TaskCommentRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuditTaskService {

    private final AuditTaskRepository auditTaskRepository;
    private final RiskRepository riskRepository;
    private final UserRepository userRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final SecurityUtils securityUtils;
    private final EmailService emailService;

    public AuditTaskService(
            AuditTaskRepository auditTaskRepository,
            RiskRepository riskRepository,
            UserRepository userRepository,
            TaskCommentRepository taskCommentRepository,
            SecurityUtils securityUtils,
            EmailService emailService) {
        this.auditTaskRepository = auditTaskRepository;
        this.riskRepository = riskRepository;
        this.userRepository = userRepository;
        this.taskCommentRepository = taskCommentRepository;
        this.securityUtils = securityUtils;
        this.emailService = emailService;
    }

    public List<AuditTask> getAllTasks() {
        return auditTaskRepository.findAll();
    }

    public AuditTask createTask(String title, String description, UUID assignedTo, UUID projectId, UUID riskId) {
        User user = securityUtils.getCurrentUser();
        AuditTask task = AuditTask.builder()
                .title(title)
                .description(description)
                .assignedTo(assignedTo)
                .projectId(projectId)
                .riskId(riskId)
                .status("PENDING")
                .priority("MEDIUM")
                .organizationId(user != null ? user.getOrganizationId() : null)
                .build();
        return auditTaskRepository.save(task);
    }

    @Transactional
    public AuditTask updateTask(UUID id, String status) {
        AuditTask task = auditTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        User currentUser = securityUtils.getCurrentUser();
        
        // Strict permission check
        if (!currentUser.getId().equals(task.getAssignedTo())) {
            throw new RuntimeException("Only the assigned user can modify this task's status.");
        }

        String oldStatus = task.getStatus();
        if (status.equals(oldStatus)) return task;

        task.setStatus(status);
        AuditTask savedTask = auditTaskRepository.save(task);

        System.out.println("DEBUG: Task " + id + " status updated from " + oldStatus + " to " + status);

        // Notify risk creator about status change
        notifyRiskCreator(savedTask, "Status Update: " + status, 
            String.format("The status of the task '%s' has been changed from %s to %s.", 
            task.getTitle(), oldStatus, status));

        if ("COMPLETED".equals(status) && !"COMPLETED".equals(oldStatus)) {
            if (task.getRiskId() != null) {
                riskRepository.findById(task.getRiskId()).ifPresent(risk -> {
                    risk.setStatus("CLOSED");
                    riskRepository.save(risk);
                    System.out.println("DEBUG: Associated risk " + risk.getId() + " marked as CLOSED");
                });
            }
        }

        return savedTask;
    }

    private void notifyRiskCreator(AuditTask task, String actionLabel, String detailMessage) {
        if (task.getRiskId() == null) {
            System.out.println("DEBUG: Task has no riskId, skipping notification");
            return;
        }

        riskRepository.findById(task.getRiskId()).ifPresent(risk -> {
            if (risk.getRiskCreatorId() != null) {
                userRepository.findById(risk.getRiskCreatorId()).ifPresent(creator -> {
                    String subject = "Audit Alert: " + risk.getTitle() + " [" + actionLabel + "]";
                    String body = String.format(
                        "Hello %s,\n\nThere has been an update on a task associated with a risk you raised.\n\n" +
                        "--- ACTION ---\n" +
                        "%s\n\n" +
                        "--- RISK DETAILS ---\n" +
                        "Title: %s\n" +
                        "Current Status: %s\n\n" +
                        "--- TASK DETAILS ---\n" +
                        "Task: %s\n" +
                        "Current Status: %s\n" +
                        "Updated By: %s\n\n" +
                        "You are receiving this because you are the creator of this risk.",
                        creator.getFullName(),
                        detailMessage,
                        risk.getTitle(),
                        risk.getStatus(),
                        task.getTitle(),
                        task.getStatus(),
                        securityUtils.getCurrentUser().getFullName()
                    );
                    
                    System.out.println("DEBUG: Sending email to risk creator: " + creator.getEmail());
                    emailService.sendEmail(creator.getEmail(), subject, body);
                });
            } else {
                System.out.println("DEBUG: Risk has no creatorId, skipping email");
            }
        });
    }

    public List<TaskComment> getComments(UUID taskId) {
        return taskCommentRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
    }

    @Transactional
    public TaskComment addComment(UUID taskId, String commentText) {
        User user = securityUtils.getCurrentUser();
        System.out.println("DEBUG: Adding comment to task " + taskId + " by " + user.getFullName());

        TaskComment comment = TaskComment.builder()
                .taskId(taskId)
                .userId(user.getId())
                .userName(user.getFullName())
                .comment(commentText)
                .createdAt(LocalDateTime.now())
                .organizationId(user.getOrganizationId())
                .build();
        TaskComment savedComment = taskCommentRepository.save(comment);

        // Notify risk creator about new comment
        auditTaskRepository.findById(taskId).ifPresent(task -> {
            notifyRiskCreator(task, "New Comment Added", 
                String.format("%s added a comment: \"%s\"", user.getFullName(), commentText));
        });

        return savedComment;
    }
}
