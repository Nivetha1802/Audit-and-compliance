package com.audit.api.dto;

import java.util.UUID;

public class ChecklistItemResponse {
    private UUID id;
    private String description;
    private boolean mandatory;
    private boolean provided;
    private UUID documentId;
    private String documentName;

    public ChecklistItemResponse() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
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
