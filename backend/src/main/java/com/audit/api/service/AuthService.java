package com.audit.api.service;

import com.audit.api.dto.AuthRequest;
import com.audit.api.dto.AuthResponse;
import com.audit.api.dto.RegisterRequest;
import com.audit.api.entity.Organization;
import com.audit.api.entity.Role;
import com.audit.api.entity.User;
import com.audit.api.repository.OrganizationRepository;
import com.audit.api.repository.UserRepository;
import com.audit.api.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    private static final String PASSWORD_REGEX =
            "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\\S+$).{8,}$";

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ChecklistSeederService checklistSeederService;

    @Autowired
    public AuthService(UserRepository userRepository,
                       OrganizationRepository organizationRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       ChecklistSeederService checklistSeederService) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.checklistSeederService = checklistSeederService;
    }

    private void validatePassword(String password) {
        if (password == null || !password.matches(PASSWORD_REGEX)) {
            throw new RuntimeException(
                    "Password must be at least 8 characters, contain uppercase, lowercase, number, and special character.");
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("An account with this email already exists");
        }

        validatePassword(request.getPassword());

        Role role = Role.valueOf(request.getRole().toUpperCase());
        Organization organization;

        var existingOrg = organizationRepository.findByName(request.getOrganizationName());

        if (role == Role.ADMIN) {
            if (existingOrg.isPresent()) {
                organization = existingOrg.get();
            } else {
                organization = Organization.builder()
                        .name(request.getOrganizationName())
                        .build();
                organization = organizationRepository.save(organization);
                // Seed default audit checklists and categories for the new org
                checklistSeederService.seedOrganizationData(organization.getId());
            }
        } else {
            organization = existingOrg.orElseThrow(() ->
                    new RuntimeException("Organization not found: " + request.getOrganizationName()));
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .organizationId(organization.getId())
                .active(true)
                .build();
        user = userRepository.save(user);

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("organizationId", organization.getId());
        extraClaims.put("role", user.getRole());

        var jwtToken = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password(user.getPassword())
                        .build(),
                extraClaims
        );

        boolean setupRequired = organization.getTaxId() == null || organization.getAddress() == null;

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(jwtService.generateRefreshToken(user.getEmail()))
                .organizationId(organization.getId())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .organizationName(organization.getName())
                .setupRequired(setupRequired)
                .id(user.getId())
                .build();
    }

    public AuthResponse authenticate(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        var user = userRepository.findByEmail(request.getEmail()).orElseThrow();

        var organization = organizationRepository.findById(user.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("organizationId", user.getOrganizationId());
        extraClaims.put("role", user.getRole());

        var jwtToken = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password(user.getPassword())
                        .build(),
                extraClaims
        );

        boolean setupRequired = organization.getTaxId() == null || organization.getAddress() == null;

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(jwtService.generateRefreshToken(user.getEmail()))
                .organizationId(user.getOrganizationId())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .organizationName(organization.getName())
                .setupRequired(setupRequired)
                .id(user.getId())
                .build();
    }

    /** Exchange a valid refresh token for a new access token + new refresh token. */
    public AuthResponse refresh(String refreshToken) {
        String email;
        try {
            email = jwtService.extractUsername(refreshToken);
        } catch (Exception e) {
            throw new RuntimeException("Invalid or expired refresh token");
        }

        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        var organization = organizationRepository.findById(user.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("organizationId", user.getOrganizationId());
        extraClaims.put("role", user.getRole());

        var newAccessToken = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password(user.getPassword())
                        .build(),
                extraClaims
        );

        boolean setupRequired = organization.getTaxId() == null || organization.getAddress() == null;

        return AuthResponse.builder()
                .token(newAccessToken)
                .refreshToken(jwtService.generateRefreshToken(email))
                .organizationId(user.getOrganizationId())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .organizationName(organization.getName())
                .setupRequired(setupRequired)
                .id(user.getId())
                .build();
    }
}
