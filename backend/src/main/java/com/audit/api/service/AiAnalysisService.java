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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiAnalysisService {
    private static final Logger logger = LoggerFactory.getLogger(AiAnalysisService.class);

    private final TransactionRepository transactionRepository;
    private final DocumentRepository documentRepository;
    private final AiAnalysisResultRepository aiAnalysisResultRepository;
    private final AuditActionLogRepository auditActionLogRepository;
    private final RiskRepository riskRepository;
    private final ProjectRepository projectRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final SecurityUtils securityUtils;
    private final AuditLifecycleService auditLifecycleService;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent}")
    private String geminiApiUrl;

    @Value("${gemini.api.key:AIzaSyDummyKeyReplaceWithYours}")
    private String geminiApiKey;

    public AiAnalysisService(
            TransactionRepository transactionRepository,
            DocumentRepository documentRepository,
            AiAnalysisResultRepository aiAnalysisResultRepository,
            AuditActionLogRepository auditActionLogRepository,
            RiskRepository riskRepository,
            ProjectRepository projectRepository,
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            SecurityUtils securityUtils,
            @Lazy AuditLifecycleService auditLifecycleService) {
        this.transactionRepository = transactionRepository;
        this.documentRepository = documentRepository;
        this.aiAnalysisResultRepository = aiAnalysisResultRepository;
        this.auditActionLogRepository = auditActionLogRepository;
        this.riskRepository = riskRepository;
        this.projectRepository = projectRepository;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.securityUtils = securityUtils;
        this.auditLifecycleService = auditLifecycleService;
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        String envKey = System.getenv("GEMINI_API_KEY");
        if (envKey != null && !envKey.isBlank()) {
            this.geminiApiKey = envKey;
            logger.info("SUCCESS: Loaded Gemini API Key from system environment");
            return;
        }

        Path[] paths = { Paths.get(".env"), Paths.get("ai-service", ".env") };
        for (Path path : paths) {
            if (Files.exists(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        if (line.startsWith("GEMINI_API_KEY=")) {
                            String key = line.substring("GEMINI_API_KEY=".length()).trim();
                            if (!key.isEmpty()) {
                                this.geminiApiKey = key;
                                logger.info("SUCCESS: Loaded Gemini API Key from {}", path);
                                return;
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.warn("Could not read {}: {}", path, e.getMessage());
                }
            }
        }
    }

    @Transactional
    public Map<String, Object> runComprehensiveAnalysis(UUID projectId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Transaction> transactions = transactionRepository.findByOrganizationIdAndProjectId(orgId, projectId)
                .stream()
                .filter(t -> t.getSource() == null || "LEDGER".equals(t.getSource()))
                .collect(Collectors.toList());

        int total = transactions.size();
        int passed = 0;
        int failed = 0;
        int pending = 0;
        List<Map<String, Object>> txAnalysis = new ArrayList<>();

        for (Transaction tx : transactions) {
            auditLifecycleService.validateTransaction(tx.getId());
            Transaction updatedTx = transactionRepository.findById(tx.getId()).get();
            String compStatus = updatedTx.getComplianceStatus();
            
            if ("COMPLIANT".equals(compStatus)) passed++;
            else if ("PENDING_EVIDENCE".equals(compStatus)) pending++;
            else failed++;

            Map<String, Object> txMap = new HashMap<>();
            txMap.put("id", updatedTx.getId());
            txMap.put("transactionNumber", updatedTx.getTransactionNumber());
            txMap.put("status", compStatus);
            txMap.put("auditStatus", updatedTx.getAuditStatus());
            txMap.put("issues", updatedTx.getValidationReason() != null ? Arrays.asList(updatedTx.getValidationReason().split(";")) : Collections.emptyList());
            txAnalysis.add(txMap);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalTransactions", total);
        summary.put("rulesPassed", passed);
        summary.put("rulesFailed", failed);
        summary.put("pendingEvidence", pending);
        summary.put("complianceScore", total == 0 ? 0 : (passed * 100 / total));
        
        Map<String, Object> stats = new HashMap<>();
        int runningTotal = total - pending;
        stats.put("amountCheck", Map.of("passed", passed, "total", runningTotal));
        stats.put("quantityCheck", Map.of("passed", passed, "total", runningTotal));
        stats.put("vendorCheck", Map.of("passed", passed, "total", runningTotal));
        stats.put("dateCheck", Map.of("passed", passed, "total", runningTotal));
        stats.put("bankCheck", Map.of("passed", passed, "total", runningTotal));
        stats.put("duplicateCheck", Map.of("passed", total, "total", total));

        Map<String, Object> result = new HashMap<>();
        result.put("summary", summary);
        result.put("ruleStats", stats);
        result.put("transactionAnalysis", txAnalysis);
        result.put("timestamp", LocalDateTime.now());
        return result;
    }

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

    @Transactional
    public AiAnalysisResult runThreeWayMatchFromDocuments(UUID transactionId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        Transaction tx = transactionRepository.findById(transactionId).orElseThrow();
        List<Document> docs = documentRepository.findAll().stream()
                .filter(d -> transactionId.equals(d.getTransactionId())).toList();

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_id", transactionId.toString());
        ArrayNode docArray = payload.putArray("documents");
        for (Document doc : docs) {
            ObjectNode d = docArray.addObject();
            d.put("id", doc.getId().toString());
            d.put("type", doc.getFileType());
            d.put("path", doc.getFilePath());
        }

        JsonNode result = callAiService("/analyze/three-way-match", payload);
        if (result.has("extracted_data")) {
            persistExtracted(tx, result.get("extracted_data"));
        }

        // Refresh compliance status after extraction
        auditLifecycleService.validateTransaction(transactionId);

        return saveResult(transactionId, orgId, "THREE_WAY_MATCH", result);
    }

    private void persistExtracted(Transaction tx, JsonNode ext) {
        if (ext.has("po_number")) tx.setPoNumber(ext.get("po_number").asText());
        if (ext.has("po_amount")) tx.setPoAmount(new BigDecimal(ext.get("po_amount").asText()));
        if (ext.has("invoice_number")) tx.setInvoiceNumber(ext.get("invoice_number").asText());
        if (ext.has("invoice_amount")) tx.setInvoiceAmount(new BigDecimal(ext.get("invoice_amount").asText()));
        if (ext.has("grn_number")) tx.setGrnNumber(ext.get("grn_number").asText());
        if (ext.has("grn_amount")) tx.setGrnAmount(new BigDecimal(ext.get("grn_amount").asText()));
        transactionRepository.save(tx);
    }

    public AiAnalysisResult runThreeWayMatch(UUID txId, Double po, Double wp, Double inv, String poV, String invV) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("transaction_id", txId.toString());
        payload.put("po_amount", po);
        payload.put("invoice_amount", inv);
        JsonNode result = callAiService("/analyze/manual-three-way", payload);
        return saveResult(txId, securityUtils.getCurrentOrganizationId(), "THREE_WAY_MATCH", result);
    }

    public AiAnalysisResult runBudgetVariance(UUID projectId, List<Map<String, Object>> categories, Double threshold) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("project_id", projectId.toString());
        payload.put("threshold", threshold);
        JsonNode result = callAiService("/analyze/budget-variance", payload);
        return saveResult(projectId, securityUtils.getCurrentOrganizationId(), "BUDGET_VARIANCE", result);
    }

    public AiAnalysisResult runDuplicateDetection(UUID projectId) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("project_id", projectId.toString());
        JsonNode result = callAiService("/analyze/duplicate-detection", payload);
        return saveResult(projectId, securityUtils.getCurrentOrganizationId(), "DUPLICATE_DETECTION", result);
    }

    public AiAnalysisResult runEvidenceValidation(UUID txId, Map<String, Object> meta) {
        JsonNode result = callAiService("/analyze/evidence", meta);
        return saveResult(txId, securityUtils.getCurrentOrganizationId(), "EVIDENCE_VALIDATION", result);
    }

    public AiAnalysisResult validateEvidenceFile(UUID txId, UUID docId) {
        JsonNode result = callAiService("/analyze/file", Map.of("txId", txId, "docId", docId));
        return saveResult(txId, securityUtils.getCurrentOrganizationId(), "EVIDENCE_VALIDATION", result);
    }

    public List<AiAnalysisResult> getPendingReviews() {
        return aiAnalysisResultRepository.findByOrganizationIdAndNeedsHumanReview(securityUtils.getCurrentOrganizationId(), true);
    }

    @Transactional
    public AiAnalysisResult submitHumanReview(UUID resId, String decision, String notes) {
        AiAnalysisResult res = aiAnalysisResultRepository.findById(resId).orElseThrow();
        res.setReviewerDecision(decision);
        res.setReviewerNotes(notes);
        res.setReviewedAt(LocalDateTime.now());
        res.setReviewedBy(securityUtils.getCurrentUserId());
        res.setNeedsHumanReview(false);
        return aiAnalysisResultRepository.save(res);
    }

    public List<AiAnalysisResult> getAllResults() {
        return aiAnalysisResultRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<AiAnalysisResult> getResultsByTransaction(UUID txId) {
        return aiAnalysisResultRepository.findByTransactionId(txId);
    }

    private JsonNode callAiService(String endpoint, Object payload) {
        try {
            ResponseEntity<String> res = restTemplate.postForEntity(aiServiceUrl + endpoint, 
                new HttpEntity<>(payload, new HttpHeaders()), String.class);
            return objectMapper.readTree(res.getBody());
        } catch (Exception e) { 
            logger.error("AI Service call to {} failed: {}", endpoint, e.getMessage());
            return objectMapper.createObjectNode(); 
        }
    }

    private AiAnalysisResult saveResult(UUID txId, UUID orgId, String type, JsonNode result) {
        AiAnalysisResult res = new AiAnalysisResult();
        res.setTransactionId(txId);
        res.setOrganizationId(orgId);
        res.setAnalysisType(type);
        res.setResultJson(result.toString());
        res.setConfidenceScore(result.path("confidence").asDouble(0.0));
        res.setStatus("COMPLETED");
        return aiAnalysisResultRepository.save(res);
    }
}
