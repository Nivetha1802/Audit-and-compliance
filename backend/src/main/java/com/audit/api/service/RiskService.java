package com.audit.api.service;

import com.audit.api.entity.Risk;
import com.audit.api.entity.Project;
import com.audit.api.entity.User;
import com.audit.api.repository.RiskRepository;
import com.audit.api.repository.ProjectRepository;
import com.audit.api.repository.UserRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RiskService {

    private final RiskRepository riskRepository;
    private final ProjectRepository projectRepository;
    private final AuditTaskService auditTaskService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SecurityUtils securityUtils;

    public RiskService(
            RiskRepository riskRepository,
            ProjectRepository projectRepository,
            AuditTaskService auditTaskService,
            UserRepository userRepository,
            EmailService emailService,
            SecurityUtils securityUtils) {
        this.riskRepository = riskRepository;
        this.projectRepository = projectRepository;
        this.auditTaskService = auditTaskService;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.securityUtils = securityUtils;
    }

    public List<Risk> getAllRisks() {
        return riskRepository.findAll();
    }

    @Transactional
    public Risk createRisk(Risk risk) {
        risk.setStatus("OPEN");
        User currentUser = securityUtils.getCurrentUser();
        if (currentUser != null) {
            risk.setRiskCreatorId(currentUser.getId());
            risk.setOrganizationId(currentUser.getOrganizationId());
        }
        Risk savedRisk = riskRepository.save(risk);
        
        if (risk.getProjectId() != null) {
            Project project = projectRepository.findById(risk.getProjectId()).orElse(null);
            if (project != null && project.getProjectOwnerId() != null) {
                createTaskForRisk(savedRisk, project);
            }
        }
        
        return savedRisk;
    }

    private void createTaskForRisk(Risk risk, Project project) {
        auditTaskService.createTask(
            "Action Required: " + risk.getTitle(),
            "A new risk has been identified for project: " + project.getName() + ". Description: " + risk.getDescription(),
            project.getProjectOwnerId(),
            risk.getProjectId(),
            risk.getId()
        );

        User owner = userRepository.findById(project.getProjectOwnerId()).orElse(null);
        if (owner != null && owner.getEmail() != null) {
            emailService.sendEmail(
                owner.getEmail(),
                "New Risk Identified: " + risk.getTitle(),
                "Hello " + owner.getFullName() + ",\n\nA new risk has been raised for your project: " + project.getName() + 
                ".\n\nRisk Title: " + risk.getTitle() + 
                "\nSeverity: " + risk.getSeverity() +
                "\n\nA task has been automatically assigned to you to address this risk."
            );
        }
    }

    @Transactional
    public Risk updateStatus(UUID id, String status) {
        Risk risk = riskRepository.findById(id).orElseThrow(() -> new RuntimeException("Risk not found"));
        String oldStatus = risk.getStatus();
        risk.setStatus(status);
        Risk updatedRisk = riskRepository.save(risk);

        if ("OPEN".equals(status) && "CLOSED".equals(oldStatus)) {
            Project project = projectRepository.findById(risk.getProjectId()).orElse(null);
            if (project != null) {
                createTaskForRisk(updatedRisk, project);
            }
        }

        return updatedRisk;
    }

    public List<Risk> getRisksByTransaction(UUID transactionId) {
        return riskRepository.findAll().stream()
            .filter(r -> transactionId.equals(r.getTransactionId()))
            .toList();
    }
}
