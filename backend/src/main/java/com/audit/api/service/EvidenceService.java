package com.audit.api.service;

import com.audit.api.dto.ChecklistItemResponse;
import com.audit.api.entity.*;
import com.audit.api.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class EvidenceService {

    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentService documentService;
    private final BankValidationService bankValidationService;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final ChecklistTemplateRepository checklistTemplateRepository;
    private final ChecklistItemTemplateRepository checklistItemTemplateRepository;
    private final AiAnalysisService aiAnalysisService;

    public EvidenceService(
            ChecklistRepository checklistRepository,
            ChecklistItemRepository checklistItemRepository,
            DocumentService documentService,
            BankValidationService bankValidationService,
            TransactionRepository transactionRepository,
            ChecklistTemplateRepository checklistTemplateRepository,
            ChecklistItemTemplateRepository checklistItemTemplateRepository,
            TransactionService transactionService,
            AiAnalysisService aiAnalysisService) {
        this.checklistRepository = checklistRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.documentService = documentService;
        this.bankValidationService = bankValidationService;
        this.transactionRepository = transactionRepository;
        this.checklistTemplateRepository = checklistTemplateRepository;
        this.checklistItemTemplateRepository = checklistItemTemplateRepository;
        this.transactionService = transactionService;
        this.aiAnalysisService = aiAnalysisService;
    }

    @Transactional
    public Checklist getOrCreateChecklist(UUID transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + transactionId));

        if (tx.getVendorId() == null) {
            transactionService.autoLinkVendor(tx, tx.getOrganizationId());
            if (tx.getVendorId() != null) {
                transactionRepository.save(tx);
            }
        }

        Checklist checklist = checklistRepository.findByTransactionId(transactionId)
                .orElseGet(() -> {
                    Checklist newCl = new Checklist();
                    newCl.setTransactionId(transactionId);
                    newCl.setCompleted(false);
                    newCl.setOrganizationId(tx.getOrganizationId());
                    return checklistRepository.save(newCl);
                });

        syncChecklistWithTemplate(checklist, tx);

        return checklist;
    }

    private Optional<ChecklistTemplate> findTemplateForTransaction(Transaction tx) {
        UUID orgId = tx.getOrganizationId();
        if (orgId == null) return Optional.empty();

        List<ChecklistTemplate> templates = checklistTemplateRepository.findByOrganizationId(orgId);
        if (templates.isEmpty()) return Optional.empty();

        if (tx.getCategoryId() != null) {
            Optional<ChecklistTemplate> match = templates.stream()
                    .filter(t -> tx.getCategoryId().equals(t.getCategoryId()))
                    .findFirst();
            if (match.isPresent()) return match;
        }

        if (tx.getCategoryName() != null && !tx.getCategoryName().isBlank()) {
            String target = tx.getCategoryName().trim().toLowerCase();
            Optional<ChecklistTemplate> match = templates.stream()
                    .filter(t -> {
                        if (t.getDescription() == null || t.getDescription().isBlank()) return false;
                        return Arrays.stream(t.getDescription().split(","))
                                .anyMatch(c -> c.trim().equalsIgnoreCase(target));
                    })
                    .findFirst();
            if (match.isPresent()) return match;

            match = templates.stream()
                    .filter(t -> t.getName() != null &&
                                 t.getName().toLowerCase().contains(target))
                    .findFirst();
            if (match.isPresent()) return match;
        }

        return Optional.of(templates.get(0));
    }

    @Transactional
    public void syncChecklistWithTemplate(Checklist checklist, Transaction tx) {
        Optional<ChecklistTemplate> templateOpt = findTemplateForTransaction(tx);
        if (!templateOpt.isPresent()) return;

        ChecklistTemplate template = templateOpt.get();
        List<ChecklistItemTemplate> templateItems =
                checklistItemTemplateRepository.findByTemplateId(template.getId());
        List<ChecklistItem> existingItems =
                checklistItemRepository.findByChecklistId(checklist.getId());

        Map<String, ChecklistItemTemplate> templateItemMap = templateItems.stream()
                .collect(Collectors.toMap(
                        i -> i.getDescription().trim().toLowerCase(),
                        i -> i,
                        (a, b) -> a
                ));

        Set<String> templateDescriptions = templateItemMap.keySet();

        for (ChecklistItem existing : existingItems) {
            String key = existing.getDescription().trim().toLowerCase();

            if (templateDescriptions.contains(key)) {
                ChecklistItemTemplate tItem = templateItemMap.get(key);
                if (existing.isMandatory() != tItem.isMandatory()) {
                    existing.setMandatory(tItem.isMandatory());
                    checklistItemRepository.save(existing);
                }
                templateItemMap.remove(key);
            } else {
                if (existing.getDocumentId() == null) {
                    checklistItemRepository.delete(existing);
                }
            }
        }

        for (ChecklistItemTemplate newItem : templateItemMap.values()) {
            ChecklistItem item = new ChecklistItem();
            item.setChecklistId(checklist.getId());
            item.setDescription(newItem.getDescription());
            item.setMandatory(newItem.isMandatory());
            item.setProvided(false);
            item.setOrganizationId(checklist.getOrganizationId());
            checklistItemRepository.save(item);
        }

        updateChecklistCompletion(checklist.getId());
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
        final ChecklistItem item = checklistItemRepository.findById(checklistItemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found: " + checklistItemId));

        Checklist cl = checklistRepository.findById(item.getChecklistId())
                .orElseThrow(() -> new RuntimeException("Checklist not found: " + item.getChecklistId()));

        Document doc = documentService.uploadDocument(file, cl.getTransactionId());
        item.setDocumentId(doc.getId());
        item.setProvided(true);
        ChecklistItem savedItem = checklistItemRepository.save(item);

        updateChecklistCompletion(savedItem.getChecklistId());

        transactionRepository.findById(cl.getTransactionId()).ifPresent(txn -> {
            txn.setBankMatched(true);
            bankValidationService.evaluateBankValidationRequirement(txn);
            transactionRepository.save(txn);

            // Trigger AI Analysis to extract document numbers
            try {
                aiAnalysisService.runThreeWayMatchFromDocuments(txn.getId());
            } catch (Exception e) {
                // Log and continue, AI failure shouldn't block the upload process
                System.err.println("AI Extraction failed: " + e.getMessage());
            }
        });

        return savedItem;
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
                .orElseThrow(() -> new RuntimeException("Checklist item not found: " + checklistItemId));
        item.setDocumentId(null);
        item.setProvided(false);
        ChecklistItem savedItem = checklistItemRepository.save(item);
        updateChecklistCompletion(savedItem.getChecklistId());

        checklistRepository.findById(savedItem.getChecklistId()).ifPresent(cl ->
                transactionRepository.findById(cl.getTransactionId()).ifPresent(txn -> {
                    bankValidationService.evaluateBankValidationRequirement(txn);
                    transactionRepository.save(txn);
                })
        );

        return savedItem;
    }

    private void updateChecklistCompletion(UUID checklistId) {
        long mandatory = checklistItemRepository.countByChecklistIdAndMandatory(checklistId, true);
        long provided  = checklistItemRepository.countByChecklistIdAndMandatoryAndProvided(checklistId, true, true);
        boolean complete = mandatory > 0 && mandatory == provided;

        checklistRepository.findById(checklistId).ifPresent(cl -> {
            cl.setCompleted(complete);
            checklistRepository.save(cl);
        });
    }

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
