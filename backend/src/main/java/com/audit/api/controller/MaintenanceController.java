package com.audit.api.controller;

import com.audit.api.entity.Vendor;
import com.audit.api.repository.VendorRepository;
import com.audit.api.service.ChecklistSeederService;
import com.audit.api.service.GstVerificationService;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/maintenance")
public class MaintenanceController {

    private final ChecklistSeederService checklistSeederService;
    private final GstVerificationService gstVerificationService;
    private final VendorRepository vendorRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public MaintenanceController(ChecklistSeederService checklistSeederService,
                                  GstVerificationService gstVerificationService,
                                  VendorRepository vendorRepository,
                                  SecurityUtils securityUtils) {
        this.checklistSeederService = checklistSeederService;
        this.gstVerificationService = gstVerificationService;
        this.vendorRepository = vendorRepository;
        this.securityUtils = securityUtils;
    }

    /** Seed default categories, checklist templates for the current org */
    @PostMapping("/seed-master-data")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> seedMasterData() {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        if (orgId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        try {
            checklistSeederService.seedOrganizationData(orgId);
            return ResponseEntity.ok(Map.of("message", "Master data seeded successfully."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error seeding data: " + e.getMessage()));
        }
    }

    /** Re-run GST verification and identity matching for all verified vendors */
    @PostMapping("/re-verify-identities")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reVerifyIdentities() {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Vendor> vendors = vendorRepository.findAllByOrganizationId(orgId).stream()
                .filter(v -> v.getGstNumber() != null && !v.getGstNumber().isBlank())
                .toList();
        for (Vendor v : vendors) {
            gstVerificationService.verifyAndUpdate(v);
            vendorRepository.save(v);
        }
        return ResponseEntity.ok(Map.of("message", "Re-verified " + vendors.size() + " vendors."));
    }
}
