package com.audit.api.service;

import com.audit.api.entity.Project;
import com.audit.api.repository.ProjectRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public ProjectService(ProjectRepository projectRepository, SecurityUtils securityUtils) {
        this.projectRepository = projectRepository;
        this.securityUtils = securityUtils;
    }

    public List<Project> getAllProjects() {
        return projectRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public Project createProject(Project project) {
        project.setOrganizationId(securityUtils.getCurrentOrganizationId());
        project.setStatus("ACTIVE");
        return projectRepository.save(project);
    }

    public Project getProject(UUID id) {
        return projectRepository.findById(id)
                .filter(p -> p.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public Project updateProject(UUID id, Project updates) {
        Project project = getProject(id);
        project.setName(updates.getName());
        project.setProjectCode(updates.getProjectCode());
        project.setDescription(updates.getDescription());
        project.setStartDate(updates.getStartDate());
        project.setEndDate(updates.getEndDate());
        project.setTotalBudget(updates.getTotalBudget());
        project.setCategories(updates.getCategories());
        project.setProjectOwnerId(updates.getProjectOwnerId());
        project.setAuditorId(updates.getAuditorId());
        if (updates.getStatus() != null) project.setStatus(updates.getStatus());
        return projectRepository.save(project);
    }
}
