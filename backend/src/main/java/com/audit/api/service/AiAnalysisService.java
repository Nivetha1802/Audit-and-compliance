package com.audit.api.service;

import com.audit.api.entity.AiAnalysisResult;
import com.audit.api.entity.Document;
import com.audit.api.entity.Transaction;
import com.audit.api.repository.AiAnalysisResultRepository;
import com.audit.api.repository.DocumentRepository;
import com.audit.api.repository.TransactionRepository;
import com.audit.api.util.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AiAnalysisService {

    @Value("${ai.service.url:http://localhost:5000}")
    private String aiServiceUrl;

    private final AiAnalysisResultRepository resultRepository;
    private final TransactionRepository transactionRepository;
    private final DocumentRepository documentRepository;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    public AiAnalysisService(AiAnalysisResultRepository resultRepository,
                              TransactionRepository transactionRepository,
                              DocumentRepository documentRepository,
                              SecurityUtils securityUtils) {
        this.resultRepository = resultRepository;
        this.transactionRepository = transactionRepository;
        this.documentRepository = documentRepository;
        this.securityUtils = securityUtils;
    }

    // ── Three-Way Match ──────────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult runThreeWayMatch(UUID transactionId,
                                              Double poAmount,
                                              Double workProgressAmount,
                                              Double invoiceAmount,
                                              String poVendor,
                                              String invoiceVendor) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_id", transactionId.toString());
        payload.put("po_amount", poAmount);
        payload.put("work_progress_amount", workProgressAmount);
        payload.put("invoice_amount", invoiceAmount);
        payload.put("po_vendor", poVendor != null ? poVendor : "");
        payload.put("invoice_vendor", invoiceVendor != null ? invoiceVendor : "");

        JsonNode response = callAiService("/three-way-match", payload);
        return saveResult(transactionId, orgId, "THREE_WAY_MATCH", response);
    }

    // ── Budget Variance ──────────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult runBudgetVariance(UUID projectId,
                                               List<Map<String, Object>> categories,
                                               Double alertThresholdPct) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("project_id", projectId.toString());
        payload.put("alert_threshold_pct", alertThresholdPct != null ? alertThresholdPct : 10.0);
        payload.set("categories", objectMapper.valueToTree(categories));

        JsonNode response = callAiService("/budget-variance", payload);
        return saveResult(null, orgId, "BUDGET_VARIANCE", response);
    }

    // ── Duplicate Detection ──────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult runDuplicateDetection(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        List<Transaction> transactions = transactionRepository
                .findByOrganizationIdAndProjectId(orgId, projectId);

        ArrayNode txArray = objectMapper.createArrayNode();
        for (Transaction t : transactions) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("id", t.getId().toString());
            node.put("reference_no", t.getReferenceNo() != null ? t.getReferenceNo() : "");
            node.put("amount", t.getAmount() != null ? t.getAmount().doubleValue() : 0);
            node.put("vendor", t.getVendorCustomer() != null ? t.getVendorCustomer() : "");
            node.put("date", t.getTransactionDate() != null ? t.getTransactionDate().toString() : "");
            node.put("description", t.getDescription() != null ? t.getDescription() : "");
            txArray.add(node);
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("transactions", txArray);

        JsonNode response = callAiService("/duplicate-detection", payload);
        return saveResult(null, orgId, "DUPLICATE_DETECTION", response);
    }

    // ── Evidence Validation (from metadata) ─────────────────────────────────

    @Transactional
    public AiAnalysisResult runEvidenceValidation(UUID transactionId,
                                                   Map<String, Object> evidenceMetadata) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        ObjectNode txNode = objectMapper.createObjectNode();
        txNode.put("amount", tx.getAmount() != null ? tx.getAmount().doubleValue() : 0);
        txNode.put("vendor", tx.getVendorCustomer() != null ? tx.getVendorCustomer() : "");
        txNode.put("date", tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : "");
        txNode.put("reference_no", tx.getReferenceNo() != null ? tx.getReferenceNo() : "");
        txNode.put("description", tx.getDescription() != null ? tx.getDescription() : "");

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_id", transactionId.toString());
        payload.set("transaction", txNode);
        payload.set("evidence", objectMapper.valueToTree(evidenceMetadata));

        JsonNode response = callAiService("/validate-evidence", payload);
        return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", response);
    }

    // ── Evidence Validation (by documentId — reads file from disk) ───────────

    @Transactional
    public AiAnalysisResult validateEvidenceFile(UUID transactionId, UUID documentId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        try {
            byte[] fileBytes = Files.readAllBytes(Paths.get(doc.getFilePath()));
            String mimeType = doc.getFileType() != null ? doc.getFileType() : "application/octet-stream";
            String originalName = doc.getFileName() != null ? doc.getFileName() : "evidence";

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
            fileHeaders.setContentDispositionFormData("file", originalName);
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override public String getFilename() { return originalName; }
            };
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);

            ObjectNode txNode = objectMapper.createObjectNode();
            txNode.put("amount", tx.getAmount() != null ? tx.getAmount().doubleValue() : 0);
            txNode.put("vendor", tx.getVendorCustomer() != null ? tx.getVendorCustomer() : "");
            txNode.put("date", tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : "");
            txNode.put("reference_no", tx.getReferenceNo() != null ? tx.getReferenceNo() : "");
            HttpHeaders txHeaders = new HttpHeaders();
            txHeaders.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> txPart = new HttpEntity<>(txNode.toString(), txHeaders);

            HttpHeaders nameHeaders = new HttpHeaders();
            nameHeaders.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> namePart = new HttpEntity<>(originalName, nameHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);
            body.add("transaction", txPart);
            body.add("original_filename", namePart);

            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, requestHeaders);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    aiServiceUrl + "/validate-evidence", requestEntity, String.class);

            JsonNode result = objectMapper.readTree(response.getBody());
            return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", result);

        } catch (Exception e) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("error", "Validation failed: " + e.getMessage());
            error.put("result", "SERVICE_UNAVAILABLE");
            error.put("confidence", 0.0);
            error.put("needs_human_review", true);
            error.put("amount_match", false);
            return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", error);
        }
    }

    // ── Human Review Decision ────────────────────────────────────────────────

    @Transactional
    public AiAnalysisResult submitHumanReview(UUID resultId, String decision, String notes) {
        AiAnalysisResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new RuntimeException("Analysis result not found"));

        result.setReviewedBy(securityUtils.getCurrentUser().getId());
        result.setReviewedAt(LocalDateTime.now());
        result.setReviewerDecision(decision);
        result.setReviewerNotes(notes);
        result.setNeedsHumanReview(false);

        if ("APPROVED".equals(decision)) {
            result.setStatus("VALIDATED");
        } else if ("REJECTED".equals(decision)) {
            result.setStatus("REJECTED");
        }

        return resultRepository.save(result);
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    public List<AiAnalysisResult> getPendingReviews() {
        return resultRepository.findByOrganizationIdAndNeedsHumanReview(
                securityUtils.getCurrentOrganizationId(), true);
    }

    public List<AiAnalysisResult> getAllResults() {
        return resultRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<AiAnalysisResult> getResultsByTransaction(UUID transactionId) {
        return resultRepository.findByTransactionId(transactionId);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private JsonNode callAiService(String endpoint, ObjectNode payload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    aiServiceUrl + endpoint, entity, String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("error", "AI service unavailable: " + e.getMessage());
            error.put("confidence", 0.0);
            error.put("needs_human_review", true);
            error.put("status", "SERVICE_UNAVAILABLE");
            return error;
        }
    }

    private AiAnalysisResult saveResult(UUID transactionId, UUID orgId, 
                                         String analysisType, JsonNode response) {
        AiAnalysisResult result = null;
        
        if (transactionId != null) {
            result = resultRepository.findByTransactionIdAndAnalysisType(transactionId, analysisType)
                    .orElse(new AiAnalysisResult());
        } else {
            List<AiAnalysisResult> existing = resultRepository.findByOrganizationIdAndAnalysisType(orgId, analysisType);
            if (!existing.isEmpty()) {
                resultRepository.deleteAll(existing);
                resultRepository.flush();
            }
            result = new AiAnalysisResult();
        }

        result.setTransactionId(transactionId);
        result.setOrganizationId(orgId);
        if (response.has("extracted_amount") && !response.path("extracted_amount").isNull()) {
            result.setExtractedAmount(response.path("extracted_amount").asDouble());
        }
        result.setAnalysisType(analysisType);

        double confidence = response.path("confidence").asDouble(0.0);
        boolean needsReview = response.path("needs_human_review").asBoolean(true);
        String status = response.path("result").asText(
                response.path("validation_status").asText(
                response.path("overall_status").asText("UNKNOWN")));

        result.setConfidenceScore(confidence);
        result.setNeedsHumanReview(needsReview);
        result.setStatus(status);

        // If a new MISMATCH comes in after a previous review, re-open for review
        // If a new VALIDATED comes in, clear any previous rejection so it doesn't stay in the queue
        if ("VALIDATED".equals(status)) {
            result.setNeedsHumanReview(false);
            result.setReviewerDecision(null);
            result.setReviewerNotes(null);
            result.setReviewedAt(null);
            result.setReviewedBy(null);
        } else if ("MISMATCH".equals(status) || "NEEDS_REVIEW".equals(status)) {
            // Re-open for review even if previously reviewed
            result.setNeedsHumanReview(true);
            result.setReviewerDecision(null);
            result.setReviewerNotes(null);
            result.setReviewedAt(null);
            result.setReviewedBy(null);
        }        List<String> issueList = new ArrayList<>();
        JsonNode issues = response.path("issues");
        if (issues.isArray()) {
            issues.forEach(i -> {
                if (i.isTextual()) issueList.add(i.asText());
                else if (i.has("field")) issueList.add(i.path("field").asText() + ": " + i.path("detail").asText());
            });
        }
        result.setIssues(String.join("; ", issueList));

        try {
            result.setResultJson(objectMapper.writeValueAsString(response));
        } catch (Exception e) {
            result.setResultJson("{}");
        }

        return resultRepository.save(result);
    }
}
