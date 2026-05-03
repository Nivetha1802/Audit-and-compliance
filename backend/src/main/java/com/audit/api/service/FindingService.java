package com.audit.api.service;

import com.audit.api.entity.Finding;
import com.audit.api.repository.FindingRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class FindingService {

    private final FindingRepository findingRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public FindingService(FindingRepository findingRepository, SecurityUtils securityUtils) {
        this.findingRepository = findingRepository;
        this.securityUtils = securityUtils;
    }

    public List<Finding> getAllFindings() {
        return findingRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId());
    }

    public List<Finding> getFindingsByTransaction(UUID transactionId) {
        return findingRepository.findByOrganizationIdAndTransactionId(securityUtils.getCurrentOrganizationId(), transactionId);
    }

    public Finding createFinding(Finding finding) {
        finding.setOrganizationId(securityUtils.getCurrentOrganizationId());
        finding.setStatus("OPEN");
        return findingRepository.save(finding);
    }

    public Finding updateStatus(UUID id, String status) {
        Finding finding = findingRepository.findById(id)
                .filter(f -> f.getOrganizationId().equals(securityUtils.getCurrentOrganizationId()))
                .orElseThrow(() -> new RuntimeException("Finding not found"));

        finding.setStatus(status);
        return findingRepository.save(finding);
    }
}
