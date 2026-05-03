package com.audit.api.service;

import com.audit.api.entity.*;
import com.audit.api.repository.*;
import com.audit.api.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final FindingRepository findingRepository;
    private final ProjectRepository projectRepository;
    private final AuditTaskRepository taskRepository;
    private final ChecklistRepository checklistRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    @Autowired
    public DashboardService(TransactionRepository transactionRepository,
                             FindingRepository findingRepository,
                             ProjectRepository projectRepository,
                             AuditTaskRepository taskRepository,
                             ChecklistRepository checklistRepository,
                             UserRepository userRepository,
                             SecurityUtils securityUtils) {
        this.transactionRepository = transactionRepository;
        this.findingRepository = findingRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.checklistRepository = checklistRepository;
        this.userRepository = userRepository;
        this.securityUtils = securityUtils;
    }

    public Map<String, Object> getDashboardStats() {
        UUID orgId = securityUtils.getCurrentOrganizationId();

        List<Transaction> transactions = transactionRepository.findByOrganizationId(orgId);
        List<Finding> findings = findingRepository.findByOrganizationId(orgId);
        List<Project> projects = projectRepository.findByOrganizationId(orgId);
        List<AuditTask> tasks = taskRepository.findByOrganizationId(orgId);
        List<Checklist> checklists = checklistRepository.findByOrganizationId(orgId);
        List<User> orgUsers = userRepository.findByOrganizationId(orgId);

        Map<String, Object> stats = new LinkedHashMap<>();

        // ── Overview ──
        stats.put("totalProjects", projects.size());
        stats.put("totalTransactions", transactions.size());
        stats.put("totalFindings", findings.size());
        stats.put("totalUsers", orgUsers.size());
        stats.put("openTasks", tasks.stream().filter(t -> !List.of("COMPLETED","REJECTED").contains(t.getStatus())).count());

        // ── Audit Readiness ──
        long completedChecklists = checklists.stream().filter(Checklist::isCompleted).count();
        int readinessPct = checklists.isEmpty() ? 0
                : (int) Math.round((completedChecklists * 100.0) / checklists.size());
        stats.put("auditReadinessPct", readinessPct);
        stats.put("checklistsCompleted", completedChecklists);
        stats.put("checklistsTotal", checklists.size());

        // ── Risk Summary Details ──
        long criticalFindings = findings.stream().filter(f -> "CRITICAL".equals(f.getSeverity())).count();
        long highFindings     = findings.stream().filter(f -> "HIGH".equals(f.getSeverity())).count();
        long openFindings     = findings.stream().filter(f -> !"CLOSED".equals(f.getStatus())).count();
        long pendingEvidence  = transactions.stream().filter(t -> "PENDING_EVIDENCE".equals(t.getStatus())).count();
        long overdueTasks     = tasks.stream().filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(LocalDate.now()) && !"COMPLETED".equals(t.getStatus())).count();
        
        stats.put("riskScore", calculateRiskScore(criticalFindings, highFindings, openFindings, pendingEvidence));

        // ── Transaction status breakdown ──
        Map<String, Long> txByStatus = transactions.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus() != null ? t.getStatus() : "UNKNOWN", Collectors.counting()));
        stats.put("transactionsByStatus", txByStatus);

        // ── Findings by severity ──
        Map<String, Long> findingsBySeverity = findings.stream()
                .collect(Collectors.groupingBy(f -> f.getSeverity() != null ? f.getSeverity() : "UNKNOWN", Collectors.counting()));
        stats.put("findingsBySeverity", findingsBySeverity);

        // ── Recent Findings ──
        stats.put("recentFindings", findings.stream()
                .sorted(Comparator.comparing(BaseEntity::getCreatedAt).reversed())
                .limit(5)
                .map(f -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", f.getId());
                    m.put("title", f.getTitle());
                    m.put("severity", f.getSeverity());
                    m.put("status", f.getStatus());
                    return m;
                }).collect(Collectors.toList()));

        // ── Risk summary stats ──
        stats.put("riskSummary", Map.of(
                "critical", criticalFindings,
                "high", highFindings,
                "openFindings", openFindings,
                "pendingEvidence", pendingEvidence,
                "overdueTasks", overdueTasks
        ));

        // ── Transactions by category ──
        Map<String, Long> txByCategory = transactions.stream()
                .filter(t -> t.getCategoryName() != null && !t.getCategoryName().isBlank())
                .collect(Collectors.groupingBy(Transaction::getCategoryName, Collectors.counting()));
        stats.put("transactionsByCategory", txByCategory);

        // ── Activity Timeline ──
        stats.put("activityTimeline", transactions.stream()
                .sorted(Comparator.comparing(BaseEntity::getCreatedAt).reversed())
                .limit(5)
                .map(t -> t.getDescription() + " - " + t.getStatus())
                .collect(Collectors.toList()));

        return stats;
    }

    private int calculateRiskScore(long critical, long high, long open, long pending) {
        long score = (critical * 25) + (high * 15) + (open * 5) + (pending * 2);
        return (int) Math.min(100, score);
    }
}
