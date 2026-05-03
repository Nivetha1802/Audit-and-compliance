package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "checklists")
public class Checklist extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_id", nullable = false)
    private UUID transactionId;

    private boolean completed = false;

    public Checklist() {}

    public Checklist(UUID id, UUID transactionId, boolean completed) {
        this.id = id;
        this.transactionId = transactionId;
        this.completed = completed;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private UUID transactionId;
        private boolean completed = false;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder transactionId(UUID transactionId) { this.transactionId = transactionId; return this; }
        public Builder completed(boolean completed) { this.completed = completed; return this; }

        public Checklist build() {
            return new Checklist(id, transactionId, completed);
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTransactionId() { return transactionId; }
    public void setTransactionId(UUID transactionId) { this.transactionId = transactionId; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
}
