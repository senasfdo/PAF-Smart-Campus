package com.example.demo.repository;

import com.example.demo.model.Ticket;
import com.example.demo.model.TicketPriority;
import com.example.demo.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    // Get tickets by reporter
    List<Ticket> findByReportedById(Long userId);

    // Get tickets by assigned technician
    List<Ticket> findByAssignedToId(Long technicianId);

    // Get tickets by status
    List<Ticket> findByStatus(TicketStatus status);

    // Get tickets by priority
    List<Ticket> findByPriority(TicketPriority priority);

    // Get tickets by category
    List<Ticket> findByCategory(String category);

    // Get open tickets (not closed or rejected)
    @Query("SELECT t FROM Ticket t WHERE t.status != 'CLOSED' AND t.status != 'REJECTED' ORDER BY t.priority DESC, t.createdAt ASC")
    List<Ticket> findOpenTickets();

    // Get tickets assigned to technician with status
    List<Ticket> findByAssignedToIdAndStatus(Long technicianId, TicketStatus status);

    // Get tickets by date range
    @Query("SELECT t FROM Ticket t WHERE t.createdAt BETWEEN :start AND :end")
    List<Ticket> findTicketsByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Get unresolved tickets count
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.status != 'CLOSED' AND t.status != 'RESOLVED' AND t.status != 'REJECTED'")
    long countUnresolvedTickets();

    // Get tickets by resource
    List<Ticket> findByResourceName(String resourceName);

    // Get active tickets for duplicate detection
    @Query("""
        SELECT t FROM Ticket t
        WHERE t.status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')
        ORDER BY t.createdAt DESC
    """)
    List<Ticket> findActiveTicketsForDuplicateCheck();
}