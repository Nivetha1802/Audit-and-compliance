package com.audit.api.repository;

import com.audit.api.entity.AuditActionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AuditActionLogRepository extends JpaRepository<AuditActionLog, UUID> {
    List<AuditActionLog> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    List<AuditActionLog> findByEntityIdOrderByCreatedAtDesc(UUID entityId);
}
