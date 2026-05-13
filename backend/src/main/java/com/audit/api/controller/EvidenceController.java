package com.audit.api.controller;

import com.audit.api.dto.ChecklistItemResponse;
import com.audit.api.entity.Checklist;
import com.audit.api.entity.ChecklistItem;
import com.audit.api.service.EvidenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evidence")
@CrossOrigin(origins = "*")
public class EvidenceController {

    private final EvidenceService evidenceService;

    public EvidenceController(EvidenceService evidenceService) {
        this.evidenceService = evidenceService;
    }

    @GetMapping("/checklist/{transactionId}")
    public ResponseEntity<List<ChecklistItemResponse>> getChecklistItems(@PathVariable UUID transactionId) {
        Checklist cl = evidenceService.getOrCreateChecklist(transactionId);
        return ResponseEntity.ok(evidenceService.getChecklistItemsWithDocNames(cl.getId()));
    }

    @PostMapping("/upload")
    public ResponseEntity<ChecklistItem> uploadEvidence(
            @RequestParam("file") MultipartFile file,
            @RequestParam("checklistItemId") UUID checklistItemId) throws Exception {
        return ResponseEntity.ok(evidenceService.uploadEvidence(checklistItemId, file));
    }

    /** Upload evidence file for a transaction (convenience for bank statements) */
    @PostMapping("/upload-by-transaction/{transactionId}")
    public ResponseEntity<ChecklistItem> uploadByTransaction(
            @PathVariable UUID transactionId,
            @RequestParam("file") MultipartFile file) throws Exception {
        Checklist cl = evidenceService.getOrCreateChecklist(transactionId);
        List<ChecklistItemResponse> items = evidenceService.getChecklistItemsWithDocNames(cl.getId());
        
        UUID targetItemId;
        if (items.isEmpty()) {
            // Create a default item if none exist from template
            ChecklistItem newItem = new ChecklistItem();
            newItem.setChecklistId(cl.getId());
            newItem.setDescription("Bank Statement / Supporting Document");
            newItem.setMandatory(true);
            newItem.setProvided(false);
            newItem.setOrganizationId(cl.getOrganizationId());
            targetItemId = evidenceService.addItem(transactionId, newItem).getId();
        } else {
            targetItemId = items.get(0).getId();
        }

        return ResponseEntity.ok(evidenceService.uploadEvidence(targetItemId, file));
    }

    @DeleteMapping("/checklist/{checklistItemId}")
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
        return ResponseEntity.ok(evidenceService.addItem(transactionId, item));
    }
}
