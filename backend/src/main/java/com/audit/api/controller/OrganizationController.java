package com.audit.api.controller;

import com.audit.api.entity.Organization;
import com.audit.api.repository.OrganizationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {

    private static final String GST_REGEX =
            "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$";

    private final OrganizationRepository organizationRepository;

    @Autowired
    public OrganizationController(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @GetMapping("/public/list")
    public ResponseEntity<List<Organization>> getAllOrganizations() {
        return ResponseEntity.ok(organizationRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Organization> getOrganization(@PathVariable UUID id) {
        return organizationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Organization> updateOrganization(@PathVariable UUID id,
                                                           @RequestBody Organization orgDetails) {
        return organizationRepository.findById(id)
                .map(org -> {
                    org.setName(orgDetails.getName());
                    org.setAddress(orgDetails.getAddress());
                    org.setContactEmail(orgDetails.getContactEmail());
                    if (orgDetails.getTaxId() != null && !orgDetails.getTaxId().isBlank()) {
                        if (!orgDetails.getTaxId().matches(GST_REGEX)) {
                            throw new RuntimeException("Invalid GST format. Expected 15-character alphanumeric GST number.");
                        }
                        org.setTaxId(orgDetails.getTaxId());
                    }
                    org.setIndustry(orgDetails.getIndustry());
                    org.setCountry(orgDetails.getCountry());
                    org.setFyStart(orgDetails.getFyStart());
                    return ResponseEntity.ok(organizationRepository.save(org));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
