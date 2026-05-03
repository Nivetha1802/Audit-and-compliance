package com.audit.api.dto;

import java.util.UUID;

public class AuthResponse {
    private String token;
    private UUID organizationId;
    private String role;
    private String organizationName;
    private boolean setupRequired;

    public AuthResponse() {}

    public AuthResponse(String token, UUID organizationId, String role, String organizationName, boolean setupRequired) {
        this.token = token;
        this.organizationId = organizationId;
        this.role = role;
        this.organizationName = organizationName;
        this.setupRequired = setupRequired;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String token;
        private UUID organizationId;
        private String role;
        private String organizationName;
        private boolean setupRequired;

        public Builder token(String token) { this.token = token; return this; }
        public Builder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        public Builder role(String role) { this.role = role; return this; }
        public Builder organizationName(String organizationName) { this.organizationName = organizationName; return this; }
        public Builder setupRequired(boolean setupRequired) { this.setupRequired = setupRequired; return this; }

        public AuthResponse build() {
            return new AuthResponse(token, organizationId, role, organizationName, setupRequired);
        }
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    public boolean isSetupRequired() { return setupRequired; }
    public void setSetupRequired(boolean setupRequired) { this.setupRequired = setupRequired; }
}
