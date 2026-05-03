package com.audit.api.service;

import com.audit.api.entity.MasterCategory;
import com.audit.api.entity.Transaction;
import com.audit.api.repository.MasterCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Auto-categorizes a transaction by matching its categoryName, subcategory,
 * or description against the org's MasterCategory tree.
 *
 * Matching priority:
 *  1. Exact match on L2 name  → set categoryId = L2.id, subcategory = L2.name
 *  2. Exact match on L1 name  → set categoryId = L1.id, subcategory = L1.name
 *  3. Keyword match in description against L2 names
 *  4. Keyword match in description against L1 names
 *  5. No match → leave categoryId null, tag as "Uncategorized"
 */
@Service
public class CategoryMappingService {

    private final MasterCategoryRepository masterCategoryRepository;

    @Autowired
    public CategoryMappingService(MasterCategoryRepository masterCategoryRepository) {
        this.masterCategoryRepository = masterCategoryRepository;
    }

    public void autoTag(Transaction tx, UUID orgId) {
        List<MasterCategory> all = masterCategoryRepository.findByOrganizationId(orgId);
        if (all.isEmpty()) return;

        List<MasterCategory> l2 = all.stream().filter(c -> c.getLevel() == 2).toList();
        List<MasterCategory> l1 = all.stream().filter(c -> c.getLevel() == 1).toList();

        String haystack = buildHaystack(tx);

        // 1. Exact L2 match
        for (MasterCategory cat : l2) {
            if (matches(haystack, cat.getName())) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(getL1Name(l1, cat.getParentId()));
                tx.setSubcategory(cat.getName());
                return;
            }
        }

        // 2. Exact L1 match
        for (MasterCategory cat : l1) {
            if (matches(haystack, cat.getName())) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(cat.getName());
                tx.setSubcategory(null);
                return;
            }
        }

        // 3. Keyword L2 match (description contains category keyword)
        String desc = tx.getDescription() != null ? tx.getDescription().toLowerCase() : "";
        for (MasterCategory cat : l2) {
            String keyword = cat.getName().toLowerCase().replaceAll("[^a-z0-9 ]", "");
            if (!keyword.isBlank() && desc.contains(keyword)) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(getL1Name(l1, cat.getParentId()));
                tx.setSubcategory(cat.getName());
                return;
            }
        }

        // 4. Keyword L1 match
        for (MasterCategory cat : l1) {
            String keyword = cat.getName().toLowerCase().replaceAll("[^a-z0-9 ]", "");
            if (!keyword.isBlank() && desc.contains(keyword)) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(cat.getName());
                tx.setSubcategory(null);
                return;
            }
        }

        // 5. No match
        if (tx.getCategoryName() == null || tx.getCategoryName().isBlank()) {
            tx.setCategoryName("Uncategorized");
        }
    }

    private String buildHaystack(Transaction tx) {
        return String.join(" ",
                nvl(tx.getCategoryName()),
                nvl(tx.getSubcategory()),
                nvl(tx.getLedgerName()),
                nvl(tx.getDescription())
        ).toLowerCase();
    }

    private boolean matches(String haystack, String categoryName) {
        return haystack.contains(categoryName.toLowerCase());
    }

    private String getL1Name(List<MasterCategory> l1List, UUID parentId) {
        if (parentId == null) return null;
        return l1List.stream()
                .filter(c -> c.getId().equals(parentId))
                .map(MasterCategory::getName)
                .findFirst().orElse(null);
    }

    private String nvl(String s) { return s != null ? s : ""; }
}
