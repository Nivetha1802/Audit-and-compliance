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

    @GetMapping("/transaction/{transactionId}")
    public List<Risk> getRisksByTransaction(@PathVariable UUID transactionId) {
        return riskService.getRisksByTransaction(transactionId);
    }

    @PostMapping
    public Risk createRisk(@RequestBody Risk risk) {
        return riskService.createRisk(risk);
    }

    @PutMapping("/{id}")
    public Risk updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        return riskService.updateStatus(id, payload.get("status"));
    }
}
