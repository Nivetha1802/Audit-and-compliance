package com.audit.api.config;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final RiskRepository riskRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DataInitializer(UserRepository userRepository,
                           ProjectRepository projectRepository,
                           RiskRepository riskRepository,
                           OrganizationRepository organizationRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.riskRepository = riskRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Ensure Default Organization exists
        Organization defaultOrg;
        if (organizationRepository.count() == 0) {
            defaultOrg = Organization.builder()
                    .name("Default Audit Org")
                    .build();
            defaultOrg = organizationRepository.save(defaultOrg);
        } else {
            defaultOrg = organizationRepository.findAll().get(0);
        }
        UUID orgId = defaultOrg.getId();

        // 2. Ensure Jessy Sai exists for login
        if (userRepository.findByEmail("jessy@audit.com").isEmpty()) {
            User jessy = User.builder()
                    .fullName("Jessy Sai")
                    .email("jessy@audit.com")
                    .password(passwordEncoder.encode("jessy123"))
                    .role(Role.ADMIN)
                    .organizationId(orgId)
                    .build();
            userRepository.save(jessy);
        }

        // 3. One-time fix for existing data without organizationId
        // We do this by updating records that have null organizationId
        projectRepository.findAll().stream()
            .filter(p -> p.getOrganizationId() == null)
            .forEach(p -> {
                p.setOrganizationId(orgId);
                projectRepository.save(p);
            });
        
        riskRepository.findAll().stream()
            .filter(r -> r.getOrganizationId() == null)
            .forEach(r -> {
                r.setOrganizationId(orgId);
                riskRepository.save(r);
            });

        // 4. Create sample data if empty
        if (projectRepository.count() == 0) {
            Project project = new Project();
            project.setName("Annual Financial Audit 2023");
            project.setDescription("Standard financial audit for the fiscal year 2023");
            project.setStatus("IN_PROGRESS");
            userRepository.findByEmail("jessy@audit.com").ifPresent(u -> project.setProjectOwnerId(u.getId()));
            project.setOrganizationId(orgId);
            Project savedProject = projectRepository.save(project);

            Risk risk = new Risk();
            risk.setTitle("Incomplete Documentation");
            risk.setDescription("Some ledger entries lack supporting evidence.");
            risk.setSeverity("HIGH");
            risk.setStatus("OPEN");
            risk.setProjectId(savedProject.getId());
            risk.setOrganizationId(orgId);
            riskRepository.save(risk);
        }
    }
}
