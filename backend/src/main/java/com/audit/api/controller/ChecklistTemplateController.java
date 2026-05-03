package com.audit.api.controller;

import com.audit.api.dto.ChecklistTemplateRequest;
import com.audit.api.entity.ChecklistTemplate;
import com.audit.api.entity.ChecklistItemTemplate;
import com.audit.api.repository.ChecklistTemplateRepository;
import com.audit.api.repository.ChecklistItemTemplateRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/checklist-templates")
public class ChecklistTemplateController {

    private final ChecklistTemplateRepository templateRepository;
    private final ChecklistItemTemplateRepository itemRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public ChecklistTemplateController(ChecklistTemplateRepository templateRepository,
                                       ChecklistItemTemplateRepository itemRepository,
                                       SecurityUtils securityUtils) {
        this.templateRepository = templateRepository;
        this.itemRepository = itemRepository;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<List<ChecklistTemplate>> getAllTemplates() {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        return ResponseEntity.ok(templateRepository.findByOrganizationId(orgId));
    }

    @PostMapping
    public ResponseEntity<ChecklistTemplate> createTemplate(@RequestBody ChecklistTemplateRequest request) {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        ChecklistTemplate template = new ChecklistTemplate();
        template.setName(request.getName());
        template.setDescription(request.getCategory());
        template.setOrganizationId(orgId);
        ChecklistTemplate saved = templateRepository.save(template);

        saveItems(request, saved.getId(), orgId);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChecklistTemplate> updateTemplate(@PathVariable UUID id,
                                                            @RequestBody ChecklistTemplateRequest request) {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        ChecklistTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        template.setName(request.getName());
        template.setDescription(request.getCategory());
        ChecklistTemplate saved = templateRepository.save(template);

        // Replace items
        itemRepository.deleteAll(itemRepository.findByTemplateId(id));
        saveItems(request, saved.getId(), orgId);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<ChecklistItemTemplate>> getTemplateItems(@PathVariable UUID id) {
        return ResponseEntity.ok(itemRepository.findByTemplateId(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        itemRepository.deleteAll(itemRepository.findByTemplateId(id));
        templateRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void saveItems(ChecklistTemplateRequest request, UUID templateId, UUID orgId) {
        if (request.getItems() == null) return;
        List<ChecklistItemTemplate> items = request.getItems().stream().map(itemReq -> {
            ChecklistItemTemplate item = new ChecklistItemTemplate();
            item.setTemplateId(templateId);
            item.setDescription(itemReq.getDescription());
            item.setMandatory(itemReq.isMandatory());
            item.setOrganizationId(orgId);
            return item;
        }).collect(Collectors.toList());
        itemRepository.saveAll(items);
    }
}
