package com.audit.api.config;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final RiskRepository riskRepository;
    private final OrganizationRepository organizationRepository;
    private final CategoryRepository categoryRepository;
    private final ChecklistTemplateRepository checklistTemplateRepository;
    private final ChecklistItemTemplateRepository checklistItemTemplateRepository;
    private final TransactionRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DataInitializer(UserRepository userRepository,
                           ProjectRepository projectRepository,
                           RiskRepository riskRepository,
                           OrganizationRepository organizationRepository,
                           CategoryRepository categoryRepository,
                           ChecklistTemplateRepository checklistTemplateRepository,
                           ChecklistItemTemplateRepository checklistItemTemplateRepository,
                           TransactionRepository transactionRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.riskRepository = riskRepository;
        this.organizationRepository = organizationRepository;
        this.categoryRepository = categoryRepository;
        this.checklistTemplateRepository = checklistTemplateRepository;
        this.checklistItemTemplateRepository = checklistItemTemplateRepository;
        this.transactionRepository = transactionRepository;
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

        // 3. Create sample data if empty
        if (projectRepository.count() == 0) {
            Project project = new Project();
            project.setName("Annual Financial Audit 2023");
            project.setDescription("Standard financial audit for the fiscal year 2023");
            project.setStatus("IN_PROGRESS");
            userRepository.findByEmail("jessy@audit.com").ifPresent(u -> project.setProjectOwnerId(u.getId()));
            project.setOrganizationId(orgId);
            Project savedProject = projectRepository.save(project);

            // Create Categories for this project
            Category travelCat = new Category();
            travelCat.setProjectId(savedProject.getId());
            travelCat.setName("Travel & Entertainment");
            travelCat.setBudget(new BigDecimal("50000"));
            travelCat.setOrganizationId(orgId);
            travelCat = categoryRepository.save(travelCat);

            Category officeCat = new Category();
            officeCat.setProjectId(savedProject.getId());
            officeCat.setName("Office Supplies");
            officeCat.setBudget(new BigDecimal("10000"));
            officeCat.setOrganizationId(orgId);
            officeCat = categoryRepository.save(officeCat);

            // Create Checklist Templates for these categories
            ChecklistTemplate travelTemplate = ChecklistTemplate.builder()
                    .name("Travel Evidence Checklist")
                    .description("Required documents for travel expenses")
                    .categoryId(travelCat.getId())
                    .build();
            travelTemplate.setOrganizationId(orgId);
            travelTemplate = checklistTemplateRepository.save(travelTemplate);

            checklistItemTemplateRepository.save(ChecklistItemTemplate.builder()
                    .templateId(travelTemplate.getId())
                    .description("Flight Boarding Pass")
                    .mandatory(true)
                    .build());
            checklistItemTemplateRepository.save(ChecklistItemTemplate.builder()
                    .templateId(travelTemplate.getId())
                    .description("Hotel Receipt")
                    .mandatory(true)
                    .build());
            checklistItemTemplateRepository.save(ChecklistItemTemplate.builder()
                    .templateId(travelTemplate.getId())
                    .description("Travel Authorization Form")
                    .mandatory(false)
                    .build());

            ChecklistTemplate officeTemplate = ChecklistTemplate.builder()
                    .name("Office Supplies Checklist")
                    .description("Required documents for office supply purchases")
                    .categoryId(officeCat.getId())
                    .build();
            officeTemplate.setOrganizationId(orgId);
            officeTemplate = checklistTemplateRepository.save(officeTemplate);

            checklistItemTemplateRepository.save(ChecklistItemTemplate.builder()
                    .templateId(officeTemplate.getId())
                    .description("Purchase Invoice")
                    .mandatory(true)
                    .build());
            checklistItemTemplateRepository.save(ChecklistItemTemplate.builder()
                    .templateId(officeTemplate.getId())
                    .description("Delivery Note / GRN")
                    .mandatory(true)
                    .build());

            // Create sample transactions linked to these categories
            Transaction t1 = new Transaction();
            t1.setTransactionNumber("TXN001");
            t1.setTransactionDate(java.time.LocalDate.now().minusDays(5));
            t1.setAmount(new BigDecimal("1250.50"));
            t1.setDescription("Flight to New York - Audit Site Visit");
            t1.setProjectId(savedProject.getId());
            t1.setCategoryId(travelCat.getId());
            t1.setCategoryName(travelCat.getName());
            t1.setStatus("PENDING");
            t1.setOrganizationId(orgId);
            transactionRepository.save(t1);

            Transaction t2 = new Transaction();
            t2.setTransactionNumber("TXN002");
            t2.setTransactionDate(java.time.LocalDate.now().minusDays(2));
            t2.setAmount(new BigDecimal("450.00"));
            t2.setDescription("Printer Cartridges and Paper");
            t2.setProjectId(savedProject.getId());
            t2.setCategoryId(officeCat.getId());
            t1.setCategoryName(officeCat.getName());
            t2.setStatus("PENDING");
            t2.setOrganizationId(orgId);
            transactionRepository.save(t2);

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
