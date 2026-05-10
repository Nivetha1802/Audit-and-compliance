package com.audit.api.service;

import com.audit.api.entity.ChecklistItemTemplate;
import com.audit.api.entity.ChecklistTemplate;
import com.audit.api.entity.MasterCategory;
import com.audit.api.repository.ChecklistItemTemplateRepository;
import com.audit.api.repository.ChecklistTemplateRepository;
import com.audit.api.repository.MasterCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ChecklistSeederService {

    private final MasterCategoryRepository masterCategoryRepository;
    private final ChecklistTemplateRepository checklistTemplateRepository;
    private final ChecklistItemTemplateRepository checklistItemTemplateRepository;
    private final DefaultCategorySeeder categorySeeder;
    private final VendorSeederService vendorSeederService;

    @Autowired
    public ChecklistSeederService(MasterCategoryRepository masterCategoryRepository,
                                  ChecklistTemplateRepository checklistTemplateRepository,
                                  ChecklistItemTemplateRepository checklistItemTemplateRepository,
                                  DefaultCategorySeeder categorySeeder,
                                  VendorSeederService vendorSeederService) {
        this.masterCategoryRepository = masterCategoryRepository;
        this.checklistTemplateRepository = checklistTemplateRepository;
        this.checklistItemTemplateRepository = checklistItemTemplateRepository;
        this.categorySeeder = categorySeeder;
        this.vendorSeederService = vendorSeederService;
    }

    @Transactional
    public void seedOrganizationData(UUID orgId) {
        // 1. Seed the 3-level Master Category Tree
        categorySeeder.seedForOrganization(orgId);

        // 1.5 Seed Default Vendors
        vendorSeederService.seedVendors(orgId);

        // 2. Seed checklist templates per category
        createTemplate(orgId, "Material Purchase Template", "Cement,Steel,Bricks & Blocks,Sand & Aggregates,Ready Mix Concrete (RMC),Tiles & Flooring,Electrical Materials,Plumbing Materials,Paint & Finishing Materials,Glass & Aluminium,Hardware & Fittings,Construction Chemicals,Wood & Carpentry Materials", List.of(
            new ItemDef("Vendor Invoice", true),
            new ItemDef("Purchase Order (PO)", true),
            new ItemDef("Goods Receipt Note (GRN)", true),
            new ItemDef("Quantity & Rate Verification", true),
            new ItemDef("Vendor Name Match", true),
            new ItemDef("Transport Receipt", false),
            new ItemDef("Site Engineer Approval", false),
            new ItemDef("Quality Inspection Report", false),
            new ItemDef("Weighbridge Slip", false),
            new ItemDef("Rate Comparison", false)
        ));

        createTemplate(orgId, "Contractor Payment Template", "Civil Contractor,Electrical Contractor,Plumbing Contractor,Interior Contractor,HVAC Contractor,Landscaping Contractor,Waterproofing Contractor", List.of(
            new ItemDef("Contractor Invoice / RA Bill", true),
            new ItemDef("Work Order / Agreement", true),
            new ItemDef("Work Completion Certificate", true),
            new ItemDef("Measurement Sheet", true),
            new ItemDef("Site Photos", false),
            new ItemDef("Engineer Certification", false),
            new ItemDef("Retention Details", false),
            new ItemDef("Variation Approval", false)
        ));

        createTemplate(orgId, "Payroll Template", "Site Staff Salaries,Corporate Staff Salaries,Contract Labour Wages,Consultant Fees (Architect, Engineer)", List.of(
            new ItemDef("Payroll Register", true),
            new ItemDef("Attendance Records", true),
            new ItemDef("Salary Calculation Breakdown", true),
            new ItemDef("Bank Transfer Proof", false),
            new ItemDef("Payslips", false),
            new ItemDef("PF / ESI Filings", false),
            new ItemDef("Employment Contracts", false)
        ));

        createTemplate(orgId, "Operating Expenses Template", "Office Rent,Utilities (Electricity, Water),Internet & IT Expenses,Travel & Conveyance,Marketing & Advertising,Legal & Professional Fees,Insurance,Maintenance & Repairs,Security Services,Admin Expenses", List.of(
            new ItemDef("Invoice / Bill", true),
            new ItemDef("Management Approval", true),
            new ItemDef("Expense Justification", true),
            new ItemDef("Agreement", false),
            new ItemDef("Email Approvals", false),
            new ItemDef("Supporting Documents", false)
        ));

        createTemplate(orgId, "Capital Expenditure Template", "Land Purchase,Machinery & Equipment,Office Infrastructure,Vehicles,Furniture & Fixtures,IT Systems & Software", List.of(
            new ItemDef("Vendor Invoice", true),
            new ItemDef("Purchase Order", true),
            new ItemDef("Asset Details", true),
            new ItemDef("Capitalization Approval", true),
            new ItemDef("Installation Report", false),
            new ItemDef("Warranty Documents", false),
            new ItemDef("Asset Tagging Record", false)
        ));

        createTemplate(orgId, "Tax & Compliance Template", "GST Payments,TDS Payments,Property Tax,Stamp Duty & Registration,Other Government Fees", List.of(
            new ItemDef("Tax Challan", true),
            new ItemDef("Tax Calculation Sheet", true),
            new ItemDef("Filing Proof", true),
            new ItemDef("Bank Payment Proof", false),
            new ItemDef("Govt Acknowledgement", false),
            new ItemDef("Reconciliation Statement", false)
        ));

        createTemplate(orgId, "Revenue Template", "Flat / Unit Sales,Plot Sales,Commercial Property Sales,Parking Charges,Amenities Charges (Clubhouse, etc.),Maintenance Advance,Booking Advance,Rental Income,Interest Income,Penalty / Late Fees,Miscellaneous Income", List.of(
            new ItemDef("Sales Invoice", true),
            new ItemDef("Booking Form", true),
            new ItemDef("Customer Details", true),
            new ItemDef("Bank Receipt", false),
            new ItemDef("Allocation Sheet", false),
            new ItemDef("Payment Schedule", false)
        ));

        createTemplate(orgId, "WIP Template", "Material Consumption,Labour Cost,Contractor Work in Progress,Site Overheads,Architect & Design Cost,Approval & Licensing Fees,Site Development Expenses,Project Management Cost,Unsold Inventory,Construction in Progress,Completed Units (Unsold)", List.of(
            new ItemDef("Cost Allocation Basis", true),
            new ItemDef("Project Progress Report", true),
            new ItemDef("Expense Linkage Proof", true),
            new ItemDef("Engineer Certification", false),
            new ItemDef("Site Photos", false),
            new ItemDef("Stage Completion Report", false)
        ));
    }

    private void createTemplate(UUID orgId, String templateName, String categories, List<ItemDef> items) {
        // Skip if a template with this name already exists for the org
        if (checklistTemplateRepository.findByOrganizationId(orgId).stream()
                .anyMatch(t -> templateName.equals(t.getName()))) {
            return;
        }

        ChecklistTemplate template = new ChecklistTemplate();
        template.setName(templateName);
        template.setDescription(categories); // comma-separated category names
        template.setOrganizationId(orgId);
        template = checklistTemplateRepository.save(template);

        final UUID templateId = template.getId();
        for (ItemDef def : items) {
            ChecklistItemTemplate item = new ChecklistItemTemplate();
            item.setTemplateId(templateId);
            item.setDescription(def.description);
            item.setMandatory(def.mandatory);
            item.setOrganizationId(orgId);
            checklistItemTemplateRepository.save(item);
        }
    }

    private static class ItemDef {
        final String description;
        final boolean mandatory;

        ItemDef(String description, boolean mandatory) {
            this.description = description;
            this.mandatory = mandatory;
        }
    }
}
