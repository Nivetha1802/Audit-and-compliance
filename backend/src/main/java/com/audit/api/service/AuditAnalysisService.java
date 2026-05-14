package com.audit.api.service;

import com.audit.api.entity.AuditActionLog;
import com.audit.api.repository.AuditActionLogRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.UUID;

@Service
public class AuditAnalysisService {

    private final AuditActionLogRepository auditActionLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.url:http://localhost:5000}")
    private String aiServiceUrl;

    public AuditAnalysisService(AuditActionLogRepository auditActionLogRepository) {
        this.auditActionLogRepository = auditActionLogRepository;
    }

    public String getAuditWorkflowFeedback(UUID projectId) {
        List<AuditActionLog> logs = auditActionLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

        if (logs.isEmpty()) {
            return "No interaction logs found for this project. Start by creating tasks, adding comments, or changing statuses to generate data for analysis.";
        }

        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("project_id", projectId.toString());
            
            ArrayNode logsArray = payload.putArray("logs");
            for (AuditActionLog log : logs) {
                ObjectNode logNode = logsArray.addObject();
                logNode.put("entity_type", log.getEntityType());
                logNode.put("entity_id", log.getEntityId().toString());
                logNode.put("action_type", log.getActionType());
                logNode.put("details", log.getDetails());
                logNode.put("timestamp", log.getCreatedAt().toString());
                logNode.put("performed_by", log.getPerformedBy().toString());
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> request = new HttpEntity<>(payload.toString(), headers);

            JsonNode response = restTemplate.postForObject(aiServiceUrl + "/analyze-workflow", request, JsonNode.class);

            if (response != null && response.has("feedback")) {
                return response.get("feedback").asText();
            } else {
                return "AI analysis completed but no feedback was generated. Please try again later.";
            }

        } catch (Exception e) {
            // Fallback to simple rule-based analysis if AI service is down
            return generateRuleBasedFeedback(logs);
        }
    }

    private String generateRuleBasedFeedback(List<AuditActionLog> logs) {
        long statusChanges = logs.stream().filter(l -> "STATUS_CHANGE".equals(l.getActionType())).count();
        long comments = logs.stream().filter(l -> "COMMENT_ADDED".equals(l.getActionType())).count();
        
        StringBuilder feedback = new StringBuilder();
        feedback.append("Analysis based on ").append(logs.size()).append(" interactions:\n\n");
        
        if (statusChanges > logs.size() * 0.4) {
            feedback.append("- High frequency of status changes detected. This suggests tasks are being moved back and forth between stages frequently.\n");
            feedback.append("- Recommendation: Ensure all requirements are clearly defined before moving a task to 'Under Review'.\n");
        }
        
        if (comments > logs.size() * 0.5) {
            feedback.append("- Significant volume of comments detected. Communication might be fragmented or requirements might be ambiguous.\n");
            feedback.append("- Recommendation: Consider a brief sync meeting to clarify expectations and reduce comment threads.\n");
        }

        if (feedback.length() < 100) {
            feedback.append("- Workflow appears stable. Continue following the current process.\n");
        }
        
        feedback.append("\nNote: AI-powered detailed analysis is currently unavailable, showing rule-based insights instead.");
        
        return feedback.toString();
    }
}
