package com.audit.api.repository;

import com.audit.api.entity.Risk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RiskRepository extends JpaRepository<Risk, UUID> {
    List<Risk> findByOrganizationId(UUID organizationId);
    List<Risk> findByProjectId(UUID projectId);
    List<Risk> findByOrganizationIdAndTransactionId(UUID organizationId, UUID transactionId);
    long countByProjectIdAndStatus(UUID projectId, String status);
}
