package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "checklist_items")
public class ChecklistItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "checklist_id", nullable = false)
    private UUID checklistId;

    @Column(nullable = false)
    private String description;

    private Boolean mandatory = true;

    private Boolean provided = false;

    @Column(name = "document_id")
    private UUID documentId;

    public ChecklistItem() {}

    public ChecklistItem(UUID id, UUID checklistId, String description, Boolean mandatory, Boolean provided, UUID documentId) {
        this.id = id;
        this.checklistId = checklistId;
        this.description = description;
        this.mandatory = mandatory;
        this.provided = provided;
        this.documentId = documentId;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID checklistId;
        private String description;
        private Boolean mandatory = true;
        private Boolean provided = false;
        private UUID documentId;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder checklistId(UUID checklistId) { this.checklistId = checklistId; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder mandatory(Boolean mandatory) { this.mandatory = mandatory; return this; }
        public Builder provided(Boolean provided) { this.provided = provided; return this; }
        public Builder documentId(UUID documentId) { this.documentId = documentId; return this; }

        public ChecklistItem build() {
            return new ChecklistItem(id, checklistId, description, mandatory, provided, documentId);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getChecklistId() { return checklistId; }
    public void setChecklistId(UUID checklistId) { this.checklistId = checklistId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean isMandatory() { return mandatory != null && mandatory; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory; }
    public Boolean isProvided() { return provided != null && provided; }
    public void setProvided(Boolean provided) { this.provided = provided; }
    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }
}
