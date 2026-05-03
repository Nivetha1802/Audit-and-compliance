package com.audit.api.controller;

import com.audit.api.entity.User;
import com.audit.api.repository.UserRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserController(UserRepository userRepository,
                          SecurityUtils securityUtils,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.securityUtils = securityUtils;
        this.passwordEncoder = passwordEncoder;
    }
    @GetMapping
    public ResponseEntity<java.util.List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findByOrganizationId(securityUtils.getCurrentOrganizationId()));
    }


    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser() {
        return ResponseEntity.ok(securityUtils.getCurrentUser());
    }

    @PatchMapping("/me")
    public ResponseEntity<User> updateCurrentUser(@RequestBody Map<String, String> updates) {
        User user = securityUtils.getCurrentUser();

        if (updates.containsKey("fullName") && !updates.get("fullName").isBlank()) {
            user.setFullName(updates.get("fullName"));
        }
        if (updates.containsKey("email") && !updates.get("email").isBlank()) {
            // Check email not already taken by another user
            userRepository.findByEmail(updates.get("email"))
                    .filter(existing -> !existing.getId().equals(user.getId()))
                    .ifPresent(existing -> { throw new RuntimeException("Email already in use"); });
            user.setEmail(updates.get("email"));
        }
        if (updates.containsKey("password") && !updates.get("password").isBlank()) {
            user.setPassword(passwordEncoder.encode(updates.get("password")));
        }

        return ResponseEntity.ok(userRepository.save(user));
    }
}
