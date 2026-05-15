package com.audit.api.repository;

import com.audit.api.entity.AuditTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface AuditTaskRepository extends JpaRepository<AuditTask, UUID> {
    List<AuditTask> findByOrganizationId(UUID organizationId);
    List<AuditTask> findByOrganizationIdAndAssignedTo(UUID organizationId, UUID assignedTo);
    List<AuditTask> findByOrganizationIdAndStatus(UUID organizationId, String status);
    List<AuditTask> findByOrganizationIdAndTransactionId(UUID organizationId, UUID transactionId);

    @Query("SELECT COUNT(t) FROM AuditTask t WHERE t.organizationId = :orgId AND t.status NOT IN ('COMPLETED','REJECTED')")
    long countOpenByOrganizationId(@Param("orgId") UUID orgId);
    
    List<AuditTask> findByProjectId(UUID projectId);
    List<AuditTask> findByRiskId(UUID riskId);

    @Modifying
    @Transactional
    void deleteByRiskId(UUID riskId);

    List<AuditTask> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title, String description);
}
