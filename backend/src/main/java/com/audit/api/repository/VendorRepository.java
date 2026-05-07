package com.audit.api.repository;

import com.audit.api.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {
    List<Vendor> findAllByOrganizationId(UUID organizationId);
}
