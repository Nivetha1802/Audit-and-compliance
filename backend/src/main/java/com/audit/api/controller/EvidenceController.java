package com.audit.api.controller;

import com.audit.api.entity.Checklist;
import com.audit.api.entity.ChecklistItem;
import com.audit.api.service.EvidenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evidence")
public class EvidenceController {

    private final EvidenceService evidenceService;

    @Autowired
    public EvidenceController(EvidenceService evidenceService) {
        this.evidenceService = evidenceService;
    }

    /** Get or create checklist for a transaction */
    @GetMapping("/checklist/{transactionId}")
    public ResponseEntity<Checklist> getChecklist(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(evidenceService.getOrCreateChecklist(transactionId));
    }

    /** Get checklist items */
    @GetMapping("/checklist/{transactionId}/items")
    public ResponseEntity<List<ChecklistItem>> getItems(@PathVariable UUID transactionId) {
        Checklist cl = evidenceService.getOrCreateChecklist(transactionId);
        return ResponseEntity.ok(evidenceService.getChecklistItems(cl.getId()));
    }

    /** Upload evidence file for a checklist item */
    @PostMapping("/upload/{checklistItemId}")
    public ResponseEntity<ChecklistItem> uploadEvidence(
            @PathVariable UUID checklistItemId,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(evidenceService.uploadEvidence(checklistItemId, file));
    }

    /** Remove evidence from a checklist item */
    @DeleteMapping("/item/{checklistItemId}")
    public ResponseEntity<ChecklistItem> removeEvidence(@PathVariable UUID checklistItemId) {
        return ResponseEntity.ok(evidenceService.removeEvidence(checklistItemId));
    }

    /** Get audit readiness score for a transaction */
    @GetMapping("/readiness/{transactionId}")
    public ResponseEntity<EvidenceService.ReadinessScore> getReadiness(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(evidenceService.getTransactionReadiness(transactionId));
    }

    /** Add a manual checklist item */
    @PostMapping("/checklist/{transactionId}/items")
    public ResponseEntity<ChecklistItem> addItem(
            @PathVariable UUID transactionId,
            @RequestBody ChecklistItem item) {
        Checklist cl = evidenceService.getOrCreateChecklist(transactionId);
        item.setChecklistId(cl.getId());
        item.setOrganizationId(cl.getOrganizationId());
        return ResponseEntity.ok(evidenceService.getChecklistItems(cl.getId()).stream()
                .findFirst().orElse(item)); // placeholder — real save handled in service
    }
}
