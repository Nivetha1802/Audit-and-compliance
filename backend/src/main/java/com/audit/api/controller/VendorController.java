package com.audit.api.controller;

import com.audit.api.entity.Vendor;
import com.audit.api.repository.VendorRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vendors")
public class VendorController {
    @Autowired
    private com.audit.api.service.GstVerificationService gstVerificationService;

    private final VendorRepository vendorRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public VendorController(VendorRepository vendorRepository, SecurityUtils securityUtils) {
        this.vendorRepository = vendorRepository;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<List<Vendor>> getAllVendors() {
        return ResponseEntity.ok(vendorRepository.findAllByOrganizationId(securityUtils.getCurrentOrganizationId()));
    }

    // @PostMapping
    // public ResponseEntity<Vendor> createVendor(@RequestBody Vendor vendor) {
    @PostMapping
    public ResponseEntity<Vendor> createVendor(@RequestBody Vendor vendor) {
        vendor.setOrganizationId(securityUtils.getCurrentOrganizationId());
        
        // Auto-verify GST if present
        if (vendor.getGstNumber() != null && !vendor.getGstNumber().isEmpty()) {
            gstVerificationService.verifyAndUpdate(vendor);
        }
        
        return ResponseEntity.ok(vendorRepository.save(vendor));
    }
    @PutMapping("/{id}")
    public ResponseEntity<Vendor> updateVendor(
            @PathVariable UUID id,
            @RequestBody Vendor vendorDetails) {

        UUID orgId = securityUtils.getCurrentOrganizationId();

        return vendorRepository.findById(id)
                .filter(v -> v.getOrganizationId().equals(orgId))
                .map(v -> {

                boolean gstChanged =
                        vendorDetails.getGstNumber() != null &&
                        !vendorDetails.getGstNumber().equals(v.getGstNumber());

                v.setCustomVendorId(vendorDetails.getCustomVendorId());
                v.setName(vendorDetails.getName());
                v.setVendorType(vendorDetails.getVendorType());
                v.setCategory(vendorDetails.getCategory());
                v.setGstNumber(vendorDetails.getGstNumber());
                v.setPan(vendorDetails.getPan());
                v.setBankAccountDetails(vendorDetails.getBankAccountDetails());
                v.setContactDetails(vendorDetails.getContactDetails());

                if (gstChanged &&
                        v.getGstNumber() != null &&
                        !v.getGstNumber().isEmpty()) {

                    gstVerificationService.verifyAndUpdate(v);
                }

                return ResponseEntity.ok(vendorRepository.save(v));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVendor(@PathVariable UUID id) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        return vendorRepository.findById(id)
                .filter(v -> v.getOrganizationId().equals(orgId))
                .map(v -> {
                    vendorRepository.delete(v);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/verify-gst")
    public ResponseEntity<Vendor> verifyGst(@PathVariable UUID id) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        return vendorRepository.findById(id)
                .filter(v -> v.getOrganizationId().equals(orgId))
                .map(v -> {
                    if (v.getGstNumber() != null && !v.getGstNumber().isEmpty()) {
                        gstVerificationService.verifyAndUpdate(v);
                        return ResponseEntity.ok(vendorRepository.save(v));
                    }
                    return ResponseEntity.badRequest().<Vendor>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
