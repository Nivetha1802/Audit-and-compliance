package com.audit.api.repository;

import com.audit.api.entity.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChecklistRepository extends JpaRepository<Checklist, UUID> {
    Optional<Checklist> findByTransactionId(UUID transactionId);
    List<Checklist> findByOrganizationId(UUID organizationId);
}
