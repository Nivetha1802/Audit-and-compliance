package com.audit.api.controller;

import com.audit.api.dto.CategoryTreeRequest;
import com.audit.api.entity.MasterCategory;
import com.audit.api.repository.MasterCategoryRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/master-categories")
public class MasterCategoryController {

    private final MasterCategoryRepository masterCategoryRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public MasterCategoryController(MasterCategoryRepository masterCategoryRepository,
                                    SecurityUtils securityUtils) {
        this.masterCategoryRepository = masterCategoryRepository;
        this.securityUtils = securityUtils;
    }

    /** Returns all categories (L1 + L2 + L3) for the org, flat list. */
    @GetMapping
    public ResponseEntity<List<MasterCategory>> getAll() {
        return ResponseEntity.ok(
                masterCategoryRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId()));
    }

    /** Returns only L1 categories. */
    @GetMapping("/l1")
    public ResponseEntity<List<MasterCategory>> getL1() {
        return ResponseEntity.ok(
                masterCategoryRepository.findByOrganizationIdAndLevel(
                        securityUtils.getCurrentOrganizationId(), 1));
    }

    /** Returns children of a given parent. */
    @GetMapping("/{parentId}/children")
    public ResponseEntity<List<MasterCategory>> getChildren(@PathVariable UUID parentId) {
        return ResponseEntity.ok(
                masterCategoryRepository.findByOrganizationIdAndParentId(
                        securityUtils.getCurrentOrganizationId(), parentId));
    }

    /**
     * Replaces the entire category tree for the org (3 levels).
     */
    @PostMapping("/tree")
    @Transactional
    public ResponseEntity<List<MasterCategory>> saveTree(@RequestBody CategoryTreeRequest request) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        // Clear existing
        masterCategoryRepository.deleteByOrganizationId(orgId);

        List<MasterCategory> saved = new ArrayList<>();

        if (request.getCategories() != null) {
            for (CategoryTreeRequest.L1Category l1Req : request.getCategories()) {
                MasterCategory l1 = new MasterCategory(l1Req.getName(), orgId);
                l1 = masterCategoryRepository.save(l1);
                saved.add(l1);

                if (l1Req.getChildren() != null) {
                    for (CategoryTreeRequest.L2Category l2Req : l1Req.getChildren()) {
                        MasterCategory l2 = new MasterCategory(l2Req.getName(), l1.getId(), 2, orgId);
                        l2 = masterCategoryRepository.save(l2);
                        saved.add(l2);

                        if (l2Req.getChildren() != null) {
                            for (String l3Name : l2Req.getChildren()) {
                                MasterCategory l3 = new MasterCategory(l3Name, l2.getId(), 3, orgId);
                                saved.add(masterCategoryRepository.save(l3));
                            }
                        }
                    }
                }
            }
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        MasterCategory cat = masterCategoryRepository.findById(id).orElse(null);
        if (cat != null) {
            // If L1, delete L2s and L3s
            if (cat.getLevel() == 1) {
                List<MasterCategory> l2s = masterCategoryRepository.findByOrganizationIdAndParentId(cat.getOrganizationId(), id);
                for (MasterCategory l2 : l2s) {
                    masterCategoryRepository.deleteAll(
                            masterCategoryRepository.findByOrganizationIdAndParentId(cat.getOrganizationId(), l2.getId()));
                }
                masterCategoryRepository.deleteAll(l2s);
            } 
            // If L2, delete L3s
            else if (cat.getLevel() == 2) {
                masterCategoryRepository.deleteAll(
                        masterCategoryRepository.findByOrganizationIdAndParentId(cat.getOrganizationId(), id));
            }
        }
        masterCategoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
