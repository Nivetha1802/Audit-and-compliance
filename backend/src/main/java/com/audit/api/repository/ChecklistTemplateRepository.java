package com.audit.api.repository;

import com.audit.api.entity.ChecklistTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChecklistTemplateRepository extends JpaRepository<ChecklistTemplate, UUID> {
    List<ChecklistTemplate> findByOrganizationId(UUID organizationId);
    java.util.Optional<ChecklistTemplate> findByCategoryId(UUID categoryId);
}
