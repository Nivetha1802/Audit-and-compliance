package com.audit.api.dto;

public class RegisterRequest {
    private String fullName;
    private String organizationName;
    private String role;
    private String email;
    private String password;

    public RegisterRequest() {}

    public RegisterRequest(String fullName, String email, String password, String organizationName, String role) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.organizationName = organizationName;
        this.role = role;
    }

    public static class Builder {
        private String fullName;
        private String email;
        private String password;
        private String organizationName;
        private String role;

        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder password(String password) { this.password = password; return this; }
        public Builder organizationName(String organizationName) { this.organizationName = organizationName; return this; }
        public Builder role(String role) { this.role = role; return this; }

        public RegisterRequest build() {
            return new RegisterRequest(fullName, email, password, organizationName, role);
        }
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}


