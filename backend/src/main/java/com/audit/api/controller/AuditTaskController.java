package com.audit.api.controller;

import com.audit.api.entity.AuditTask;
import com.audit.api.entity.TaskComment;
import com.audit.api.service.AuditTaskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
@CrossOrigin(origins = "*")
public class AuditTaskController {

    private final AuditTaskService auditTaskService;

    public AuditTaskController(AuditTaskService auditTaskService) {
        this.auditTaskService = auditTaskService;
    }

    @PostMapping
    public AuditTask createTask(@RequestBody Map<String, Object> payload) {
        String title = (String) payload.get("title");
        String description = (String) payload.get("description");
        
        String assignedToStr = (String) payload.get("assignedTo");
        UUID assignedTo = (assignedToStr != null && !assignedToStr.trim().isEmpty()) ? UUID.fromString(assignedToStr) : null;
        
        String projectIdStr = (String) payload.get("projectId");
        UUID projectId = (projectIdStr != null && !projectIdStr.trim().isEmpty()) ? UUID.fromString(projectIdStr) : null;
        
        String riskIdStr = (String) payload.get("riskId");
        UUID riskId = (riskIdStr != null && !riskIdStr.trim().isEmpty()) ? UUID.fromString(riskIdStr) : null;

        String transactionIdStr = (String) payload.get("transactionId");
        UUID transactionId = (transactionIdStr != null && !transactionIdStr.trim().isEmpty()) ? UUID.fromString(transactionIdStr) : null;
        
        return auditTaskService.createTask(title, description, assignedTo, projectId, riskId, transactionId);
    }

    @GetMapping
    public List<AuditTask> getAllTasks() {
        return auditTaskService.getAllTasks();
    }

    @PutMapping("/{id}/status")
    public AuditTask updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String userIdStr = payload.get("userId");
        UUID userId = (userIdStr != null) ? UUID.fromString(userIdStr) : null;
        return auditTaskService.updateStatus(id, payload.get("status"), userId);
    }

    @GetMapping("/{id}/comments")
    public List<TaskComment> getComments(@PathVariable UUID id) {
        return auditTaskService.getComments(id);
    }

    @PostMapping("/{id}/comments")
    public TaskComment addComment(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String userIdStr = payload.get("userId");
        UUID userId = (userIdStr != null) ? UUID.fromString(userIdStr) : null;
        return auditTaskService.addComment(id, payload.get("comment"), userId);
    }
}
