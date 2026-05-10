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

        List<MasterCategory> l3 = all.stream().filter(c -> c.getLevel() == 3).toList();
        List<MasterCategory> l2 = all.stream().filter(c -> c.getLevel() == 2).toList();
        List<MasterCategory> l1 = all.stream().filter(c -> c.getLevel() == 1).toList();

        // If the CSV already provided both categoryName and subcategory, just resolve the categoryId
        // and don't overwrite the human-provided values
        boolean hasCategory   = tx.getCategoryName() != null && !tx.getCategoryName().isBlank();
        boolean hasSubcategory = tx.getSubcategory() != null && !tx.getSubcategory().isBlank();

        if (hasCategory && hasSubcategory) {
            // Try to resolve categoryId from the existing subcategory value
            resolveIdOnly(tx, l1, l2, l3);
            return;
        }

        String haystack = buildHaystack(tx);

        // 1. Exact L3 match → categoryName = L1, subcategory = L3
        for (MasterCategory cat : l3) {
            if (matches(haystack, cat.getName())) {
                MasterCategory parent = l2.stream().filter(c -> c.getId().equals(cat.getParentId())).findFirst().orElse(null);
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(parent != null ? getL1Name(l1, parent.getParentId()) : null);
                if (!hasSubcategory) tx.setSubcategory(cat.getName());
                return;
            }
        }

        // 2. Exact L2 match → categoryName = L1, subcategory = L2
        for (MasterCategory cat : l2) {
            if (matches(haystack, cat.getName())) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(getL1Name(l1, cat.getParentId()));
                if (!hasSubcategory) tx.setSubcategory(cat.getName());
                return;
            }
        }

        // 3. Exact L1 match → categoryName = L1, subcategory unchanged
        for (MasterCategory cat : l1) {
            if (matches(haystack, cat.getName())) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(cat.getName());
                return;
            }
        }

        // 4. Keyword match in description against L2
        String desc = tx.getDescription() != null ? tx.getDescription().toLowerCase() : "";
        for (MasterCategory cat : l2) {
            String keyword = cat.getName().toLowerCase().replaceAll("[^a-z0-9 ]", "");
            if (!keyword.isBlank() && desc.contains(keyword)) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(getL1Name(l1, cat.getParentId()));
                if (!hasSubcategory) tx.setSubcategory(cat.getName());
                return;
            }
        }

        // 5. Keyword match in description against L1
        for (MasterCategory cat : l1) {
            String keyword = cat.getName().toLowerCase().replaceAll("[^a-z0-9 ]", "");
            if (!keyword.isBlank() && desc.contains(keyword)) {
                tx.setCategoryId(cat.getId());
                tx.setCategoryName(cat.getName());
                return;
            }
        }

        // 6. No match
        if (!hasCategory) {
            tx.setCategoryName("Uncategorized");
        }
    }

    /** Only resolve categoryId without changing categoryName or subcategory */
    private void resolveIdOnly(Transaction tx, List<MasterCategory> l1,
                                List<MasterCategory> l2, List<MasterCategory> l3) {
        String sub = tx.getSubcategory().toLowerCase();
        // Try L3 first
        for (MasterCategory cat : l3) {
            if (cat.getName().equalsIgnoreCase(tx.getSubcategory())) {
                tx.setCategoryId(cat.getId()); return;
            }
        }
        // Try L2
        for (MasterCategory cat : l2) {
            if (cat.getName().equalsIgnoreCase(tx.getSubcategory())) {
                tx.setCategoryId(cat.getId()); return;
            }
        }
        // Try L1 via categoryName
        for (MasterCategory cat : l1) {
            if (cat.getName().equalsIgnoreCase(tx.getCategoryName())) {
                tx.setCategoryId(cat.getId()); return;
            }
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
