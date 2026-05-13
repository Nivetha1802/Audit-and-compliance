package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;
import java.time.LocalDate;

@Entity
@Table(name = "audit_tasks")
public class AuditTask extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;
    private String description;
    private String status; // PENDING, IN_PROGRESS, COMPLETED
    private String priority; // LOW, MEDIUM, HIGH
    
    @Column(name = "assigned_to")
    private UUID assignedTo;
    
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "risk_id")
    private UUID riskId;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public UUID getAssignedTo() { return assignedTo; }
    public void setAssignedTo(UUID assignedTo) { this.assignedTo = assignedTo; }

    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }

    public UUID getRiskId() { return riskId; }
    public void setRiskId(UUID riskId) { this.riskId = riskId; }

    public UUID getTransactionId() { return transactionId; }
    public void setTransactionId(UUID transactionId) { this.transactionId = transactionId; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    
    public static class AuditTaskBuilder {
        private String title;
        private String description;
        private String status;
        private String priority;
        private UUID assignedTo;
        private UUID projectId;
        private UUID riskId;
        private UUID transactionId;
        private LocalDate dueDate;
        private UUID organizationId;
        
        public AuditTaskBuilder title(String title) { this.title = title; return this; }
        public AuditTaskBuilder description(String description) { this.description = description; return this; }
        public AuditTaskBuilder status(String status) { this.status = status; return this; }
        public AuditTaskBuilder priority(String priority) { this.priority = priority; return this; }
        public AuditTaskBuilder assignedTo(UUID assignedTo) { this.assignedTo = assignedTo; return this; }
        public AuditTaskBuilder projectId(UUID projectId) { this.projectId = projectId; return this; }
        public AuditTaskBuilder riskId(UUID riskId) { this.riskId = riskId; return this; }
        public AuditTaskBuilder transactionId(UUID transactionId) { this.transactionId = transactionId; return this; }
        public AuditTaskBuilder dueDate(LocalDate dueDate) { this.dueDate = dueDate; return this; }
        public AuditTaskBuilder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        
        public AuditTask build() {
            AuditTask at = new AuditTask();
            at.setTitle(title);
            at.setDescription(description);
            at.setStatus(status);
            at.setPriority(priority);
            at.setAssignedTo(assignedTo);
            at.setProjectId(projectId);
            at.setRiskId(riskId);
            at.setTransactionId(transactionId);
            at.setDueDate(dueDate);
            at.setOrganizationId(organizationId);
            return at;
        }
    }
    
    public static AuditTaskBuilder builder() {
        return new AuditTaskBuilder();
    }
}
