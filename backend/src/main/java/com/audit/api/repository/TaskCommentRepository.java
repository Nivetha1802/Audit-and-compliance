package com.audit.api.repository;

import com.audit.api.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskComment, UUID> {
    List<TaskComment> findByTaskIdOrderByCreatedAtDesc(UUID taskId);
    List<TaskComment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
    @Modifying
    @Transactional
    void deleteByTaskIdIn(List<UUID> taskIds);
}
