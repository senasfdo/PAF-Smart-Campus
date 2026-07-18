package com.example.demo.repository;

import com.example.demo.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Get all notifications for a user
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Get unread notifications count for a user
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    long countUnreadByUserId(Long userId);

    // Mark notification as read
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :notificationId AND n.user.id = :userId")
    void markAsRead(Long notificationId, Long userId);

    // Mark all notifications as read for a user
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsRead(Long userId);

    // Delete all read notifications for a user
    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId AND n.isRead = true")
    void deleteAllRead(Long userId);
}