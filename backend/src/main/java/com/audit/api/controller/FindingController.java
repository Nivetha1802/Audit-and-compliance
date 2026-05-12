package com.audit.api.controller;

import com.audit.api.entity.Finding;
import com.audit.api.service.FindingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/findings")
public class FindingController {

    private final FindingService findingService;

    @Autowired
    public FindingController(FindingService findingService) {
        this.findingService = findingService;
    }

    @GetMapping
    public ResponseEntity<List<Finding>> getAll() {
        return ResponseEntity.ok(findingService.getAllFindings());
    }

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<List<Finding>> getByTransaction(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(findingService.getFindingsByTransaction(transactionId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR')")
    public ResponseEntity<Finding> create(@RequestBody Finding finding) {
        return ResponseEntity.ok(findingService.createFinding(finding));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR')")
    public ResponseEntity<Finding> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status
    ) {
        return ResponseEntity.ok(findingService.updateStatus(id, status));
    }
}
