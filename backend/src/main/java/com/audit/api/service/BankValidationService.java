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
     */
    private String resolveL1Category(String categoryName, String subcategory, UUID orgId) {
        if (orgId == null) return categoryName != null ? categoryName : "";

        List<MasterCategory> all = masterCategoryRepository.findByOrganizationId(orgId);
        Map<UUID, MasterCategory> byId = all.stream()
                .collect(Collectors.toMap(MasterCategory::getId, c -> c));

        Map<String, MasterCategory> byName = new HashMap<>();
        for (MasterCategory c : all) {
            byName.put(c.getName().toLowerCase().trim(), c);
        }

        String probe = subcategory != null && !subcategory.isBlank() ? subcategory.trim() : null;
        if (probe != null) {
            MasterCategory found = byName.get(probe.toLowerCase());
            if (found != null && found.getLevel() == 2 && found.getParentId() != null) {
                MasterCategory parent = byId.get(found.getParentId());
                if (parent != null) return parent.getName();
            }
            if (found != null && found.getLevel() == 1) return found.getName();
        }

        if (categoryName != null && !categoryName.isBlank()) {
            MasterCategory found = byName.get(categoryName.toLowerCase().trim());
            if (found != null && found.getLevel() == 1) return found.getName();
            if (found != null && found.getLevel() == 2 && found.getParentId() != null) {
                MasterCategory parent = byId.get(found.getParentId());
                if (parent != null) return parent.getName();
            }
            return categoryName;
        }

        return "";
    }

    public void evaluateBankValidationRequirement(Transaction transaction) {
        List<String> reasons = new ArrayList<>();
        boolean required = false;
        boolean highRisk = false;

        String category = transaction.getCategoryName() != null ? transaction.getCategoryName().toLowerCase() : "";
        String subcategory = transaction.getSubcategory() != null ? transaction.getSubcategory().toLowerCase() : "";
        String description = transaction.getDescription() != null ? transaction.getDescription().toLowerCase() : "";
        String ledger = transaction.getLedgerName() != null ? transaction.getLedgerName().toLowerCase() : "";
        BigDecimal amount = transaction.getAmount() != null ? transaction.getAmount() : BigDecimal.ZERO;

        String l1 = resolveL1Category(
                transaction.getCategoryName(),
                transaction.getSubcategory(),
                transaction.getOrganizationId()
        ).toLowerCase();

        // --- ENFORCEMENT RULES ---

        // ✅ 1. High-value transactions (IF amount >= 50,000)
        if (amount.compareTo(new BigDecimal("50000")) >= 0) {
            required = true;
            reasons.add("High-value transaction (>= ₹50,000)");
            if (amount.compareTo(new BigDecimal("500000")) >= 0) {
                highRisk = true;
            }
        }

        // ✅ 2. Vendor payments (IF category = Expense AND subcategory = Vendor Payment)
        if (l1.contains("expense") && subcategory.contains("vendor payment")) {
            required = true;
            reasons.add("Vendor Payment (Expense)");
        }

        // ✅ 3. Revenue / Customer receipts (IF category = Revenue)
        if (l1.contains("revenue")) {
            required = true;
            reasons.add("Revenue / Customer receipt");
        }

        // ✅ 4. Transactions with uploaded invoices
        if (transaction.getId() != null) {
            Optional<com.audit.api.entity.Checklist> clOpt =
                    checklistRepository.findByTransactionId(transaction.getId());
            if (clOpt.isPresent()) {
                long provided = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(
                        clOpt.get().getId(), true, true);
                if (provided > 0) {
                    required = true;
                    reasons.add("Invoice/Evidence uploaded");
                }
            }
        }

        // ✅ 5. Round-number or suspicious amounts (IF amount = 100k or 500k)
        if (isSuspiciousRoundNumber(amount)) {
            required = true;
            highRisk = true;
            reasons.add("Suspicious round-number amount");
        }

        // ✅ 6. New or high-risk vendors
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

        // ✅ 9. Tax-related payments (IF subcategory = Tax & Compliance)
        if (subcategory.contains("tax") || subcategory.contains("compliance")) {
            required = true;
            reasons.add("Tax & Compliance related payment");
        }

        // --- EXCLUSION RULES (OVERRIDE) ---

        // 🚫 Internal entries (Depreciation, Accruals, Adjustments)
        if (description.contains("depreciation") || description.contains("accrual") || 
            description.contains("adjustment") || ledger.contains("depreciation")) {
            required = false;
            reasons.clear();
            reasons.add("Internal Entry (Exempt)");
        }

        // 🚫 WIP (most cases)
        if (l1.contains("wip") && amount.compareTo(new BigDecimal("100000")) < 0) {
            required = false;
            reasons.clear();
            reasons.add("WIP Transaction < ₹1,00,000 (Exempt)");
        }

        // 🚫 Low-value routine transactions (IF amount < 5,000)
        if (amount.compareTo(new BigDecimal("5000")) < 0 && !subcategory.contains("tax")) {
            required = false;
            reasons.clear();
            reasons.add("Low-value transaction < ₹5,000 (Exempt)");
        }

        transaction.setBankValidationRequired(required);
        transaction.setIsHighRisk(highRisk);
        transaction.setValidationReason((required || (reasons.size() > 0 && reasons.get(0).contains("Exempt"))) ? String.join("; ", reasons) : null);
    }

    private boolean isSuspiciousRoundNumber(BigDecimal amount) {
        long val = amount.longValue();
        return val > 0 && (val == 100000 || val == 500000 || val == 1000000 || (val >= 50000 && val % 50000 == 0));
    }
}
