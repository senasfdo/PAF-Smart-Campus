package com.example.demo.controllers;

import com.example.demo.model.Announcement;
import com.example.demo.service.AnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getAllAnnouncements() {
        List<Announcement> announcements = announcementService.getAllAnnouncements();
        return ResponseEntity.ok(announcements);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getActiveAnnouncements() {
        List<Announcement> announcements = announcementService.getActiveAnnouncements();
        return ResponseEntity.ok(announcements);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> createAnnouncement(@RequestBody Map<String, Object> request) {
        try {
            String title = request.get("title") != null ? request.get("title").toString() : null;
            String message = request.get("message") != null ? request.get("message").toString() : null;
            List<String> targetRoles = extractTargetRoles(request);
            String priority = request.get("priority") != null ? request.get("priority").toString() : null;

            Announcement announcement = announcementService.createAnnouncement(
                    title,
                    message,
                    targetRoles,
                    priority
            );

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Announcement created successfully");
            response.put("announcement", announcement);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(errorBody(e, "Failed to create announcement"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(errorBody(e, "Unexpected error while creating announcement"));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> updateAnnouncement(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        try {
            String title = request.get("title") != null ? request.get("title").toString() : null;
            String message = request.get("message") != null ? request.get("message").toString() : null;
            List<String> targetRoles = extractTargetRoles(request);
            String priority = request.get("priority") != null ? request.get("priority").toString() : null;

            Boolean active = null;
            if (request.get("active") != null) {
                active = Boolean.valueOf(request.get("active").toString());
            }

            Announcement announcement = announcementService.updateAnnouncement(
                    id,
                    title,
                    message,
                    targetRoles,
                    priority,
                    active
            );

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Announcement updated successfully");
            response.put("announcement", announcement);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(errorBody(e, "Failed to update announcement"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(errorBody(e, "Unexpected error while updating announcement"));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        try {
            announcementService.deleteAnnouncement(id);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Announcement deleted successfully");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(errorBody(e, "Failed to delete announcement"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(errorBody(e, "Unexpected error while deleting announcement"));
        }
    }

    private List<String> extractTargetRoles(Map<String, Object> request) {
        Object rolesValue = request.get("targetRoles");
        if (rolesValue instanceof List<?> list) {
            List<String> roles = new ArrayList<>();
            for (Object item : list) {
                if (item != null) {
                    roles.add(item.toString());
                }
            }
            return roles;
        }

        Object legacyRole = request.get("targetRole");
        if (legacyRole != null) {
            return List.of(legacyRole.toString());
        }

        return List.of();
    }

    private Map<String, Object> errorBody(Exception e, String fallbackMessage) {
        Map<String, Object> body = new LinkedHashMap<>();

        String message = e.getMessage();
        if (message == null || message.isBlank()) {
            message = fallbackMessage;
        }

        body.put("error", message);
        return body;
    }
}