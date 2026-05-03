package com.audit.api.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "master_categories")
public class MasterCategory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "parent_id")
    private UUID parentId; // null = Level 1, non-null = Level 2

    @Column(nullable = false)
    private int level = 1; // 1 or 2

    public MasterCategory() {}

    public MasterCategory(String name, UUID organizationId) {
        this.name = name;
        this.level = 1;
        setOrganizationId(organizationId);
    }

    public MasterCategory(String name, UUID parentId, UUID organizationId) {
        this.name = name;
        this.parentId = parentId;
        this.level = 2;
        setOrganizationId(organizationId);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public UUID getParentId() { return parentId; }
    public void setParentId(UUID parentId) { this.parentId = parentId; }
    public int getLevel() { return level; }
    public void setLevel(int level) { this.level = level; }
}
