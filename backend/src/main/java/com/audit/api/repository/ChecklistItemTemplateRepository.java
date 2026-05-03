package com.audit.api.repository;

import com.audit.api.entity.ChecklistItemTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChecklistItemTemplateRepository extends JpaRepository<ChecklistItemTemplate, UUID> {
    List<ChecklistItemTemplate> findByTemplateId(UUID templateId);
}
