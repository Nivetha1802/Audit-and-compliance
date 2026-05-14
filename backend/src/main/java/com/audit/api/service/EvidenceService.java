package com.audit.api.service;

import com.audit.api.dto.ChecklistItemResponse;
import com.audit.api.entity.*;
import com.audit.api.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EvidenceService {

    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentService documentService;
    private final BankValidationService bankValidationService;
    private final TransactionRepository transactionRepository;
    private final ChecklistTemplateRepository checklistTemplateRepository;
    private final ChecklistItemTemplateRepository checklistItemTemplateRepository;

    public EvidenceService(
            ChecklistRepository checklistRepository,
            ChecklistItemRepository checklistItemRepository,
            DocumentService documentService,
            BankValidationService bankValidationService,
            TransactionRepository transactionRepository,
            ChecklistTemplateRepository checklistTemplateRepository,
            ChecklistItemTemplateRepository checklistItemTemplateRepository) {
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.documentService = documentService;
        this.bankValidationService = bankValidationService;
        this.transactionRepository = transactionRepository;
        this.checklistTemplateRepository = checklistTemplateRepository;
        this.checklistItemTemplateRepository = checklistItemTemplateRepository;
    }

    @Transactional
    public Checklist getOrCreateChecklist(UUID transactionId) {
        java.util.Optional<Checklist> existing = checklistRepository.findByTransactionId(transactionId);
        
        if (existing.isPresent()) {
            Checklist cl = existing.get();
            List<ChecklistItem> existingItems = checklistItemRepository.findByChecklistId(cl.getId());
            if (existingItems.isEmpty()) {
                Transaction tx = transactionRepository.findById(transactionId).orElse(null);
                if (tx != null) {
                    populateChecklistFromTemplate(cl, tx);
                }
            }
            return cl;
        }

        // Create new checklist
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        Checklist checklist = new Checklist();
        checklist.setTransactionId(transactionId);
        checklist.setCompleted(false);
        checklist.setOrganizationId(tx.getOrganizationId());
        Checklist savedChecklist = checklistRepository.save(checklist);

        populateChecklistFromTemplate(savedChecklist, tx);
        return savedChecklist;
    }

    private void populateChecklistFromTemplate(Checklist checklist, Transaction tx) {
        java.util.Optional<com.audit.api.entity.ChecklistTemplate> templateOpt = java.util.Optional.empty();

        // Priority 1: Match by categoryId (user-created OrgCategory-linked template)
        if (tx.getCategoryId() != null) {
            templateOpt = checklistTemplateRepository.findByCategoryId(tx.getCategoryId());
        }

        // Priority 2: Match by category name (for transactions where categoryId is null)
        if (!templateOpt.isPresent() && tx.getCategoryName() != null && !tx.getCategoryName().isEmpty()) {
            String catName = tx.getCategoryName().trim().toLowerCase();
            templateOpt = checklistTemplateRepository.findAll().stream()
                    .filter(t -> t.getName() != null &&
                            (t.getName().trim().toLowerCase().equals(catName) ||
                             t.getName().trim().toLowerCase().contains(catName) ||
                             catName.contains(t.getName().trim().toLowerCase())))
                    .findFirst();
        }

        // Only populate if a matching user-defined template was found
        // Do NOT fall back to unrelated templates
        if (!templateOpt.isPresent()) {
            return;
        }

        com.audit.api.entity.ChecklistTemplate template = templateOpt.get();
        List<ChecklistItemTemplate> itemTemplates =
                checklistItemTemplateRepository.findByTemplateId(template.getId());

        for (ChecklistItemTemplate itemTemplate : itemTemplates) {
            ChecklistItem item = new ChecklistItem();
            item.setChecklistId(checklist.getId());
            item.setDescription(itemTemplate.getDescription());
            item.setMandatory(itemTemplate.isMandatory());
            item.setProvided(false);
            item.setOrganizationId(checklist.getOrganizationId());
            checklistItemRepository.save(item);
        }
    }

    public List<ChecklistItemResponse> getChecklistItemsWithDocNames(UUID checklistId) {
        List<ChecklistItem> items = checklistItemRepository.findByChecklistId(checklistId);
        return items.stream().map(item -> {
            String docName = null;
            if (item.getDocumentId() != null) {
                Document doc = documentService.getDocument(item.getDocumentId());
                if (doc != null) docName = doc.getFileName();
            }
            return new ChecklistItemResponse(
                item.getId(),
                item.getChecklistId(),
                item.getDescription(),
                item.isMandatory(),
                item.isProvided(),
                item.getDocumentId(),
                docName
            );
        }).collect(Collectors.toList());
    }

    @Transactional
    public ChecklistItem uploadEvidence(UUID checklistItemId, MultipartFile file) throws Exception {
        ChecklistItem item = checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));

        Document doc = documentService.uploadDocument(file);
        item.setDocumentId(doc.getId());
        item.setProvided(true);
        item = checklistItemRepository.save(item);

        updateChecklistCompletion(item.getChecklistId());

        // Also update transaction status
        checklistRepository.findById(item.getChecklistId()).ifPresent(cl -> {
            transactionRepository.findById(cl.getTransactionId()).ifPresent(tx -> {
                tx.setBankMatched(true);
                bankValidationService.evaluateBankValidationRequirement(tx);
                transactionRepository.save(tx);
            });
        });

        return item;
    }

    @Transactional
    public ChecklistItem addItem(UUID transactionId, ChecklistItem item) {
        Checklist cl = getOrCreateChecklist(transactionId);
        item.setChecklistId(cl.getId());
        item.setOrganizationId(cl.getOrganizationId());
        return checklistItemRepository.save(item);
    }

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
        long mandatoryCount = checklistItemRepository.countByChecklistIdAndMandatory(checklistId, true);
        long mandatoryProvidedCount = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(checklistId, true, true);
        boolean complete = mandatoryCount > 0 && mandatoryCount == mandatoryProvidedCount;

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
