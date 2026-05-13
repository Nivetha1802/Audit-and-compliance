package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "findings")
public class Risk extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;
    private String description;
    private String severity; // LOW, MEDIUM, HIGH
    private String status; // OPEN, CLOSED
    
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "risk_creator_id")
    private UUID riskCreatorId;

    @Column(name = "transaction_id")
    private UUID transactionId;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    
    public UUID getRiskCreatorId() { return riskCreatorId; }
    public void setRiskCreatorId(UUID riskCreatorId) { this.riskCreatorId = riskCreatorId; }

    public UUID getTransactionId() { return transactionId; }
    public void setTransactionId(UUID transactionId) { this.transactionId = transactionId; }
}
