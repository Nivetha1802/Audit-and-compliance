package com.audit.api.repository;

import com.audit.api.entity.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, UUID> {
    List<ChecklistItem> findByChecklistId(UUID checklistId);
    long countByChecklistId(UUID checklistId);
    long countByChecklistIdAndProvided(UUID checklistId, boolean provided);
    long countByChecklistIdAndMandatory(UUID checklistId, boolean mandatory);
    long countByChecklistIdAndMandatoryAndProvided(UUID checklistId, boolean mandatory, boolean provided);
}
