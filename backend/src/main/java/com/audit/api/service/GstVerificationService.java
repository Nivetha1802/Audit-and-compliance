package com.audit.api.service;

import com.audit.api.entity.Vendor;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class GstVerificationService {

    public Map<String, Object> verifyGst(String gstNumber) {
        // Simulated GST Verification Response
        Map<String, Object> response = new HashMap<>();
        
        if (gstNumber == null || gstNumber.length() < 15) {
            response.put("status", "Invalid");
            return response;
        }

        // Mock data based on common test GSTINs
        if (gstNumber.contains("33AAAAA")) {
            response.put("legalName", "RAMCO CEMENTS LIMITED");
            response.put("tradeName", "RAMCO CEMENTS");
            response.put("status", "Active");
            response.put("registrationDate", "01-Jul-2017");
            response.put("address", "Auras Corporate Centre, V Floor, 98-A, Dr. Radhakrishnan Salai, Mylapore, Chennai, Tamil Nadu, 600004");
        } else if (gstNumber.contains("27GHIJK")) {
            response.put("legalName", "MAHARASHTRA TRADING CO.");
            response.put("tradeName", "MAHA-TRADE");
            response.put("status", "Active");
            response.put("registrationDate", "15-Aug-2018");
            response.put("address", "101, Industrial Area, Andheri East, Mumbai, Maharashtra, 400069");
        } else {
            response.put("legalName", "SIMULATED VENDOR LTD");
            response.put("tradeName", "SIMULATED TRADE");
            response.put("status", "Active");
            response.put("registrationDate", "01-Jan-2020");
            response.put("address", "123, Business Park, Sector 5, City Center");
        }

        return response;
    }

    public void verifyAndUpdate(Vendor vendor) {
        if (vendor.getGstNumber() == null || vendor.getGstNumber().isEmpty()) return;

        Map<String, Object> gstData = verifyGst(vendor.getGstNumber());
        
        if ("Active".equals(gstData.get("status"))) {
            vendor.setIsGstVerified(true);
            vendor.setLegalName((String) gstData.get("legalName"));
            vendor.setTradeName((String) gstData.get("tradeName"));
            vendor.setGstStatus((String) gstData.get("status"));
            vendor.setRegistrationDate((String) gstData.get("registrationDate"));
            vendor.setVerifiedAddress((String) gstData.get("address"));

            // Identity Matching Logic
            double score = calculateNameSimilarity(vendor.getName(), vendor.getLegalName());
            vendor.setIdentityMatchScore(score);

            if (score >= 90) {
                vendor.setIdentityStatus("VERIFIED_MATCH");
            } else if (score >= 70) {
                vendor.setIdentityStatus("PARTIAL_MATCH");
            } else {
                vendor.setIdentityStatus("MISMATCH_DETECTED");
            }
        } else {
            vendor.setIsGstVerified(false);
            vendor.setIdentityStatus("INVALID_GST");
        }
    }

    public double calculateNameSimilarity(String name1, String name2) {
        if (name1 == null || name2 == null) return 0.0;
        
        String n1 = name1.toLowerCase().replaceAll("\\b(ltd|pvt|limited|corp|inc)\\b", "").trim();
        String n2 = name2.toLowerCase().replaceAll("\\b(ltd|pvt|limited|corp|inc)\\b", "").trim();
        
        int distance = levenshteinDistance(n1, n2);
        int maxLength = Math.max(n1.length(), n2.length());
        
        if (maxLength == 0) return 100.0;
        return (1.0 - (double) distance / maxLength) * 100;
    }

    private int levenshteinDistance(String a, String b) {
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j < costs.length; j++) costs[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[b.length()];
    }
}
