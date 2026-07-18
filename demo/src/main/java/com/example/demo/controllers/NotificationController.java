package com.example.demo.controllers;

import com.example.demo.dto.NotificationDTO;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    // Get all notifications for current user
    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getMyNotifications(Authentication auth) {
        User user = getUserFromAuth(auth);
        List<NotificationDTO> notifications = notificationService.getUserNotifications(user.getId());
        return ResponseEntity.ok(notifications);
    }

    // Get unread count
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        User user = getUserFromAuth(auth);
        long count = notificationService.getUnreadCount(user.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // Mark notification as read
    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication auth) {
        User user = getUserFromAuth(auth);
        notificationService.markAsRead(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    // Mark all notifications as read
    @PutMapping("/read-all")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> markAllAsRead(Authentication auth) {
        User user = getUserFromAuth(auth);
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    // Delete all read notifications
    @DeleteMapping("/read")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteAllRead(Authentication auth) {
        User user = getUserFromAuth(auth);
        notificationService.deleteAllRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "All read notifications deleted"));
    }

    // Delete a specific notification
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'TECHNICIAN', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Authentication auth) {
        User user = getUserFromAuth(auth);
        notificationService.deleteNotification(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    // Helper method
    private User getUserFromAuth(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}