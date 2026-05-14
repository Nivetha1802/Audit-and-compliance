package com.audit.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_action_logs")
public class AuditActionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private UUID projectId;
    private UUID entityId; // Risk ID or Task ID
    private String entityType; // "RISK" or "TASK"
    private String actionType; // "STATUS_CHANGE", "COMMENT", "ASSIGNMENT", "CREATION"
    private String oldStatus;
    private String newStatus;
    private UUID performedBy;
    
    @Column(columnDefinition = "TEXT")
    private String details;
    
    private LocalDateTime createdAt;

    public AuditActionLog() {
        this.createdAt = LocalDateTime.now();
    }

    public static AuditActionLogBuilder builder() {
        return new AuditActionLogBuilder();
    }

    // Standard Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public UUID getEntityId() { return entityId; }
    public void setEntityId(UUID entityId) { this.entityId = entityId; }
    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public String getOldStatus() { return oldStatus; }
    public void setOldStatus(String oldStatus) { this.oldStatus = oldStatus; }
    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }
    public UUID getPerformedBy() { return performedBy; }
    public void setPerformedBy(UUID performedBy) { this.performedBy = performedBy; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public static class AuditActionLogBuilder {
        private AuditActionLog log = new AuditActionLog();

        public AuditActionLogBuilder projectId(UUID projectId) { log.setProjectId(projectId); return this; }
        public AuditActionLogBuilder entityId(UUID entityId) { log.setEntityId(entityId); return this; }
        public AuditActionLogBuilder entityType(String entityType) { log.setEntityType(entityType); return this; }
        public AuditActionLogBuilder actionType(String actionType) { log.setActionType(actionType); return this; }
        public AuditActionLogBuilder oldStatus(String oldStatus) { log.setOldStatus(oldStatus); return this; }
        public AuditActionLogBuilder newStatus(String newStatus) { log.setNewStatus(newStatus); return this; }
        public AuditActionLogBuilder performedBy(UUID performedBy) { log.setPerformedBy(performedBy); return this; }
        public AuditActionLogBuilder details(String details) { log.setDetails(details); return this; }
        public AuditActionLog build() { return log; }
    }
}
