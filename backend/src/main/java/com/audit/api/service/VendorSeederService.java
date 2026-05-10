package com.audit.api.service;

import com.audit.api.entity.Vendor;
import com.audit.api.repository.VendorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class VendorSeederService {

    private final VendorRepository vendorRepository;

    @Autowired
    public VendorSeederService(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    @Transactional
    public void seedVendors(UUID orgId) {
        if (!vendorRepository.findAllByOrganizationId(orgId).isEmpty()) {
            return;
        }

        List<VendorDef> defs = new ArrayList<>();
        defs.add(new VendorDef("V-001", "Ramco Cements Ltd", "Supplier", "Cement", "33AAAAA0000A1Z5", "AAAAA0000A"));
        defs.add(new VendorDef("C-001", "Arun Kumar", "Customer", "Booking Advance", null, "BBBBB1111B"));
        defs.add(new VendorDef("V-002", "Sri Vinayaga Electricals", "Contractor", "Electrical Contractor", "33BBBBB1111B1Z5", "BBBBB1111B"));
        defs.add(new VendorDef("V-003", "Airtel Business", "Supplier", "Internet & IT Expenses", "33CCCCC2222C1Z5", "CCCCC2222C"));
        defs.add(new VendorDef("V-004", "Tata Steel", "Supplier", "Steel", "33DDDDD3333D1Z5", "DDDDD3333D"));
        defs.add(new VendorDef("C-002", "Priya Narayanan", "Customer", "Flat / Unit Sales", null, "EEEEE4444E"));
        defs.add(new VendorDef("V-005", "Urban Space Architects", "Consultant", "Consultant Fees (Architect, Engineer)", "33FFFFF5555F1Z5", "FFFFF5555F"));
        defs.add(new VendorDef("G-001", "GST Department", "Government", "GST Payments", "33GGGGG6666G1Z5", "GGGGG6666G"));
        defs.add(new VendorDef("C-003", "Zenith Retail Pvt Ltd", "Customer", "Rental Income", "33HHHHH7777H1Z5", "HHHHH7777H"));
        defs.add(new VendorDef("V-006", "Eagle Security Services", "Contractor", "Security Services", "33IIIII8888I1Z5", "IIIII8888I"));
        defs.add(new VendorDef("V-007", "Supreme Pipes", "Supplier", "Plumbing Materials", "33JJJJJ9999J1Z5", "JJJJJ9999J"));
        defs.add(new VendorDef("I-001", "Internal Employees", "Internal", "Site Staff Salaries", null, null));
        defs.add(new VendorDef("C-004", "Karthik R", "Customer", "Booking Advance", null, "KKKKK0000K"));
        defs.add(new VendorDef("B-001", "HDFC Bank", "Financial", "Interest Income", "33LLLLL1111L1Z5", "LLLLL1111L"));
        defs.add(new VendorDef("V-008", "AquaSeal Contractors", "Contractor", "Waterproofing Contractor", "33MMMMM2222M1Z5", "MMMMM2222M"));
        defs.add(new VendorDef("C-005", "Deepak Menon", "Customer", "Parking Charges", null, "NNNNN3333N"));
        defs.add(new VendorDef("V-009", "KONE Elevators", "Supplier", "Machinery & Equipment", "33OOOOO4444O1Z5", "OOOOO4444O"));
        defs.add(new VendorDef("V-010", "BrightAds Media", "Supplier", "Marketing & Advertising", "33PPPPP5555P1Z5", "PPPPP5555P"));
        defs.add(new VendorDef("C-006", "Various Tenants", "Customer", "Maintenance Advance", null, null));
        defs.add(new VendorDef("V-011", "SafeBuild Equipments", "Supplier", "Site Overheads", "33QQQQQ6666Q1Z5", "QQQQQ6666Q"));

        for (VendorDef def : defs) {
            Vendor vendor = new Vendor();
            vendor.setCustomVendorId(def.id);
            vendor.setName(def.name);
            vendor.setVendorType(def.type);
            vendor.setCategory(def.category);
            vendor.setGstNumber(def.gst);
            vendor.setPan(def.pan);
            vendor.setOrganizationId(orgId);
            vendor.setBankAccountDetails("Bank: HDFC Bank, Acc: XXXXXXXXXX" + def.id.substring(def.id.length()-2) + ", IFSC: HDFC0001234");
            vendor.setContactDetails("Contact Person: Manager, Phone: +91 98765 43" + def.id.substring(def.id.length()-2) + ", Email: info@" + def.name.toLowerCase().replace(" ", "") + ".com");
            vendor.setIsNew(false);
            vendor.setRiskLevel("LOW");
            vendorRepository.save(vendor);
        }
    }

    private static class VendorDef {
        final String id;
        final String name;
        final String type;
        final String category;
        final String gst;
        final String pan;

        VendorDef(String id, String name, String type, String category, String gst, String pan) {
            this.id = id;
            this.name = name;
            this.type = type;
            this.category = category;
            this.gst = gst;
            this.pan = pan;
        }
    }
}
