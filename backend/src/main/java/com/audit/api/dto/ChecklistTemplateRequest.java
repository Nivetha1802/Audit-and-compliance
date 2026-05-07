package com.audit.api.dto;

import java.util.List;

public class ChecklistTemplateRequest {

    private String name;
    private List<String> categories; // multiple category names
    private List<ItemRequest> items;

    public ChecklistTemplateRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }

    // Legacy single-category support — joins into comma-separated string
    public String getCategory() {
        return categories != null ? String.join(",", categories) : null;
    }
    public void setCategory(String category) {
        if (category != null && !category.isBlank()) {
            this.categories = List.of(category.split(","));
        }
    }
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
