package com.audit.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "task_comments")
public class TaskComment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID taskId;
    private UUID userId;
    private String userName;
    private String comment;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTaskId() { return taskId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    
    public static class TaskCommentBuilder {
        private UUID taskId;
        private UUID userId;
        private String userName;
        private String comment;
        private UUID organizationId;
        
        public TaskCommentBuilder taskId(UUID taskId) { this.taskId = taskId; return this; }
        public TaskCommentBuilder userId(UUID userId) { this.userId = userId; return this; }
        public TaskCommentBuilder userName(String userName) { this.userName = userName; return this; }
        public TaskCommentBuilder comment(String comment) { this.comment = comment; return this; }
        public TaskCommentBuilder organizationId(UUID organizationId) { this.organizationId = organizationId; return this; }
        
        public TaskComment build() {
            TaskComment tc = new TaskComment();
            tc.setTaskId(taskId);
            tc.setUserId(userId);
            tc.setUserName(userName);
            tc.setComment(comment);
            tc.setOrganizationId(organizationId);
            return tc;
        }
    }
    
    public static TaskCommentBuilder builder() {
        return new TaskCommentBuilder();
    }
}
