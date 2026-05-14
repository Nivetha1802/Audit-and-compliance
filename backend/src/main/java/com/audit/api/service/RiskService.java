package com.audit.api.service;

import com.audit.api.entity.Risk;
import com.audit.api.entity.Project;
import com.audit.api.entity.AuditTask;
import com.audit.api.entity.AuditActionLog;
import com.audit.api.repository.RiskRepository;
import com.audit.api.repository.ProjectRepository;
import com.audit.api.repository.UserRepository;
import com.audit.api.repository.AuditActionLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RiskService {
    private final RiskRepository riskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AuditTaskService auditTaskService;
    private final AuditActionLogRepository auditActionLogRepository;

    public RiskService(RiskRepository riskRepository,
                       ProjectRepository projectRepository,
                       UserRepository userRepository,
                       EmailService emailService,
                       AuditTaskService auditTaskService,
                       AuditActionLogRepository auditActionLogRepository) {
        this.riskRepository = riskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.auditTaskService = auditTaskService;
        this.auditActionLogRepository = auditActionLogRepository;
    }

    public List<Risk> getAllRisks() {
        return riskRepository.findAll();
    }

    public List<Risk> getRisksByProject(UUID projectId) {
        return riskRepository.findByProjectId(projectId);
    }

    @Transactional
    public Risk createRisk(Risk risk) {
        Risk savedRisk = riskRepository.save(risk);
        
        // Log action
        auditActionLogRepository.save(AuditActionLog.builder()
                .entityType("RISK")
                .entityId(savedRisk.getId())
                .actionType("CREATED")
                .performedBy(risk.getRiskCreatorId())
                .details("Risk created: " + risk.getTitle())
                .projectId(risk.getProjectId())
                .build());

        // Automatically create a task for the project owner to address this risk
        createTaskForRisk(savedRisk);
        
        // Send email to project owner
        notifyProjectOwner(savedRisk);
        
        return savedRisk;
    }

    @Transactional
    public Risk updateStatus(UUID id, String status, UUID userId) {
        Risk risk = riskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Risk not found"));
        String oldStatus = risk.getStatus();
        risk.setStatus(status);
        Risk updated = riskRepository.save(risk);

        // Log action
        auditActionLogRepository.save(AuditActionLog.builder()
                .entityType("RISK")
                .entityId(id)
                .actionType("STATUS_CHANGE")
                .performedBy(userId)
                .details("Status changed from " + oldStatus + " to " + status)
                .projectId(risk.getProjectId())
                .build());

        return updated;
    }

    @Transactional
    public Risk updateRisk(UUID id, Risk riskDetails, UUID userId) {
        Risk risk = riskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Risk not found"));
        
        risk.setTitle(riskDetails.getTitle());
        risk.setDescription(riskDetails.getDescription());
        risk.setSeverity(riskDetails.getSeverity());
        risk.setStatus(riskDetails.getStatus());
        
        Risk updated = riskRepository.save(risk);

        // Log action
        auditActionLogRepository.save(AuditActionLog.builder()
                .entityType("RISK")
                .entityId(id)
                .actionType("UPDATED")
                .performedBy(userId)
                .details("Risk details updated")
                .projectId(risk.getProjectId())
                .build());

        return updated;
    }

    @Transactional
    public void deleteRisk(UUID id, UUID userId) {
        Risk risk = riskRepository.findById(id).orElse(null);
        if (risk != null) {
            // Log action before deletion
            auditActionLogRepository.save(AuditActionLog.builder()
                    .entityType("RISK")
                    .entityId(id)
                    .actionType("DELETED")
                    .performedBy(userId)
                    .details("Risk deleted: " + risk.getTitle())
                    .projectId(risk.getProjectId())
                    .build());
            
            auditTaskService.deleteTasksByRiskId(id);
            riskRepository.deleteById(id);
        }
    }

    private void createTaskForRisk(Risk risk) {
        projectRepository.findById(risk.getProjectId()).ifPresent(project -> {
            auditTaskService.createTask(
                "Address Risk: " + risk.getTitle(),
                "Please review and address the following risk: " + risk.getDescription(),
                project.getProjectOwnerId(),
                risk.getProjectId(),
                risk.getId(),
                null
            );
        });
    }

    private void notifyProjectOwner(Risk risk) {
        projectRepository.findById(risk.getProjectId()).ifPresent(project -> {
            if (project.getProjectOwnerId() != null) {
                userRepository.findById(project.getProjectOwnerId()).ifPresent(owner -> {
                    if (owner.getEmail() != null) {
                        String subject = "New Risk Created: " + risk.getTitle();
                        String message = "A new risk has been identified in your project: " + risk.getTitle() + 
                                         "\nSeverity: " + risk.getSeverity() + 
                                         "\nDescription: " + risk.getDescription();
                        emailService.sendEmail(owner.getEmail(), subject, message);
                    }
                });
            }
        });
    }
}
