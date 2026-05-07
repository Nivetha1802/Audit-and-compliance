package com.audit.api.service;

import com.audit.api.entity.MasterCategory;
import com.audit.api.repository.MasterCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Seeds the default real-estate audit category hierarchy for a new organisation.
 * Structure: L1 (root) → L2 (sub-category) → L3 (line items)
 */
@Service
public class DefaultCategorySeeder {

    private final MasterCategoryRepository repo;

    @Autowired
    public DefaultCategorySeeder(MasterCategoryRepository repo) {
        this.repo = repo;
    }

    // ── Default tree ──────────────────────────────────────────────────────────
    // Map<L1, Map<L2, List<L3>>>
    private static final Map<String, Map<String, List<String>>> DEFAULT_TREE = new LinkedHashMap<>();

    static {
        // ── EXPENSE ──────────────────────────────────────────────────────────
        Map<String, List<String>> expense = new LinkedHashMap<>();
        expense.put("Vendor Payments (Construction & Procurement)", List.of(
                "Cement", "Steel", "Bricks & Blocks", "Sand & Aggregates",
                "Ready Mix Concrete (RMC)", "Tiles & Flooring", "Electrical Materials",
                "Plumbing Materials", "Paint & Finishing Materials", "Glass & Aluminium",
                "Hardware & Fittings", "Construction Chemicals", "Wood & Carpentry Materials"
        ));
        expense.put("Contractor Payments", List.of(
                "Civil Contractor", "Electrical Contractor", "Plumbing Contractor",
                "Interior Contractor", "HVAC Contractor", "Landscaping Contractor",
                "Waterproofing Contractor"
        ));
        expense.put("Payroll", List.of(
                "Site Staff Salaries", "Corporate Staff Salaries",
                "Contract Labour Wages", "Consultant Fees (Architect, Engineer)"
        ));
        expense.put("Operating Expenses", List.of(
                "Office Rent", "Utilities (Electricity, Water)", "Internet & IT Expenses",
                "Travel & Conveyance", "Marketing & Advertising", "Legal & Professional Fees",
                "Insurance", "Maintenance & Repairs", "Security Services", "Admin Expenses"
        ));
        expense.put("Capital Expenditure (CapEx)", List.of(
                "Land Purchase", "Machinery & Equipment", "Office Infrastructure",
                "Vehicles", "Furniture & Fixtures", "IT Systems & Software"
        ));
        expense.put("Tax & Compliance", List.of(
                "GST Payments", "TDS Payments", "Property Tax",
                "Stamp Duty & Registration", "Other Government Fees"
        ));
        DEFAULT_TREE.put("Expense", expense);

        // ── REVENUE ──────────────────────────────────────────────────────────
        Map<String, List<String>> revenue = new LinkedHashMap<>();
        revenue.put("Sales / Customer Payments", List.of(
                "Flat / Unit Sales", "Plot Sales", "Commercial Property Sales",
                "Parking Charges", "Amenities Charges (Clubhouse, etc.)",
                "Maintenance Advance", "Booking Advance"
        ));
        revenue.put("Other Income", List.of(
                "Rental Income", "Interest Income", "Penalty / Late Fees", "Miscellaneous Income"
        ));
        DEFAULT_TREE.put("Revenue", revenue);

        // ── WIP ───────────────────────────────────────────────────────────────
        Map<String, List<String>> wip = new LinkedHashMap<>();
        wip.put("Construction Costs", List.of(
                "Material Consumption", "Labour Cost",
                "Contractor Work in Progress", "Site Overheads"
        ));
        wip.put("Project Development Costs", List.of(
                "Architect & Design Cost", "Approval & Licensing Fees",
                "Site Development Expenses", "Project Management Cost"
        ));
        wip.put("Inventory / Progress Tracking", List.of(
                "Unsold Inventory", "Construction in Progress", "Completed Units (Unsold)"
        ));
        DEFAULT_TREE.put("WIP", wip);
    }

    /**
     * Seeds the full default category tree for the given organisation.
     * Safe to call multiple times — skips if categories already exist.
     */
    @Transactional
    public void seedForOrganization(UUID orgId) {
        // Skip if already seeded
        if (!repo.findByOrganizationIdAndLevel(orgId, 1).isEmpty()) return;

        for (Map.Entry<String, Map<String, List<String>>> l1Entry : DEFAULT_TREE.entrySet()) {
            MasterCategory l1 = new MasterCategory(l1Entry.getKey(), orgId);
            l1 = repo.save(l1);

            for (Map.Entry<String, List<String>> l2Entry : l1Entry.getValue().entrySet()) {
                MasterCategory l2 = new MasterCategory(l2Entry.getKey(), l1.getId(), 2, orgId);
                l2 = repo.save(l2);

                for (String l3Name : l2Entry.getValue()) {
                    MasterCategory l3 = new MasterCategory(l3Name, l2.getId(), 3, orgId);
                    repo.save(l3);
                }
            }
        }
    }
}
