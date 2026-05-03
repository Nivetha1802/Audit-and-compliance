package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "comments")
public class Comment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "finding_id", nullable = false)
    private UUID findingId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public Comment() {}

    public Comment(UUID id, UUID findingId, String content, UUID userId) {
        this.id = id;
        this.findingId = findingId;
        this.content = content;
        this.userId = userId;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID findingId;
        private String content;
        private UUID userId;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder findingId(UUID findingId) { this.findingId = findingId; return this; }
        public Builder content(String content) { this.content = content; return this; }
        public Builder userId(UUID userId) { this.userId = userId; return this; }

        public Comment build() {
            return new Comment(id, findingId, content, userId);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getFindingId() { return findingId; }
    public void setFindingId(UUID findingId) { this.findingId = findingId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
}
