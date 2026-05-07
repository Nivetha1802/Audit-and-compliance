package com.audit.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_analysis_results")
public class AiAnalysisResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "analysis_type", nullable = false)
    private String analysisType; // THREE_WAY_MATCH, BUDGET_VARIANCE, DUPLICATE_DETECTION, EVIDENCE_VALIDATION

    @Column(nullable = false)
    private String status; // VALIDATED, NEEDS_REVIEW, REJECTED, CLEARED, MISMATCH, DUPLICATE_FOUND

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "needs_human_review")
    private boolean needsHumanReview;

    @Column(columnDefinition = "TEXT")
    private String resultJson; // Full JSON response from AI service

    @Column(name = "extracted_amount")
    private Double extractedAmount;

    @Column(columnDefinition = "TEXT")
    private String issues; // Comma-separated issue descriptions

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewer_decision")
    private String reviewerDecision; // APPROVED, REJECTED, ESCALATED

    @Column(name = "reviewer_notes", columnDefinition = "TEXT")
    private String reviewerNotes;

    public AiAnalysisResult() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTransactionId() { return transactionId; }
    public void setTransactionId(UUID transactionId) { this.transactionId = transactionId; }
    public String getAnalysisType() { return analysisType; }
    public void setAnalysisType(String analysisType) { this.analysisType = analysisType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
    public boolean isNeedsHumanReview() { return needsHumanReview; }
    public void setNeedsHumanReview(boolean needsHumanReview) { this.needsHumanReview = needsHumanReview; }
    public String getResultJson() { return resultJson; }
    public void setResultJson(String resultJson) { this.resultJson = resultJson; }
    public Double getExtractedAmount() { return extractedAmount; }
    public void setExtractedAmount(Double extractedAmount) { this.extractedAmount = extractedAmount; }
    public String getIssues() { return issues; }
    public void setIssues(String issues) { this.issues = issues; }
    public UUID getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(UUID reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public String getReviewerDecision() { return reviewerDecision; }
    public void setReviewerDecision(String reviewerDecision) { this.reviewerDecision = reviewerDecision; }
    public String getReviewerNotes() { return reviewerNotes; }
    public void setReviewerNotes(String reviewerNotes) { this.reviewerNotes = reviewerNotes; }
}
