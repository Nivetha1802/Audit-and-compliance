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

    @GetMapping
    public List<AuditTask> getAllTasks() {
        return auditTaskService.getAllTasks();
    }

    @PutMapping("/{id}/status")
    public AuditTask updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        return auditTaskService.updateTask(id, payload.get("status"));
    }

    @GetMapping("/{id}/comments")
    public List<TaskComment> getComments(@PathVariable UUID id) {
        return auditTaskService.getComments(id);
    }

    @PostMapping("/{id}/comments")
    public TaskComment addComment(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        return auditTaskService.addComment(id, payload.get("comment"));
    }
}
