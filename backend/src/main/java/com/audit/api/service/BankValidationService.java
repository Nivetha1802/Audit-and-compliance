package com.audit.api.service;

import com.audit.api.entity.MasterCategory;
import com.audit.api.entity.Transaction;
import com.audit.api.entity.Vendor;
import com.audit.api.repository.ChecklistItemRepository;
import com.audit.api.repository.ChecklistRepository;
import com.audit.api.repository.MasterCategoryRepository;
import com.audit.api.repository.VendorRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BankValidationService {

    private final VendorRepository vendorRepository;
    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final MasterCategoryRepository masterCategoryRepository;

    public BankValidationService(VendorRepository vendorRepository,
                                 ChecklistRepository checklistRepository,
                                 ChecklistItemRepository checklistItemRepository,
                                 MasterCategoryRepository masterCategoryRepository) {
        this.vendorRepository = vendorRepository;
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.masterCategoryRepository = masterCategoryRepository;
    }

    /**
     * Resolve the L1 root category name for a given category/subcategory name.
     * Walks up the master category tree: if the name matches an L2, returns its L1 parent name.
     * If it matches an L1 directly, returns that name.
     * Falls back to the raw categoryName if nothing matches.
     */
    private String resolveL1Category(String categoryName, String subcategory, UUID orgId) {
        if (orgId == null) return categoryName != null ? categoryName : "";

        List<MasterCategory> all = masterCategoryRepository.findByOrganizationId(orgId);
        Map<UUID, MasterCategory> byId = all.stream()
                .collect(Collectors.toMap(MasterCategory::getId, c -> c));

        // Build a lookup: name (lowercase) -> category
        Map<String, MasterCategory> byName = new HashMap<>();
        for (MasterCategory c : all) {
            byName.put(c.getName().toLowerCase().trim(), c);
        }

        // Try to resolve subcategory first (it's more specific)
        String probe = subcategory != null && !subcategory.isBlank() ? subcategory.trim() : null;
        if (probe != null) {
            MasterCategory found = byName.get(probe.toLowerCase());
            if (found != null && found.getLevel() == 2 && found.getParentId() != null) {
                MasterCategory parent = byId.get(found.getParentId());
                if (parent != null) return parent.getName();
            }
            if (found != null && found.getLevel() == 1) return found.getName();
        }

        // Fall back to categoryName
        if (categoryName != null && !categoryName.isBlank()) {
            MasterCategory found = byName.get(categoryName.toLowerCase().trim());
            if (found != null && found.getLevel() == 1) return found.getName();
            if (found != null && found.getLevel() == 2 && found.getParentId() != null) {
                MasterCategory parent = byId.get(found.getParentId());
                if (parent != null) return parent.getName();
            }
            // If not found in master categories, return as-is (handles "Expense", "Revenue", "WIP" directly)
            return categoryName;
        }

        return "";
    }

    public void evaluateBankValidationRequirement(Transaction transaction) {
        List<String> reasons = new ArrayList<>();
        boolean required = false;
        boolean highRisk = false;

        String l1 = resolveL1Category(
                transaction.getCategoryName(),
                transaction.getSubcategory(),
                transaction.getOrganizationId()
        ).toLowerCase();

        // Rule 1: High-value transactions (>= 50,000)
        if (transaction.getAmount() != null &&
                transaction.getAmount().compareTo(new BigDecimal("50000")) >= 0) {
            required = true;
            reasons.add("High-value transaction (>= ₹50,000)");
            if (transaction.getAmount().compareTo(new BigDecimal("500000")) >= 0) {
                highRisk = true;
            }
        }

        // Rule 2: Any Expense category transaction requires bank validation
        if (l1.contains("expense")) {
            required = true;
            reasons.add("Expense transaction (" + transaction.getCategoryName()
                    + (transaction.getSubcategory() != null ? " / " + transaction.getSubcategory() : "") + ")");
        }

        // Rule 3: Any Revenue category transaction requires bank validation
        if (l1.contains("revenue")) {
            required = true;
            reasons.add("Revenue transaction (" + transaction.getCategoryName()
                    + (transaction.getSubcategory() != null ? " / " + transaction.getSubcategory() : "") + ")");
        }

        // Rule 4: WIP transactions above threshold
        if (l1.contains("wip") && transaction.getAmount() != null &&
                transaction.getAmount().compareTo(new BigDecimal("100000")) >= 0) {
            required = true;
            reasons.add("WIP transaction >= ₹1,00,000");
        }

        // Rule 5: Evidence/Invoice uploaded
        if (transaction.getId() != null) {
            Optional<com.audit.api.entity.Checklist> clOpt =
                    checklistRepository.findByTransactionId(transaction.getId());
            if (clOpt.isPresent()) {
                long provided = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(
                        clOpt.get().getId(), true, true);
                if (provided > 0) {
                    required = true;
                    reasons.add("Evidence/Invoice uploaded");
                }
            }
        }

        // Rule 6: Round-number suspicious amounts (multiples of 10,000 >= 10,000)
        if (transaction.getAmount() != null && isRoundNumber(transaction.getAmount())) {
            required = true;
            highRisk = true;
            reasons.add("Suspicious round-number amount");
        }

        // Rule 7: New or high-risk vendors
        if (transaction.getVendorId() != null) {
            Optional<Vendor> vendorOpt = vendorRepository.findById(transaction.getVendorId());
            if (vendorOpt.isPresent()) {
                Vendor vendor = vendorOpt.get();
                if (Boolean.TRUE.equals(vendor.getIsNew())) {
                    required = true;
                    reasons.add("New vendor: " + vendor.getName());
                }
                if ("HIGH".equalsIgnoreCase(vendor.getRiskLevel())) {
                    required = true;
                    highRisk = true;
                    reasons.add("High-risk vendor: " + vendor.getName());
                }
            }
        }

        // Rule 8: Tax-related subcategory
        if (transaction.getSubcategory() != null &&
                transaction.getSubcategory().toLowerCase().contains("tax")) {
            required = true;
            reasons.add("Tax-related payment: " + transaction.getSubcategory());
        }

        transaction.setBankValidationRequired(required);
        transaction.setIsHighRisk(highRisk);
        transaction.setValidationReason(required ? String.join("; ", reasons) : null);
    }

    private boolean isRoundNumber(BigDecimal amount) {
        long val = amount.longValue();
        return val >= 10000 && val % 10000 == 0;
    }
}
