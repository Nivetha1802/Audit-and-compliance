package com.audit.api.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "projects", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"project_code", "organization_id"})
})
public class Project extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "project_code")
    private String projectCode;

    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "total_budget")
    private Double totalBudget;

    private String categories; // Comma-separated: Revenue, Expense, WIP

    @Column(name = "project_owner_id")
    private UUID projectOwnerId;

    @Column(name = "auditor_id")
    private UUID auditorId;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, IN_AUDIT, UNDER_REVIEW, SIGNED_OFF, CLOSED, SUSPENDED

    // ── Audit Lifecycle ──────────────────────────────────────────────────────
    @Column(name = "audit_status")
    private String auditStatus = "DRAFT"; // DRAFT, IN_PROGRESS, UNDER_REVIEW, SIGNED_OFF, CLOSED

    @Column(name = "audit_period_start")
    private LocalDate auditPeriodStart;

    @Column(name = "audit_period_end")
    private LocalDate auditPeriodEnd;

    @Column(name = "audit_deadline")
    private LocalDate auditDeadline;

    @Column(name = "signed_off_by")
    private UUID signedOffBy;

    private java.time.LocalDateTime signedOffAt;

    @Column(name = "sign_off_notes", columnDefinition = "TEXT")
    private String signOffNotes;

    @Column(name = "is_locked")
    private boolean locked = false;

    private Double complianceScore = 0.0;
    private String riskStatus;

    public Project() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getProjectCode() { return projectCode; }
    public void setProjectCode(String projectCode) { this.projectCode = projectCode; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public Double getTotalBudget() { return totalBudget; }
    public void setTotalBudget(Double totalBudget) { this.totalBudget = totalBudget; }
    public String getCategories() { return categories; }
    public void setCategories(String categories) { this.categories = categories; }
    public UUID getProjectOwnerId() { return projectOwnerId; }
    public void setProjectOwnerId(UUID projectOwnerId) { this.projectOwnerId = projectOwnerId; }
    public UUID getAuditorId() { return auditorId; }
    public void setAuditorId(UUID auditorId) { this.auditorId = auditorId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAuditStatus() { return auditStatus; }
    public void setAuditStatus(String auditStatus) { this.auditStatus = auditStatus; }
    public LocalDate getAuditPeriodStart() { return auditPeriodStart; }
    public Double getComplianceScore() { return complianceScore; }
    public void setComplianceScore(Double complianceScore) { this.complianceScore = complianceScore; }
    public String getRiskStatus() { return riskStatus; }
    public void setRiskStatus(String riskStatus) { this.riskStatus = riskStatus; }

    public void setAuditPeriodStart(LocalDate auditPeriodStart) { this.auditPeriodStart = auditPeriodStart; }
    public LocalDate getAuditPeriodEnd() { return auditPeriodEnd; }
    public void setAuditPeriodEnd(LocalDate auditPeriodEnd) { this.auditPeriodEnd = auditPeriodEnd; }
    public LocalDate getAuditDeadline() { return auditDeadline; }
    public void setAuditDeadline(LocalDate auditDeadline) { this.auditDeadline = auditDeadline; }
    public UUID getSignedOffBy() { return signedOffBy; }
    public void setSignedOffBy(UUID signedOffBy) { this.signedOffBy = signedOffBy; }
    public java.time.LocalDateTime getSignedOffAt() { return signedOffAt; }
    public void setSignedOffAt(java.time.LocalDateTime signedOffAt) { this.signedOffAt = signedOffAt; }
    public String getSignOffNotes() { return signOffNotes; }
    public void setSignOffNotes(String signOffNotes) { this.signOffNotes = signOffNotes; }
    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }
}
