package com.audit.api.controller;

import com.audit.api.service.ChecklistSeederService;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/maintenance")
public class MaintenanceController {

    private final ChecklistSeederService checklistSeederService;
    private final SecurityUtils securityUtils;

    @Autowired
    public MaintenanceController(ChecklistSeederService checklistSeederService, SecurityUtils securityUtils) {
        this.checklistSeederService = checklistSeederService;
        this.securityUtils = securityUtils;
    }

    @PostMapping("/seed-master-data")
    public ResponseEntity<?> seedMasterData() {
        UUID organizationId = securityUtils.getCurrentOrganizationId();
        if (organizationId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        try {
            checklistSeederService.seedOrganizationData(organizationId);
            return ResponseEntity.ok(Map.of("message", "Master data seeded successfully."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error seeding data: " + e.getMessage()));
        }
    }
}
