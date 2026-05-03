package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "checklist_item_templates")
public class ChecklistItemTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(nullable = false)
    private String description;

    private boolean mandatory = true;

    public ChecklistItemTemplate() {}

    public ChecklistItemTemplate(UUID id, UUID templateId, String description, boolean mandatory) {
        this.id = id;
        this.templateId = templateId;
        this.description = description;
        this.mandatory = mandatory;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID templateId;
        private String description;
        private boolean mandatory = true;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder templateId(UUID templateId) { this.templateId = templateId; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder mandatory(boolean mandatory) { this.mandatory = mandatory; return this; }

        public ChecklistItemTemplate build() {
            return new ChecklistItemTemplate(id, templateId, description, mandatory);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isMandatory() { return mandatory; }
    public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }
}
