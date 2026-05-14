package com.audit.api.controller;

import com.audit.api.service.AuditAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-analysis")
public class AuditAnalysisController {

    private final AuditAnalysisService auditAnalysisService;

    public AuditAnalysisController(AuditAnalysisService auditAnalysisService) {
        this.auditAnalysisService = auditAnalysisService;
    }

    @GetMapping("/feedback/{projectId}")
    public ResponseEntity<?> getWorkflowFeedback(@PathVariable UUID projectId) {
        String feedback = auditAnalysisService.getAuditWorkflowFeedback(projectId);
        return ResponseEntity.ok(Map.of("feedback", feedback));
    }
}
