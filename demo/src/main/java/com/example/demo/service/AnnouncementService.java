package com.example.demo.service;

import com.example.demo.model.Announcement;
import com.example.demo.model.User;
import com.example.demo.repository.AnnouncementRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Announcement> getActiveAnnouncements() {
        return announcementRepository.findByActiveTrueOrderByCreatedAtDesc();
    }

    @Transactional
    public Announcement createAnnouncement(
            String title,
            String message,
            List<String> targetRoles,
            String priority
    ) {
        List<String> normalizedRoles = normalizeRoles(targetRoles);
        validateAnnouncement(title, message, normalizedRoles, priority);

        Announcement announcement = Announcement.builder()
                .title(title.trim())
                .message(message.trim())
                .targetRoles(new ArrayList<>(normalizedRoles))
                .priority(priority.trim().toUpperCase())
                .active(true)
                .build();

        Announcement savedAnnouncement = announcementRepository.save(announcement);

        sendAnnouncementNotifications(savedAnnouncement);

        log.info(
                "Announcement created: id={}, targetRoles={}",
                savedAnnouncement.getId(),
                savedAnnouncement.getTargetRoles()
        );

        return savedAnnouncement;
    }

    @Transactional
    public Announcement updateAnnouncement(
            Long id,
            String title,
            String message,
            List<String> targetRoles,
            String priority,
            Boolean active
    ) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));

        List<String> normalizedRoles = normalizeRoles(targetRoles);
        validateAnnouncement(title, message, normalizedRoles, priority);

        announcement.setTitle(title.trim());
        announcement.setMessage(message.trim());
        announcement.setPriority(priority.trim().toUpperCase());

        if (active != null) {
            announcement.setActive(active);
        }

        // IMPORTANT: update ElementCollection in-place
        announcement.getTargetRoles().clear();
        announcement.getTargetRoles().addAll(normalizedRoles);

        Announcement updatedAnnouncement = announcementRepository.save(announcement);

        log.info(
                "Announcement updated: id={}, targetRoles={}",
                updatedAnnouncement.getId(),
                updatedAnnouncement.getTargetRoles()
        );

        return updatedAnnouncement;
    }

    @Transactional
    public void deleteAnnouncement(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));

        announcementRepository.delete(announcement);
        log.info("Announcement deleted: id={}", id);
    }

    private void sendAnnouncementNotifications(Announcement announcement) {
        String type = "ANNOUNCEMENT";
        String referenceId = String.valueOf(announcement.getId());
        List<String> targetRoles = announcement.getTargetRoles();

        if (targetRoles.contains("ALL")) {
            List<User> users = userRepository.findAll();

            users.forEach(user ->
                    notificationService.notifyUser(
                            user.getId(),
                            announcement.getTitle(),
                            announcement.getMessage(),
                            type,
                            referenceId
                    )
            );

            log.info("Announcement notification sent to all users: count={}", users.size());
            return;
        }

        for (String role : targetRoles) {
            notificationService.notifyUsersByRole(
                    role,
                    announcement.getTitle(),
                    announcement.getMessage(),
                    type,
                    referenceId
            );
        }
    }

    private List<String> normalizeRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            throw new RuntimeException("At least one target role is required");
        }

        Set<String> normalized = new LinkedHashSet<>();

        for (String role : roles) {
            if (role == null || role.trim().isEmpty()) continue;
            normalized.add(role.trim().toUpperCase());
        }

        if (normalized.isEmpty()) {
            throw new RuntimeException("At least one target role is required");
        }

        if (normalized.contains("ALL")) {
            return new ArrayList<>(List.of("ALL"));
        }

        return new ArrayList<>(normalized);
    }

    private void validateAnnouncement(
            String title,
            String message,
            List<String> targetRoles,
            String priority
    ) {
        if (title == null || title.trim().isEmpty()) {
            throw new RuntimeException("Title is required");
        }

        if (message == null || message.trim().isEmpty()) {
            throw new RuntimeException("Message is required");
        }

        if (targetRoles == null || targetRoles.isEmpty()) {
            throw new RuntimeException("At least one target role is required");
        }

        if (priority == null || priority.trim().isEmpty()) {
            throw new RuntimeException("Priority is required");
        }

        List<String> allowedRoles = List.of(
                "ALL",
                "STUDENT",
                "LECTURER",
                "TECHNICIAN",
                "MANAGER",
                "ADMIN"
        );

        for (String role : targetRoles) {
            if (!allowedRoles.contains(role)) {
                throw new RuntimeException("Invalid target role");
            }
        }

        List<String> allowedPriorities = List.of("NORMAL", "IMPORTANT");
        String normalizedPriority = priority.trim().toUpperCase();

        if (!allowedPriorities.contains(normalizedPriority)) {
            throw new RuntimeException("Invalid priority");
        }
    }
}