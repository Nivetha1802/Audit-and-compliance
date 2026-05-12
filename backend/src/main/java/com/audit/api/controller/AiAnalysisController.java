package com.audit.api.controller;

import com.audit.api.entity.AiAnalysisResult;
import com.audit.api.service.AiAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
public class AiAnalysisController {

    private final AiAnalysisService aiAnalysisService;

    @Autowired
    public AiAnalysisController(AiAnalysisService aiAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
    }

    /** Three-Way Match from uploaded PO/GRN/Invoice documents in checklist */
    @PostMapping("/three-way-match-docs/{transactionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> threeWayMatchFromDocs(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(aiAnalysisService.runThreeWayMatchFromDocuments(transactionId));
    }

    /** Three-Way Match: PO vs Work Progress vs Invoice (manual amounts) */
    @PostMapping("/three-way-match/{transactionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> threeWayMatch(
            @PathVariable UUID transactionId,
            @RequestBody Map<String, Object> body) {
        Double poAmt  = toDouble(body.get("poAmount"));
        Double wpAmt  = toDouble(body.get("workProgressAmount"));
        Double invAmt = toDouble(body.get("invoiceAmount"));
        String poVendor  = (String) body.getOrDefault("poVendor", "");
        String invVendor = (String) body.getOrDefault("invoiceVendor", "");
        return ResponseEntity.ok(
                aiAnalysisService.runThreeWayMatch(transactionId, poAmt, wpAmt, invAmt, poVendor, invVendor));
    }

    /** Budget Variance: actual vs budgeted per category */
    @PostMapping("/budget-variance/{projectId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> budgetVariance(
            @PathVariable UUID projectId,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> categories = (List<Map<String, Object>>) body.get("categories");
        Double threshold = toDouble(body.getOrDefault("alertThresholdPct", 10.0));
        return ResponseEntity.ok(
                aiAnalysisService.runBudgetVariance(projectId, categories, threshold));
    }

    /** Duplicate Detection: scan all transactions in a project */
    @PostMapping("/duplicate-detection/{projectId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> duplicateDetection(@PathVariable UUID projectId) {
        return ResponseEntity.ok(aiAnalysisService.runDuplicateDetection(projectId));
    }

    /** Evidence Validation: validate extracted evidence against transaction */
    @PostMapping("/validate-evidence/{transactionId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> validateEvidence(
            @PathVariable UUID transactionId,
            @RequestBody Map<String, Object> evidenceMetadata) {
        return ResponseEntity.ok(aiAnalysisService.runEvidenceValidation(transactionId, evidenceMetadata));
    }

    /** Evidence Validation: upload image file and compare amount to transaction */
    @PostMapping("/validate-evidence-file/{transactionId}/{documentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> validateEvidenceFile(
            @PathVariable UUID transactionId,
            @PathVariable UUID documentId) {
        return ResponseEntity.ok(aiAnalysisService.validateEvidenceFile(transactionId, documentId));
    }

    /** Validation Station: get all results needing human review */
    @GetMapping("/pending-reviews")
    public ResponseEntity<List<AiAnalysisResult>> getPendingReviews() {
        return ResponseEntity.ok(aiAnalysisService.getPendingReviews());
    }

    /** Submit human review decision */
    @PostMapping("/review/{resultId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('AUDITOR') or hasRole('COMPLIANCE_OFFICER')")
    public ResponseEntity<AiAnalysisResult> submitReview(
            @PathVariable UUID resultId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                aiAnalysisService.submitHumanReview(resultId, body.get("decision"), body.get("notes")));
    }

    /** All AI analysis results for the org */
    @GetMapping("/results")
    public ResponseEntity<List<AiAnalysisResult>> getAllResults() {
        return ResponseEntity.ok(aiAnalysisService.getAllResults());
    }

    /** Results for a specific transaction */
    @GetMapping("/results/transaction/{transactionId}")
    public ResponseEntity<List<AiAnalysisResult>> getByTransaction(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(aiAnalysisService.getResultsByTransaction(transactionId));
    }

    private Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); }
        catch (Exception e) { return null; }
    }
}
