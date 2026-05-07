package com.audit.api.repository;

import com.audit.api.entity.Finding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FindingRepository extends JpaRepository<Finding, UUID> {
    List<Finding> findByOrganizationId(UUID organizationId);
    List<Finding> findByOrganizationIdAndTransactionId(UUID organizationId, UUID transactionId);

    @Query("SELECT COUNT(f) FROM Finding f JOIN Transaction t ON f.transactionId = t.id WHERE t.projectId = :projectId AND f.status = :status")
    long countByProjectIdAndStatus(UUID projectId, String status);
}
