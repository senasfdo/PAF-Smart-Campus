package com.example.demo.service;

import com.example.demo.dto.NotificationDTO;
import com.example.demo.model.Notification;
import com.example.demo.model.User;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // Send notification to a specific user
    @Transactional
    public void notifyUser(Long userId, String title, String message) {
        notifyUser(userId, title, message, "SYSTEM", null);
    }

    // Send notification with type and reference
    @Transactional
    public void notifyUser(Long userId, String title, String message, String type, String referenceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notification sent to user {}: {} - {}", userId, title, message);
    }

    // Send notification to all managers (users with role MANAGER or ADMIN)
    @Transactional
    public void notifyManagers(String title, String message) {
        notifyManagers(title, message, "SYSTEM", null);
    }

    @Transactional
    public void notifyManagers(String title, String message, String type, String referenceId) {
        List<User> managers = userRepository.findByRole("MANAGER");
        List<User> admins = userRepository.findByRole("ADMIN");
        
        managers.forEach(manager -> {
            notifyUser(manager.getId(), title, message, type, referenceId);
        });
        
        admins.forEach(admin -> {
            notifyUser(admin.getId(), title, message, type, referenceId);
        });
        
        log.info("Notification sent to {} managers and {} admins", managers.size(), admins.size());
    }

    // Send notification to all technicians
    @Transactional
    public void notifyTechnicians(String title, String message, String type, String referenceId) {
        List<User> technicians = userRepository.findByRole("TECHNICIAN");
        
        technicians.forEach(tech -> {
            notifyUser(tech.getId(), title, message, type, referenceId);
        });
        
        log.info("Notification sent to {} technicians", technicians.size());
    }

    // Send notification to all users with a specific role
    @Transactional
    public void notifyUsersByRole(String role, String title, String message, String type, String referenceId) {
        List<User> users = userRepository.findByRole(role.toUpperCase());
        
        users.forEach(user -> {
            notifyUser(user.getId(), title, message, type, referenceId);
        });
        
        log.info("Notification sent to {} users with role: {}", users.size(), role);
    }

    // Get all notifications for current user
    public List<NotificationDTO> getUserNotifications(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return notifications.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Get unread notifications count
    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    // Mark notification as read
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.markAsRead(notificationId, userId);
    }

    // Mark all notifications as read
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    // Delete all read notifications
    @Transactional
    public void deleteAllRead(Long userId) {
        notificationRepository.deleteAllRead(userId);
    }

    // Delete a specific notification
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only delete your own notifications");
        }
        
        notificationRepository.delete(notification);
    }

    // Convert entity to DTO
    private NotificationDTO convertToDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setReferenceId(notification.getReferenceId());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }
}