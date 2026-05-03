package com.audit.api.repository;

import com.audit.api.entity.MasterCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface MasterCategoryRepository extends JpaRepository<MasterCategory, UUID> {
    List<MasterCategory> findByOrganizationId(UUID organizationId);
    List<MasterCategory> findByOrganizationIdAndLevel(UUID organizationId, int level);
    List<MasterCategory> findByOrganizationIdAndParentId(UUID organizationId, UUID parentId);

    @Modifying
    @Query("DELETE FROM MasterCategory m WHERE m.organizationId = :orgId")
    void deleteByOrganizationId(@Param("orgId") UUID orgId);
}
