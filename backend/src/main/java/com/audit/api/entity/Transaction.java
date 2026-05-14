package com.audit.api.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "transactions")
public class Transaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String transactionNumber;

    @Column(nullable = false)
    private LocalDate transactionDate;

    @Column(nullable = false)
    private BigDecimal amount;

    private String description;
    private String debitCredit;
    private String ledgerName;
    private String projectCode;
    private String categoryName;
    private String subcategory;
    private String vendorCustomer;
    private String referenceNo;

    @Column(name = "vendor_id")
    private UUID vendorId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(nullable = false)
    private String status;

    @Column(name = "bank_ref_no")
    private String bankRefNo;

    @Column(name = "bank_matched")
    private Boolean bankMatched = false;

    private Boolean bankValidationRequired = false;
    private Boolean isHighRisk = false;
    private String validationReason;

    private String poVendor;
    private String invoiceVendor;
    // Three-way match fields
    private String poNumber;
    private String grnNumber;
    private String invoiceNumber;
    private BigDecimal poAmount;
    private BigDecimal grnAmount;
    private BigDecimal invoiceAmount;
    private Integer poQty;
    private Integer grnQty;
    private Integer invoiceQty;
    private LocalDate poDate;
    private LocalDate grnDate;
    private LocalDate invoiceDate;
    private String complianceStatus;

    public Transaction() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTransactionNumber() { return transactionNumber; }
    public void setTransactionNumber(String transactionNumber) { this.transactionNumber = transactionNumber; }
    public LocalDate getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDebitCredit() { return debitCredit; }
    public void setDebitCredit(String debitCredit) { this.debitCredit = debitCredit; }
    public String getLedgerName() { return ledgerName; }
    public void setLedgerName(String ledgerName) { this.ledgerName = ledgerName; }
    public String getProjectCode() { return projectCode; }
    public void setProjectCode(String projectCode) { this.projectCode = projectCode; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getSubcategory() { return subcategory; }
    public void setSubcategory(String subcategory) { this.subcategory = subcategory; }
    public String getVendorCustomer() { return vendorCustomer; }
    public void setVendorCustomer(String vendorCustomer) { this.vendorCustomer = vendorCustomer; }
    public String getReferenceNo() { return referenceNo; }
    public void setReferenceNo(String referenceNo) { this.referenceNo = referenceNo; }
    public UUID getVendorId() { return vendorId; }
    public void setVendorId(UUID vendorId) { this.vendorId = vendorId; }
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBankRefNo() { return bankRefNo; }
    public void setBankRefNo(String bankRefNo) { this.bankRefNo = bankRefNo; }
    public Boolean getBankMatched() { return bankMatched; }
    public void setBankMatched(Boolean bankMatched) { this.bankMatched = bankMatched; }
    public Boolean getBankValidationRequired() { return bankValidationRequired; }
    public void setBankValidationRequired(Boolean v) { this.bankValidationRequired = v; }
    public Boolean getIsHighRisk() { return isHighRisk; }
    public void setIsHighRisk(Boolean v) { this.isHighRisk = v; }
    public String getValidationReason() { return validationReason; }
    public void setValidationReason(String v) { this.validationReason = v; }
    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String v) { this.poNumber = v; }
    public String getGrnNumber() { return grnNumber; }
    public void setGrnNumber(String v) { this.grnNumber = v; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String v) { this.invoiceNumber = v; }
    public BigDecimal getPoAmount() { return poAmount; }
    public void setPoAmount(BigDecimal v) { this.poAmount = v; }
    public BigDecimal getGrnAmount() { return grnAmount; }
    public void setGrnAmount(BigDecimal v) { this.grnAmount = v; }
    public BigDecimal getInvoiceAmount() { return invoiceAmount; }
    public void setInvoiceAmount(BigDecimal v) { this.invoiceAmount = v; }
    public Integer getPoQty() { return poQty; }
    public void setPoQty(Integer v) { this.poQty = v; }
    public Integer getGrnQty() { return grnQty; }
    public void setGrnQty(Integer v) { this.grnQty = v; }
    public Integer getInvoiceQty() { return invoiceQty; }
    public void setInvoiceQty(Integer v) { this.invoiceQty = v; }
    public String getPoVendor() { return poVendor; }
    public void setPoVendor(String v) { this.poVendor = v; }
    public String getInvoiceVendor() { return invoiceVendor; }
    public void setInvoiceVendor(String v) { this.invoiceVendor = v; }
    public LocalDate getPoDate() { return poDate; }
    public void setPoDate(LocalDate v) { this.poDate = v; }
    public LocalDate getGrnDate() { return grnDate; }
    public void setGrnDate(LocalDate v) { this.grnDate = v; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate v) { this.invoiceDate = v; }
    public String getComplianceStatus() { return complianceStatus; }
    public void setComplianceStatus(String v) { this.complianceStatus = v; }
}
