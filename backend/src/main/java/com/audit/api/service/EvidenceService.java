package com.audit.api.service;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EvidenceService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final ChecklistTemplateRepository templateRepository;
    private final ChecklistItemTemplateRepository templateItemRepository;
    private final DocumentRepository documentRepository;
    private final TransactionRepository transactionRepository;
    private final MasterCategoryRepository masterCategoryRepository;
    private final SecurityUtils securityUtils;
    private final BankValidationService bankValidationService;

    @Autowired
    public EvidenceService(ChecklistRepository checklistRepository,
                           ChecklistItemRepository checklistItemRepository,
                           ChecklistTemplateRepository templateRepository,
                           ChecklistItemTemplateRepository templateItemRepository,
                           DocumentRepository documentRepository,
                           TransactionRepository transactionRepository,
                           MasterCategoryRepository masterCategoryRepository,
                           SecurityUtils securityUtils,
                           BankValidationService bankValidationService) {
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.templateRepository = templateRepository;
        this.templateItemRepository = templateItemRepository;
        this.documentRepository = documentRepository;
        this.transactionRepository = transactionRepository;
        this.masterCategoryRepository = masterCategoryRepository;
        this.securityUtils = securityUtils;
        this.bankValidationService = bankValidationService;
    }

    /** Get or create checklist for a transaction, seeding from matching template */
    @Transactional
    public Checklist getOrCreateChecklist(UUID transactionId) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        return checklistRepository.findByTransactionId(transactionId).orElseGet(() -> {
            Transaction tx = transactionRepository.findById(transactionId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));

            Checklist checklist = new Checklist();
            checklist.setTransactionId(transactionId);
            checklist.setCompleted(false);
            checklist.setOrganizationId(orgId);
            Checklist saved = checklistRepository.save(checklist);

            // Find best matching template using category hierarchy walk-up
            List<ChecklistTemplate> templates = templateRepository.findByOrganizationId(orgId);
            ChecklistTemplate matched = findBestTemplate(templates, tx.getCategoryName(), tx.getSubcategory(), orgId);

            if (matched != null) {
                List<ChecklistItemTemplate> templateItems = templateItemRepository.findByTemplateId(matched.getId());
                final UUID checklistId = saved.getId();
                templateItems.forEach(ti -> {
                    ChecklistItem item = new ChecklistItem();
                    item.setChecklistId(checklistId);
                    item.setDescription(ti.getDescription());
                    item.setMandatory(ti.isMandatory());
                    item.setProvided(false);
                    item.setOrganizationId(orgId);
                    checklistItemRepository.save(item);
                });
            }

            return saved;
        });
    }

    /**
     * Find the best matching template for a transaction's category.
     * Priority: exact L3 match → L2 match → L1 match → first template.
     * Supports comma-separated multi-category templates.
     */
    private ChecklistTemplate findBestTemplate(List<ChecklistTemplate> templates,
                                                String categoryName, String subcategory, UUID orgId) {
        if (templates.isEmpty()) return null;

        // Build candidate names to try: L3 (subcategory), L2 (categoryName), then walk up
        List<String> candidates = new java.util.ArrayList<>();
        if (subcategory != null && !subcategory.isBlank()) candidates.add(subcategory.trim());
        if (categoryName != null && !categoryName.isBlank()) candidates.add(categoryName.trim());

        // Also add parent category names by looking up the master category tree
        if (categoryName != null && !categoryName.isBlank()) {
            List<com.audit.api.entity.MasterCategory> allCats =
                    masterCategoryRepository.findByOrganizationId(orgId);
            java.util.Map<UUID, com.audit.api.entity.MasterCategory> byId = new java.util.HashMap<>();
            allCats.forEach(c -> byId.put(c.getId(), c));
            java.util.Map<String, com.audit.api.entity.MasterCategory> byName = new java.util.HashMap<>();
            allCats.forEach(c -> byName.put(c.getName().toLowerCase().trim(), c));

            // Walk up from subcategory
            com.audit.api.entity.MasterCategory current = byName.get(
                    (subcategory != null ? subcategory : categoryName).toLowerCase().trim());
            while (current != null && current.getParentId() != null) {
                current = byId.get(current.getParentId());
                if (current != null) candidates.add(current.getName());
            }
        }

        // Try each candidate against template descriptions
        for (String candidate : candidates) {
            for (ChecklistTemplate t : templates) {
                if (t.getDescription() == null) continue;
                boolean matches = java.util.Arrays.stream(t.getDescription().split(","))
                        .map(String::trim)
                        .anyMatch(cat -> cat.equalsIgnoreCase(candidate));
                if (matches) return t;
            }
        }

        // Fall back to first template
        return templates.get(0);
    }

    public List<ChecklistItem> getChecklistItems(UUID checklistId) {
        return checklistItemRepository.findByChecklistId(checklistId);
    }

    /** Get checklist items enriched with document filename */
    public List<com.audit.api.dto.ChecklistItemResponse> getChecklistItemsWithDocNames(UUID checklistId) {
        List<ChecklistItem> items = checklistItemRepository.findByChecklistId(checklistId);
        return items.stream().map(item -> {
            com.audit.api.dto.ChecklistItemResponse res = new com.audit.api.dto.ChecklistItemResponse();
            res.setId(item.getId());
            res.setDescription(item.getDescription());
            res.setMandatory(item.isMandatory());
            res.setProvided(item.isProvided());
            res.setDocumentId(item.getDocumentId());
            if (item.getDocumentId() != null) {
                documentRepository.findById(item.getDocumentId())
                        .ifPresent(doc -> res.setDocumentName(doc.getFileName()));
            }
            return res;
        }).collect(Collectors.toList());
    }

    /** Upload evidence file and link it to a checklist item */
    @Transactional
    public ChecklistItem uploadEvidence(UUID checklistItemId, MultipartFile file) throws Exception {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ChecklistItem item = checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));

        // Save file to local storage
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, orgId.toString(), "evidence", fileName);
        Files.createDirectories(filePath.getParent());
        Files.copy(file.getInputStream(), filePath);

        // Save document metadata
        Document doc = Document.builder()
                .fileName(file.getOriginalFilename())
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .build();
        doc.setOrganizationId(orgId);
        doc = documentRepository.save(doc);

        // Mark item as provided
        item.setDocumentId(doc.getId());
        item.setProvided(true);
        item = checklistItemRepository.save(item);

        // Recompute checklist completion
        updateChecklistCompletion(item.getChecklistId());

        // Trigger bank validation re-evaluation when evidence is uploaded
        checklistRepository.findById(item.getChecklistId()).ifPresent(cl ->
            transactionRepository.findById(cl.getTransactionId()).ifPresent(tx -> {
                bankValidationService.evaluateBankValidationRequirement(tx);
                transactionRepository.save(tx);
            })
        );

        return item;
    }

    /** Remove evidence from a checklist item */
    @Transactional
    public ChecklistItem removeEvidence(UUID checklistItemId) {
        ChecklistItem item = checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));
        item.setDocumentId(null);
        item.setProvided(false);
        item = checklistItemRepository.save(item);
        updateChecklistCompletion(item.getChecklistId());

        // Re-evaluate bank validation since evidence was removed
        checklistRepository.findById(item.getChecklistId()).ifPresent(cl ->
            transactionRepository.findById(cl.getTransactionId()).ifPresent(tx -> {
                bankValidationService.evaluateBankValidationRequirement(tx);
                transactionRepository.save(tx);
            })
        );

        return item;
    }

    private void updateChecklistCompletion(UUID checklistId) {
        long mandatory = checklistItemRepository.countByChecklistIdAndMandatory(checklistId, true);
        long mandatoryProvided = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(checklistId, true, true);
        boolean complete = mandatory > 0 && mandatory == mandatoryProvided;

        checklistRepository.findById(checklistId).ifPresent(cl -> {
            cl.setCompleted(complete);
            checklistRepository.save(cl);
        });
    }

    /** Audit readiness for a single transaction: % of mandatory items provided */
    public ReadinessScore getTransactionReadiness(UUID transactionId) {
        Checklist cl = checklistRepository.findByTransactionId(transactionId).orElse(null);
        if (cl == null) return new ReadinessScore(0, 0, 0, false);

        long total    = checklistItemRepository.countByChecklistIdAndMandatory(cl.getId(), true);
        long provided = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(cl.getId(), true, true);
        int pct       = total == 0 ? 100 : (int) Math.round((provided * 100.0) / total);
        return new ReadinessScore((int) total, (int) provided, pct, cl.isCompleted());
    }

    public record ReadinessScore(int total, int provided, int percentage, boolean complete) {}
}
