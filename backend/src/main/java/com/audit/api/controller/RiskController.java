package com.audit.api.controller;

import com.audit.api.entity.Risk;
import com.audit.api.service.RiskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/risks")
@CrossOrigin(origins = "*")
public class RiskController {

    private final RiskService riskService;

    @Autowired
    public RiskController(RiskService riskService) {
        this.riskService = riskService;
    }

    @GetMapping
    public List<Risk> getAllRisks() {
        return riskService.getAllRisks();
    }

    @GetMapping("/project/{projectId}")
    public List<Risk> getRisksByProject(@PathVariable UUID projectId) {
        return riskService.getRisksByProject(projectId);
    }

    @PostMapping
    public Risk createRisk(@RequestBody Risk risk) {
        return riskService.createRisk(risk);
    }

    @PutMapping("/{id}")
    public Risk updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String userIdStr = payload.get("userId");
        UUID userId = (userIdStr != null) ? UUID.fromString(userIdStr) : null;
        return riskService.updateStatus(id, payload.get("status"), userId);
    }

    @DeleteMapping("/{id}")
    public void deleteRisk(@PathVariable UUID id, @RequestParam(required = false) UUID userId) {
        riskService.deleteRisk(id, userId);
    }
}
