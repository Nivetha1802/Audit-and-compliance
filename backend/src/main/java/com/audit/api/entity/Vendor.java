package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "vendors")
public class Vendor extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String customVendorId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String vendorType;

    private String category;
    private String gstNumber;
    private String pan;

    @Column(columnDefinition = "TEXT")
    private String bankAccountDetails;

    @Column(columnDefinition = "TEXT")
    private String contactDetails;

    private Boolean isNew = true;
    private String legalName;
    private String tradeName;
    private String gstStatus;
    private String registrationDate;
    private String verifiedAddress;
    private Boolean isGstVerified = false;
    private String riskLevel = "LOW";
    
    private double identityMatchScore;
    private String identityStatus;

    public Vendor() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCustomVendorId() { return customVendorId; }
    public void setCustomVendorId(String customVendorId) { this.customVendorId = customVendorId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getVendorType() { return vendorType; }
    public void setVendorType(String vendorType) { this.vendorType = vendorType; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }
    public String getPan() { return pan; }
    public void setPan(String pan) { this.pan = pan; }
    public String getBankAccountDetails() { return bankAccountDetails; }
    public void setBankAccountDetails(String bankAccountDetails) { this.bankAccountDetails = bankAccountDetails; }
    public String getContactDetails() { return contactDetails; }
    public void setContactDetails(String contactDetails) { this.contactDetails = contactDetails; }
    public Boolean getIsNew() { return isNew; }
    public void setIsNew(Boolean isNew) { this.isNew = isNew; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getLegalName() { return legalName; }
    public void setLegalName(String legalName) { this.legalName = legalName; }
    public String getTradeName() { return tradeName; }
    public void setTradeName(String tradeName) { this.tradeName = tradeName; }
    public String getGstStatus() { return gstStatus; }
    public void setGstStatus(String gstStatus) { this.gstStatus = gstStatus; }
    public String getRegistrationDate() { return registrationDate; }
    public void setRegistrationDate(String registrationDate) { this.registrationDate = registrationDate; }
    public String getVerifiedAddress() { return verifiedAddress; }
    public void setVerifiedAddress(String verifiedAddress) { this.verifiedAddress = verifiedAddress; }
    public Boolean getIsGstVerified() { return isGstVerified; }
    public void setIsGstVerified(Boolean isGstVerified) { this.isGstVerified = isGstVerified; }

    public double getIdentityMatchScore() { return identityMatchScore; }
    public void setIdentityMatchScore(double identityMatchScore) { this.identityMatchScore = identityMatchScore; }
    public String getIdentityStatus() { return identityStatus; }
    public void setIdentityStatus(String identityStatus) { this.identityStatus = identityStatus; }
}
