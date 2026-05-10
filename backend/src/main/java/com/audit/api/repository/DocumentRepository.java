package com.audit.api.repository;

import com.audit.api.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    java.util.List<Document> findByOrganizationId(UUID organizationId);
}
