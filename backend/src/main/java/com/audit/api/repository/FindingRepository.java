package com.audit.api.repository;

import com.audit.api.entity.Finding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FindingRepository extends JpaRepository<Finding, UUID> {
    List<Finding> findByOrganizationId(UUID organizationId);
    List<Finding> findByOrganizationIdAndTransactionId(UUID organizationId, UUID transactionId);
}
