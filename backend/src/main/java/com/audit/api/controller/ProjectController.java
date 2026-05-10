package com.audit.api.controller;

import com.audit.api.entity.Project;
import com.audit.api.service.AuditLifecycleService;
import com.audit.api.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final AuditLifecycleService auditLifecycleService;

    @Autowired
    public ProjectController(ProjectService projectService, AuditLifecycleService auditLifecycleService) {
        this.projectService = projectService;
        this.auditLifecycleService = auditLifecycleService;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        return ResponseEntity.ok(projectService.createProject(project));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable UUID id, @RequestBody Project project) {
        return ResponseEntity.ok(projectService.updateProject(id, project));
    }

    /** Advance audit status: DRAFT → IN_PROGRESS → UNDER_REVIEW → SIGNED_OFF */
    @PostMapping("/{id}/advance-audit")
    public ResponseEntity<Project> advanceAudit(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String targetStatus = body.get("targetStatus");
        LocalDate periodStart = body.get("auditPeriodStart") != null ? LocalDate.parse(body.get("auditPeriodStart")) : null;
        LocalDate periodEnd   = body.get("auditPeriodEnd")   != null ? LocalDate.parse(body.get("auditPeriodEnd"))   : null;
        LocalDate deadline    = body.get("auditDeadline")    != null ? LocalDate.parse(body.get("auditDeadline"))    : null;
        return ResponseEntity.ok(auditLifecycleService.advanceAuditStatus(id, targetStatus, periodStart, periodEnd, deadline));
    }

    /** CA formal sign-off */
    @PostMapping("/{id}/sign-off")
    public ResponseEntity<Project> signOff(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(auditLifecycleService.signOff(id, body.getOrDefault("notes", "")));
    }

    /** Audit readiness check before sign-off */
    @GetMapping("/{id}/readiness")
    public ResponseEntity<AuditLifecycleService.AuditReadinessCheck> getReadiness(@PathVariable UUID id) {
        return ResponseEntity.ok(auditLifecycleService.getReadinessCheck(id));
    }
}
