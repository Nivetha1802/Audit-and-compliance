package com.audit.api.repository;

import com.audit.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    java.util.List<User> findByOrganizationId(UUID organizationId);
}
