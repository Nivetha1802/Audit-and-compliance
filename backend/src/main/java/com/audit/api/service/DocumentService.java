package com.audit.api.service;

import com.audit.api.entity.Document;
import com.audit.api.repository.DocumentRepository;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class DocumentService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final DocumentRepository documentRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public DocumentService(DocumentRepository documentRepository, SecurityUtils securityUtils) {
        this.documentRepository = documentRepository;
        this.securityUtils = securityUtils;
    }

    public Document uploadDocument(MultipartFile file) throws Exception {
        UUID orgId = securityUtils.getCurrentOrganizationId();
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, orgId.toString(), fileName);

        Files.createDirectories(filePath.getParent());
        Files.copy(file.getInputStream(), filePath);

        Document document = Document.builder()
                .fileName(file.getOriginalFilename())
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .build();
        document.setOrganizationId(orgId);

        return documentRepository.save(document);
    }

    public Document getDocument(UUID id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (!document.getOrganizationId().equals(securityUtils.getCurrentOrganizationId())) {
            throw new RuntimeException("Unauthorized access");
        }

        return document;
    }
}
