package com.audit.api.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "project_code", unique = true)
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
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, SUSPENDED

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
}
