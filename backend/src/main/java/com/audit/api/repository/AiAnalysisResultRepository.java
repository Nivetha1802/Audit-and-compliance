package com.audit.api.repository;

import com.audit.api.entity.AiAnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AiAnalysisResultRepository extends JpaRepository<AiAnalysisResult, UUID> {
    List<AiAnalysisResult> findByOrganizationId(UUID organizationId);
    List<AiAnalysisResult> findByOrganizationIdAndNeedsHumanReview(UUID organizationId, boolean needsHumanReview);
    List<AiAnalysisResult> findByOrganizationIdAndAnalysisType(UUID organizationId, String analysisType);
    java.util.Optional<AiAnalysisResult> findByTransactionIdAndAnalysisType(UUID transactionId, String analysisType);
    List<AiAnalysisResult> findByTransactionId(UUID transactionId);
}
