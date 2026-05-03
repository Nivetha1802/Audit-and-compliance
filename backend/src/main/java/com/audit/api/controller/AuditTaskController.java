package com.audit.api.controller;

import com.audit.api.entity.AuditTask;
import com.audit.api.service.AuditTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
public class AuditTaskController {

    private final AuditTaskService taskService;

    @Autowired
    public AuditTaskController(AuditTaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<AuditTask>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @GetMapping("/my")
    public ResponseEntity<List<AuditTask>> getMyTasks() {
        return ResponseEntity.ok(taskService.getMyTasks());
    }

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<List<AuditTask>> getByTransaction(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(taskService.getTasksByTransaction(transactionId));
    }

    @PostMapping
    public ResponseEntity<AuditTask> createTask(@RequestBody AuditTask task) {
        return ResponseEntity.ok(taskService.createTask(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AuditTask> updateTask(@PathVariable UUID id, @RequestBody AuditTask task) {
        return ResponseEntity.ok(taskService.updateTask(id, task));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AuditTask> updateStatus(@PathVariable UUID id, @RequestParam String status) {
        AuditTask update = new AuditTask();
        update.setStatus(status);
        return ResponseEntity.ok(taskService.updateTask(id, update));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/generate/{findingId}")
    public ResponseEntity<List<AuditTask>> generateForFinding(
            @PathVariable UUID findingId,
            @RequestParam UUID assigneeId,
            @RequestParam UUID auditorId) {
        return ResponseEntity.ok(taskService.generateTasksForFinding(findingId, assigneeId, auditorId));
    }
}
