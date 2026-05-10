package com.audit.api.controller;

import com.audit.api.service.ChecklistSeederService;
import com.audit.api.service.GstVerificationService;
import com.audit.api.entity.Vendor;
import com.audit.api.repository.VendorRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.jdbc.core.JdbcTemplate;

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
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public MaintenanceController(
            ChecklistSeederService checklistSeederService,
            GstVerificationService gstVerificationService,
            VendorRepository vendorRepository,
            SecurityUtils securityUtils,
            JdbcTemplate jdbcTemplate) {
        this.checklistSeederService = checklistSeederService;
        this.gstVerificationService = gstVerificationService;
        this.vendorRepository = vendorRepository;
        this.securityUtils = securityUtils;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping("/seed-master-data")
    public ResponseEntity<?> seedMasterData() {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        checklistSeederService.seedOrganizationData(orgId);
        return ResponseEntity.ok(Map.of("message", "Master data seeded successfully for organization: " + orgId));
    }

    @PostMapping("/re-verify-identities")
    public ResponseEntity<?> reVerifyIdentities() {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        List<Vendor> verifiedVendors = vendorRepository.findAllByOrganizationId(orgId)
                .stream()
                .filter(Vendor::getIsGstVerified)
                .toList();

        for (Vendor v : verifiedVendors) {
            gstVerificationService.verifyAndUpdate(v);
            vendorRepository.save(v);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Re-verified identities for " + verifiedVendors.size() + " vendors",
            "count", verifiedVendors.size()
        ));
    }

    @PostMapping("/sync-schema")
    public ResponseEntity<?> syncSchema() {
        try {
            // Add missing columns to vendors table if they don't exist
            String[] columns = {
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT TRUE",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255)",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255)",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_status VARCHAR(255)",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS registration_date VARCHAR(255)",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_address VARCHAR(255)",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_gst_verified BOOLEAN DEFAULT FALSE",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS risk_level VARCHAR(255) DEFAULT 'LOW'",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS identity_match_score DOUBLE PRECISION DEFAULT 0",
                "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS identity_status VARCHAR(255)"
            };

            for (String sql : columns) {
                jdbcTemplate.execute(sql);
            }

            return ResponseEntity.ok(Map.of("message", "Schema synchronized successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
