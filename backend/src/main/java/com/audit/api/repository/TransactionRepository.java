package com.audit.api.repository;

import com.audit.api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByOrganizationId(UUID organizationId);
    List<Transaction> findByOrganizationIdAndProjectId(UUID organizationId, UUID projectId);
    List<Transaction> findByProjectId(UUID projectId);
    List<Transaction> findByOrganizationIdAndSource(UUID organizationId, String source);
    List<Transaction> findByOrganizationIdAndProjectIdAndSource(UUID organizationId, UUID projectId, String source);
}
