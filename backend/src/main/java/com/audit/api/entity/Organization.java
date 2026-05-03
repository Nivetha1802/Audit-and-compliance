package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    private String address;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "tax_id")
    private String taxId;

    private String industry;

    private String country;

    @Column(name = "fy_start")
    private String fyStart;

    public Organization() {}

    public Organization(UUID id, String name, String address, String contactEmail,
                        String taxId, String industry, String country, String fyStart) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.contactEmail = contactEmail;
        this.taxId = taxId;
        this.industry = industry;
        this.country = country;
        this.fyStart = fyStart;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private String name;
        private String address;
        private String contactEmail;
        private String taxId;
        private String industry;
        private String country;
        private String fyStart;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder address(String address) { this.address = address; return this; }
        public Builder contactEmail(String contactEmail) { this.contactEmail = contactEmail; return this; }
        public Builder taxId(String taxId) { this.taxId = taxId; return this; }
        public Builder industry(String industry) { this.industry = industry; return this; }
        public Builder country(String country) { this.country = country; return this; }
        public Builder fyStart(String fyStart) { this.fyStart = fyStart; return this; }

        public Organization build() {
            return new Organization(id, name, address, contactEmail, taxId, industry, country, fyStart);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
    public String getTaxId() { return taxId; }
    public void setTaxId(String taxId) { this.taxId = taxId; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getFyStart() { return fyStart; }
    public void setFyStart(String fyStart) { this.fyStart = fyStart; }
}
