package com.audit.api.controller;

import com.audit.api.entity.Transaction;
import com.audit.api.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    @Autowired
    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        return ResponseEntity.ok(transactionService.getAllTransactions());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Transaction>> getByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(transactionService.getTransactionsByProject(projectId));
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR')")
    public ResponseEntity<Map<String, Object>> importCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") UUID projectId) throws Exception {
        TransactionService.ImportResult result = transactionService.importFromCsv(file, projectId);
        return ResponseEntity.ok(Map.of(
                "message", "Import complete",
                "imported", result.imported(),
                "skipped", result.skipped()
        ));
    }

    @PostMapping("/import-bank")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR')")
    public ResponseEntity<Map<String, Object>> importBankStatement(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") UUID projectId) throws Exception {
        TransactionService.BankImportResult result = transactionService.importBankStatement(file, projectId);
        return ResponseEntity.ok(Map.of(
                "message", "Bank import complete",
                "matched", result.matched(),
                "created", result.created(),
                "skipped", result.skipped()
        ));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<Transaction> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        return ResponseEntity.ok(transactionService.updateStatus(id, status));
    }

    @PatchMapping("/{id}/link-vendor")
    public ResponseEntity<Transaction> linkVendor(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID vendorId) {
        return ResponseEntity.ok(transactionService.linkVendor(id, vendorId));
    }

    @PostMapping("/{id}/auto-link-vendor")
    public ResponseEntity<Transaction> autoLinkVendor(@PathVariable UUID id) {
        Transaction tx = transactionService.getAllTransactions().stream()
                .filter(t -> t.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        transactionService.autoLinkVendor(tx, tx.getOrganizationId());
        return ResponseEntity.ok(transactionService.linkVendor(tx.getId(), tx.getVendorId()));
    }
}
