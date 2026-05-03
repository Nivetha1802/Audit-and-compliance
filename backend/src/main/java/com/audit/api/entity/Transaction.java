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
    private String status; // PENDING_EVIDENCE, UNDER_REVIEW, APPROVED, REJECTED, RAISED_FINDING

    @Column(name = "bank_ref_no")
    private String bankRefNo;

    @Column(name = "bank_matched")
    private Boolean bankMatched = false;

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
}
