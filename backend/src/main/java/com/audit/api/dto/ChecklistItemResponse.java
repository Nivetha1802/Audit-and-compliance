package com.audit.api.dto;

import java.util.UUID;

public class ChecklistItemResponse {
    private UUID id;
    private UUID checklistId;
    private String description;
    private boolean mandatory;
    private boolean provided;
    private UUID documentId;
    private String documentName;

    public ChecklistItemResponse() {}

    public ChecklistItemResponse(UUID id, UUID checklistId, String description, boolean mandatory, boolean provided, UUID documentId, String documentName) {
        this.id = id;
        this.checklistId = checklistId;
        this.description = description;
        this.mandatory = mandatory;
        this.provided = provided;
        this.documentId = documentId;
        this.documentName = documentName;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getChecklistId() { return checklistId; }
    public void setChecklistId(UUID checklistId) { this.checklistId = checklistId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isMandatory() { return mandatory; }
    public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }
    public boolean isProvided() { return provided; }
    public void setProvided(boolean provided) { this.provided = provided; }
    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }
    public String getDocumentName() { return documentName; }
    public void setDocumentName(String documentName) { this.documentName = documentName; }
}
