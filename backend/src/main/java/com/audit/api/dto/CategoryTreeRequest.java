package com.audit.api.dto;

import java.util.List;

public class CategoryTreeRequest {

    private List<L1Category> categories;

    public List<L1Category> getCategories() { return categories; }
    public void setCategories(List<L1Category> categories) { this.categories = categories; }

    public static class L1Category {
        private String name;
        private List<String> children;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public List<String> getChildren() { return children; }
        public void setChildren(List<String> children) { this.children = children; }
    }
}
