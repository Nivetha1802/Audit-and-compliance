package com.audit.api.dto;

import java.util.List;

public class ChecklistTemplateRequest {

    private String name;
    private String category;
    private List<ItemRequest> items;

    public ChecklistTemplateRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public List<ItemRequest> getItems() { return items; }
    public void setItems(List<ItemRequest> items) { this.items = items; }

    public static class ItemRequest {
        private String description;
        private boolean mandatory = true;

        public ItemRequest() {}

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public boolean isMandatory() { return mandatory; }
        public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }
    }
}
