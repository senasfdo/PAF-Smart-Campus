package com.example.demo.service;

import com.example.demo.dto.CommentDTO;
import com.example.demo.model.Comment;
import com.example.demo.model.Ticket;
import com.example.demo.model.User;
import com.example.demo.repository.CommentRepository;
import com.example.demo.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;

    // Add comment to ticket.
    @Transactional
    public Comment addComment(Long ticketId, CommentDTO dto, User author) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        Comment comment = Comment.builder()
                .content(dto.getContent())
                .author(author)
                .ticket(ticket)
                .build();

        Comment savedComment = commentRepository.save(comment);

        // Notify ticket reporter (if not the comment author)
        if (!ticket.getReportedBy().getId().equals(author.getId())) {
            notificationService.notifyUser(ticket.getReportedBy().getId(),
                    "New comment on your ticket",
                    ticket.getTitle() + ": " + dto.getContent().substring(0, Math.min(50, dto.getContent().length())));
        }

        // Notify assigned technician (if exists and not comment author)
        if (ticket.getAssignedTo() != null && !ticket.getAssignedTo().getId().equals(author.getId())) {
            notificationService.notifyUser(ticket.getAssignedTo().getId(),
                    "New comment on assigned ticket",
                    ticket.getTitle() + ": " + dto.getContent().substring(0, Math.min(50, dto.getContent().length())));
        }

        return savedComment;
    }

    // Get comments for a ticket
    public List<Comment> getTicketComments(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    // Update comment (only author can update within 5 minutes)
    @Transactional
    public Comment updateComment(Long commentId, CommentDTO dto, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        // Check if user is the author
        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You can only edit your own comments");
        }

        // Check if within 5 minutes
        if (comment.getCreatedAt().plusMinutes(5).isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Comments can only be edited within 5 minutes of posting");
        }

        comment.setContent(dto.getContent());
        return commentRepository.save(comment);
    }

    // Delete the comment (author or admin) 
    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        boolean isAuthor = comment.getAuthor().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole().equals("ADMIN");

        if (!isAuthor && !isAdmin) {
            throw new RuntimeException("You can only delete your own comments");
        }

        commentRepository.delete(comment);
    }
}