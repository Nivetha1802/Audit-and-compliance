package com.audit.api.dto;

import java.util.UUID;

public class AuthResponse {
    private String token;
    private String refreshToken;
    private UUID organizationId;
    private String role;
    private String fullName;
    private String email;
    private String organizationName;
    private boolean setupRequired;
    private UUID id;

    public AuthResponse() {}

    public AuthResponse(String token, String refreshToken, UUID organizationId, String role, String fullName, String email, String organizationName, boolean setupRequired, UUID id) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.organizationId = organizationId;
        this.role = role;
        this.fullName = fullName;
        this.email = email;
        this.organizationName = organizationName;
        this.setupRequired = setupRequired;
        this.id = id;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String token;
        private String refreshToken;
        private UUID organizationId;
        private String role;
        private String fullName;
        private String email;
        private String organizationName;
        private boolean setupRequired;
        private UUID id;

        public Builder token(String token) { this.token = token; return this; }
        public Builder refreshToken(String refreshToken) { this.refreshToken = refreshToken; return this; }
        public Builder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        public Builder role(String role) { this.role = role; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder organizationName(String organizationName) { this.organizationName = organizationName; return this; }
        public Builder setupRequired(boolean setupRequired) { this.setupRequired = setupRequired; return this; }
        public Builder id(UUID id) { this.id = id; return this; }

        public AuthResponse build() {
            return new AuthResponse(token, refreshToken, organizationId, role, fullName, email, organizationName, setupRequired, id);
        }
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    public boolean isSetupRequired() { return setupRequired; }
    public void setSetupRequired(boolean setupRequired) { this.setupRequired = setupRequired; }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
}
