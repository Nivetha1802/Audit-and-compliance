package com.audit.api.service;

import com.audit.api.entity.MasterCategory;
import com.audit.api.entity.Project;
import com.audit.api.entity.Role;
import com.audit.api.entity.User;
import com.audit.api.repository.MasterCategoryRepository;
import com.audit.api.repository.ProjectRepository;
import com.audit.api.repository.UserRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final MasterCategoryRepository masterCategoryRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public ProjectService(ProjectRepository projectRepository,
                          MasterCategoryRepository masterCategoryRepository,
                          UserRepository userRepository,
                          SecurityUtils securityUtils) {
        this.projectRepository = projectRepository;
        this.masterCategoryRepository = masterCategoryRepository;
        this.userRepository = userRepository;
        this.securityUtils = securityUtils;
    }

    public List<Project> getAllProjects() {
        return projectRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    private void validateProjectOwner(UUID ownerId) {
        if (ownerId != null) {
            User owner = userRepository.findById(ownerId)
                    .orElseThrow(() -> new RuntimeException("Project owner not found"));
            if (owner.getRole() != Role.ADMIN && owner.getRole() != Role.FINANCE_MANAGER) {
                throw new RuntimeException("Only an Admin or Finance Manager can be a Project Owner");
            }
        }
    }

    public Project createProject(Project project) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        project.setOrganizationId(orgId);
        project.setStatus("ACTIVE");
        
        validateProjectOwner(project.getProjectOwnerId());

        // Auto-populate categories from all L1 org categories
        if (project.getCategories() == null || project.getCategories().isBlank()) {
            String allCategories = masterCategoryRepository
                    .findByOrganizationIdAndLevel(orgId, 1)
                    .stream()
                    .map(MasterCategory::getName)
                    .collect(Collectors.joining(","));
            project.setCategories(allCategories.isBlank() ? "All" : allCategories);
        }

        return projectRepository.save(project);
    }

    public Project getProject(UUID id) {
        return projectRepository.findById(id)
                .filter(p -> p.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public Project updateProject(UUID id, Project updates) {
        Project project = getProject(id);
        
        validateProjectOwner(updates.getProjectOwnerId());

        project.setName(updates.getName());
        project.setProjectCode(updates.getProjectCode());
        project.setDescription(updates.getDescription());
        project.setStartDate(updates.getStartDate());
        project.setEndDate(updates.getEndDate());
        project.setTotalBudget(updates.getTotalBudget());
        project.setUnitsProposed(updates.getUnitsProposed());
        project.setProjectOwnerId(updates.getProjectOwnerId());
        project.setAuditorId(updates.getAuditorId());
        if (updates.getStatus() != null) project.setStatus(updates.getStatus());
        return projectRepository.save(project);
    }

    public Project updateAuditStatus(UUID id, String status) {
        Project project = getProject(id);
        project.setAuditStatus(status);
        return projectRepository.save(project);
    }
}
