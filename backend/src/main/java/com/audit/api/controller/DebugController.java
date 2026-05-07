package com.audit.api.controller;

import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/debug")
public class DebugController {

    private final SecurityUtils securityUtils;

    @Autowired
    public DebugController(SecurityUtils securityUtils) {
        this.securityUtils = securityUtils;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        try {
            var user = securityUtils.getCurrentUser();
            return ResponseEntity.ok(Map.of(
                "authenticated", auth != null && auth.isAuthenticated(),
                "principal", auth != null ? auth.getName() : "none",
                "email", user.getEmail(),
                "organizationId", user.getOrganizationId().toString(),
                "role", user.getRole().toString(),
                "active", user.isActive()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "authenticated", auth != null && auth.isAuthenticated(),
                "principal", auth != null ? auth.getName() : "none",
                "error", e.getMessage()
            ));
        }
    }
}
