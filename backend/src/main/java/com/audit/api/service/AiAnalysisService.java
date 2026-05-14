package com.audit.api.service;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import com.audit.api.util.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AiAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(AiAnalysisService.class);

    @Value("${ai.service.url:http://localhost:5000}")
    private String aiServiceUrl;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent}")
    private String geminiApiUrl;

    private final ProjectRepository projectRepository;
    private final RiskRepository riskRepository;
    private final AiAnalysisResultRepository resultRepository;
    private final TransactionRepository transactionRepository;
    private final DocumentRepository documentRepository;
    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final SecurityUtils securityUtils;
    @Autowired private AuditActionLogRepository auditActionLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired private AuditLifecycleService auditLifecycleService;

    @Autowired
    public AiAnalysisService(AiAnalysisResultRepository resultRepository,
                              TransactionRepository transactionRepository,
                              DocumentRepository documentRepository,
                              ChecklistRepository checklistRepository,
                              ChecklistItemRepository checklistItemRepository,
                              ProjectRepository projectRepository,
                              RiskRepository riskRepository,
                              SecurityUtils securityUtils) {
        this.resultRepository = resultRepository;
        this.transactionRepository = transactionRepository;
        this.documentRepository = documentRepository;
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.projectRepository = projectRepository;
        this.riskRepository = riskRepository;
        this.securityUtils = securityUtils;
    }

    // ── Three-Way Match from uploaded checklist documents ────────────────────

    @Transactional
    public AiAnalysisResult runThreeWayMatchFromDocuments(UUID transactionId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        Checklist checklist = checklistRepository.findByTransactionId(transactionId)
                .orElse(null);

        Map<String, JsonNode> extracted = new HashMap<>();

        if (checklist != null) {
            List<ChecklistItem> items = checklistItemRepository.findByChecklistId(checklist.getId());
            for (ChecklistItem item : items) {
                if (item.getDocumentId() == null) continue;

                String desc = item.getDescription() != null ? item.getDescription().toLowerCase() : "";
                String docType;
                if (desc.contains("purchase order") || desc.contains(" po") || desc.startsWith("po")) {
                    docType = "PO";
                } else if (desc.contains("grn") || desc.contains("goods receipt") || desc.contains("delivery note")) {
                    docType = "GRN";
                } else if (desc.contains("invoice") || desc.contains("bill")) {
                    docType = "INVOICE";
                } else {
                    continue;
                }

                if (extracted.containsKey(docType)) continue;

                documentRepository.findById(item.getDocumentId()).ifPresent(doc -> {
                    JsonNode docData = extractDocumentData(doc, docType);
                    extracted.put(docType, docData);
                });
            }
        }

        if (extracted.isEmpty()) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("result", "NEEDS_REVIEW");
            error.put("confidence", 0.0);
            error.put("needs_human_review", true);
            ArrayNode issues = error.putArray("issues");
            issues.add("No PO, GRN, or Invoice documents found.");
            return saveResult(transactionId, orgId, "THREE_WAY_MATCH", error);
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_amount", tx.getAmount() != null ? tx.getAmount().doubleValue() : 0);
        payload.set("po",      extracted.getOrDefault("PO",      objectMapper.createObjectNode()));
        payload.set("grn",     extracted.getOrDefault("GRN",     objectMapper.createObjectNode()));
        payload.set("invoice", extracted.getOrDefault("INVOICE", objectMapper.createObjectNode()));

        JsonNode response = callAiService("/three-way-match-from-docs", payload);
        persistExtracted(tx, extracted);
        transactionRepository.save(tx);

        return saveResult(transactionId, orgId, "THREE_WAY_MATCH", response);
    }

    private void persistExtracted(Transaction tx, Map<String, JsonNode> extracted) {
        if (extracted.containsKey("PO")) {
            JsonNode po = extracted.get("PO");
            if (!po.path("amount").isMissingNode() && !po.path("amount").isNull())
                tx.setPoAmount(java.math.BigDecimal.valueOf(po.path("amount").asDouble()));
            if (!po.path("doc_number").isMissingNode() && !po.path("doc_number").isNull())
                tx.setPoNumber(po.path("doc_number").asText());
            if (!po.path("vendor").isMissingNode() && !po.path("vendor").isNull())
                tx.setPoVendor(po.path("vendor").asText());
        }
        if (extracted.containsKey("GRN")) {
            JsonNode grn = extracted.get("GRN");
            if (!grn.path("amount").isMissingNode() && !grn.path("amount").isNull())
                tx.setGrnAmount(java.math.BigDecimal.valueOf(grn.path("amount").asDouble()));
            if (!grn.path("doc_number").isMissingNode() && !grn.path("doc_number").isNull())
                tx.setGrnNumber(grn.path("doc_number").asText());
        }
        if (extracted.containsKey("INVOICE")) {
            JsonNode inv = extracted.get("INVOICE");
            if (!inv.path("amount").isMissingNode() && !inv.path("amount").isNull())
                tx.setInvoiceAmount(java.math.BigDecimal.valueOf(inv.path("amount").asDouble()));
            if (!inv.path("doc_number").isMissingNode() && !inv.path("doc_number").isNull())
                tx.setInvoiceNumber(inv.path("doc_number").asText());
            if (!inv.path("vendor").isMissingNode() && !inv.path("vendor").isNull())
                tx.setInvoiceVendor(inv.path("vendor").asText());
        }
    }

    private JsonNode extractDocumentData(Document doc, String docTypeHint) {
        try {
            byte[] fileBytes = Files.readAllBytes(Paths.get(doc.getFilePath()));
            String mimeType = doc.getFileType() != null ? doc.getFileType() : "application/octet-stream";
            String fileName = doc.getFileName() != null ? doc.getFileName() : "document";

            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
            fileHeaders.setContentDispositionFormData("file", fileName);
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override public String getFilename() { return fileName; }
            };
            HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(fileResource, fileHeaders);

            HttpHeaders typeHeaders = new HttpHeaders();
            typeHeaders.setContentType(MediaType.TEXT_PLAIN);
            HttpEntity<String> typePart = new HttpEntity<>(docTypeHint, typeHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);
            body.add("doc_type", typePart);

            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, requestHeaders);
            ResponseEntity<String> response = restTemplate.postForEntity(
                    aiServiceUrl + "/extract-document", requestEntity, String.class);

            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage());
            return err;
        }
    }

    @Transactional
    public AiAnalysisResult runThreeWayMatch(UUID transactionId, Double poAmount, Double workProgressAmount, Double invoiceAmount, String poVendor, String invoiceVendor) {
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

    @Transactional
    public AiAnalysisResult runBudgetVariance(UUID projectId, List<Map<String, Object>> categories, Double alertThresholdPct) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("project_id", projectId.toString());
        payload.put("alert_threshold_pct", alertThresholdPct != null ? alertThresholdPct : 10.0);
        payload.set("categories", objectMapper.valueToTree(categories));
        JsonNode response = callAiService("/budget-variance", payload);
        return saveResult(null, orgId, "BUDGET_VARIANCE", response);
    }

    @Transactional
    public AiAnalysisResult runDuplicateDetection(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Transaction> transactions = transactionRepository.findByOrganizationIdAndProjectId(orgId, projectId);
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

    @Transactional
    public Map<String, Object> runComprehensiveAnalysis(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Transaction> transactions = transactionRepository.findByOrganizationIdAndProjectId(orgId, projectId);
        Map<String, Object> results = new HashMap<>();
        List<Map<String, Object>> txResults = new ArrayList<>();
        Map<String, Integer> ruleStats = new HashMap<>();
        ruleStats.put("amountCheck", 0);
        ruleStats.put("quantityCheck", 0);
        ruleStats.put("vendorMatch", 0);
        ruleStats.put("duplicateCheck", 0);
        ruleStats.put("dateValidation", 0);
        ruleStats.put("bankValidation", 0);

        for (Transaction tx : transactions) {
            List<String> issues = auditLifecycleService.validateTransaction(tx.getId());
            Map<String, Object> txRes = new HashMap<>();
            txRes.put("transactionNumber", tx.getTransactionNumber());
            txRes.put("id", tx.getId());
            txRes.put("issues", issues);
            txRes.put("status", issues.isEmpty() ? "SUCCESS" : "FAILED");
            
            boolean amountFailed = false, quantityFailed = false, vendorFailed = false, dateFailed = false, bankFailed = false;
            for (String issue : issues) {
                if (issue.contains("Amount")) amountFailed = true;
                if (issue.contains("Quantity")) quantityFailed = true;
                if (issue.contains("Vendor")) vendorFailed = true;
                if (issue.contains("Date")) dateFailed = true;
                if (issue.contains("Bank")) bankFailed = true;
            }

            if (!amountFailed) ruleStats.put("amountCheck", ruleStats.get("amountCheck") + 1);
            if (!quantityFailed) ruleStats.put("quantityCheck", ruleStats.get("quantityCheck") + 1);
            if (!vendorFailed) ruleStats.put("vendorMatch", ruleStats.get("vendorMatch") + 1);
            if (!dateFailed) ruleStats.put("dateValidation", ruleStats.get("dateValidation") + 1);
            if (!bankFailed) ruleStats.put("bankValidation", ruleStats.get("bankValidation") + 1);
            txResults.add(txRes);
        }

        AiAnalysisResult dupResult = runDuplicateDetection(projectId);
        String dupJson = dupResult.getResultJson();
        int dupCount = 0;
        Object duplicatesData = new java.util.ArrayList<>();
        try {
            JsonNode node = objectMapper.readTree(dupJson);
            dupCount = node.path("duplicates").size();
            // Parse the duplicates array so frontend receives a real object not a string
            duplicatesData = objectMapper.convertValue(node, Object.class);
        } catch (Exception e) {
            duplicatesData = new java.util.ArrayList<>();
        }

        if (dupCount == 0) {
            ruleStats.put("duplicateCheck", transactions.size());
        } else {
            ruleStats.put("duplicateCheck", Math.max(0, transactions.size() - dupCount));
        }

        int rulesPassed = 0, rulesFailed = 0;
        for (Map<String, Object> txRes : txResults) {
            List<String> issues = (List<String>) txRes.get("issues");
            if (issues == null || issues.isEmpty()) rulesPassed++; else rulesFailed++;
        }

        results.put("duplicates", duplicatesData);
        results.put("transactionAnalysis", txResults);
        results.put("ruleStats", ruleStats);
        results.put("summary", Map.of(
            "totalTransactions", transactions.size(),
            "rulesPassed", rulesPassed,
            "rulesFailed", rulesFailed,
            "duplicatesFound", dupCount
        ));
        return results;
    }

    @Transactional
    public AiAnalysisResult runEvidenceValidation(UUID transactionId, Map<String, Object> evidenceMetadata) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        Transaction tx = transactionRepository.findById(transactionId).orElseThrow();
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

    @Transactional
    public AiAnalysisResult validateEvidenceFile(UUID transactionId, UUID documentId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        Transaction tx = transactionRepository.findById(transactionId).orElseThrow();
        Document doc = documentRepository.findById(documentId).orElseThrow();
        try {
            byte[] fileBytes = Files.readAllBytes(Paths.get(doc.getFilePath()));
            String mimeType = doc.getFileType() != null ? doc.getFileType() : "application/octet-stream";
            String originalName = doc.getFileName() != null ? doc.getFileName() : "evidence";
            HttpHeaders fileHeaders = new HttpHeaders();
            fileHeaders.setContentType(MediaType.parseMediaType(mimeType));
            fileHeaders.setContentDispositionFormData("file", originalName);
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) { @Override public String getFilename() { return originalName; } };
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
            ResponseEntity<String> response = restTemplate.postForEntity(aiServiceUrl + "/validate-evidence", requestEntity, String.class);
        

            JsonNode result = objectMapper.readTree(response.getBody());
            return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", result);
        } catch (Exception e) {
            ObjectNode error = objectMapper.createObjectNode();
            error.put("error", "Validation failed: " + e.getMessage());
            return saveResult(transactionId, orgId, "EVIDENCE_VALIDATION", error);
        }
    }

    @Transactional
    public AiAnalysisResult submitHumanReview(UUID resultId, String decision, String notes) {
        AiAnalysisResult result = resultRepository.findById(resultId).orElseThrow();
        result.setReviewedBy(securityUtils.getCurrentUser().getId());
        result.setReviewedAt(LocalDateTime.now());
        result.setReviewerDecision(decision);
        result.setReviewerNotes(notes);
        result.setNeedsHumanReview(false);
        if ("APPROVED".equals(decision)) result.setStatus("VALIDATED");
        else if ("REJECTED".equals(decision)) result.setStatus("REJECTED");
        return resultRepository.save(result);
    }

    public List<AiAnalysisResult> getPendingReviews() { return resultRepository.findByOrganizationIdAndNeedsHumanReview(securityUtils.getCurrentOrganizationId(), true); }
    public List<AiAnalysisResult> getAllResults() { return resultRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId()); }
    public List<AiAnalysisResult> getResultsByTransaction(UUID transactionId) { return resultRepository.findByTransactionId(transactionId); }

    public Map<String, Object> generateAuditInsights(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        Project project = projectRepository.findById(projectId).orElseThrow();
        List<Transaction> transactions = transactionRepository.findByOrganizationIdAndProjectId(orgId, projectId);
        List<Risk> risks = riskRepository.findByOrganizationId(orgId);

        long openRisks = risks.stream().filter(r -> "OPEN".equals(r.getStatus())).count();
        long highRisks = risks.stream().filter(r -> "HIGH".equals(r.getSeverity()) && "OPEN".equals(r.getStatus())).count();
        long approvedTx = transactions.stream().filter(t -> "APPROVED".equals(t.getStatus())).count();
        long pendingTx  = transactions.stream().filter(t -> "PENDING_EVIDENCE".equals(t.getStatus())).count();
        int compliancePct = transactions.size() > 0 ? (int)((approvedTx * 100) / transactions.size()) : 0;

        String prompt = String.format(
            "You are an expert audit compliance AI. Analyze the following audit data and provide structured insights.\n\n" +
            "Project: %s\n" +
            "Total Transactions: %d\n" +
            "Approved Transactions: %d\n" +
            "Pending Evidence: %d\n" +
            "Compliance Rate: %d%%\n" +
            "Total Risks: %d\n" +
            "Open Risks: %d\n" +
            "High Severity Risks: %d\n\n" +
            "Provide a JSON response with exactly these keys:\n" +
            "{\"summary\": \"one paragraph executive summary\",\n" +
            "\"strengths\": [\"strength 1\", \"strength 2\", \"strength 3\"],\n" +
            "\"improvements\": [\"area 1\", \"area 2\", \"area 3\"],\n" +
            "\"risks\": [\"risk 1\", \"risk 2\", \"risk 3\"],\n" +
            "\"recommendations\": [\"recommendation 1\", \"recommendation 2\", \"recommendation 3\"]}\n" +
            "Return ONLY valid JSON, no markdown, no explanation.",
            project.getName(), transactions.size(), approvedTx, pendingTx,
            compliancePct, risks.size(), openRisks, highRisks
        );

        Map<String, Object> result = new HashMap<>();
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("prompt", prompt);

            JsonNode response = callAiService("/gemini-insights", payload);

            if (response == null || response.has("error")) {
                result.put("error", response != null ? response.path("error").asText() : "AI service unavailable. Ensure ai-service is running on port 5000.");
                return result;
            }

            result.put("summary", response.path("summary").asText());
            result.put("strengths", toList(response.path("strengths")));
            result.put("improvements", toList(response.path("improvements")));
            result.put("risks", toList(response.path("risks")));
            result.put("recommendations", toList(response.path("recommendations")));
            logger.info("Gemini AI insights generated successfully for project {}", projectId);

        } catch (Exception e) {
            logger.error("Gemini AI insights failed: {}", e.getMessage());
            result.put("error", "Could not generate AI insights: " + e.getMessage());
        }
        return result;
    }

    private List<String> toList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(n -> list.add(n.asText()));
        } else if (!node.isMissingNode()) {
            list.add(node.asText());
        }
        return list;
    }

    private JsonNode callAiService(String endpoint, ObjectNode payload) {
        try {
            HttpHeaders headers = createJsonHeaders();
            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(aiServiceUrl + endpoint, entity, String.class);
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) { return null; }
    }

    private HttpHeaders createJsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private AiAnalysisResult saveResult(UUID transactionId, UUID orgId, String type, JsonNode result) {
        AiAnalysisResult res = new AiAnalysisResult();
        res.setTransactionId(transactionId);
        res.setOrganizationId(orgId);
        res.setAnalysisType(type);
        res.setResultJson(result.toString());
        res.setStatus("COMPLETED");
        res.setConfidenceScore(result.path("confidence").asDouble(0.8));
        res.setNeedsHumanReview(result.path("needs_human_review").asBoolean(false));
        return resultRepository.save(res);
    }
}
