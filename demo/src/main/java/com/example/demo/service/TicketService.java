package com.example.demo.service;

import com.example.demo.dto.TicketDTO;
import com.example.demo.dto.TicketUpdateDTO;
import com.example.demo.model.*;
import com.example.demo.repository.TicketRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;
    private final CloudinaryService cloudinaryService;

    private static final int MAX_ATTACHMENTS = 3;
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    private static final Set<String> STOP_WORDS = Set.of(
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "to", "of", "in", "on", "at", "for", "with", "by", "from",
            "and", "or", "but", "my", "our", "your", "their", "this", "that",
            "it", "as", "into", "about", "not", "no", "yes", "have", "has",
            "had", "do", "does", "did", "can", "could", "will", "would"
    );

    // Create a new ticket
    @Transactional
    public Ticket createTicket(TicketDTO dto, User user) {
        if (dto.getAttachments() != null && dto.getAttachments().size() > MAX_ATTACHMENTS) {
            throw new RuntimeException("Maximum " + MAX_ATTACHMENTS + " attachments allowed");
        }

        Ticket ticket = Ticket.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .priority(TicketPriority.valueOf(dto.getPriority().toUpperCase()))
                .status(TicketStatus.OPEN)
                .location(dto.getLocation())
                .resourceName(dto.getResourceName())
                .contactEmail(dto.getContactEmail())
                .contactPhone(dto.getContactPhone())
                .reportedBy(user)
                .build();

        Ticket savedTicket = ticketRepository.save(ticket);

        if (dto.getAttachments() != null) {
            for (MultipartFile file : dto.getAttachments()) {
                if (!file.isEmpty()) {
                    validateAndUploadAttachment(file, savedTicket);
                }
            }
        }

        savedTicket = ticketRepository.save(savedTicket);

        notificationService.notifyManagers(
                "New ticket created",
                "Ticket #" + savedTicket.getId() + ": " + savedTicket.getTitle()
        );

        return savedTicket;
    }

    // Duplicate ticket detection
    @Transactional(readOnly = true)
    public Map<String, Object> checkDuplicateTickets(
            String title,
            String description,
            String location,
            String resourceName,
            String category
    ) {
        String incomingText = buildComparableText(title, description, location, resourceName, category);
        Set<String> incomingKeywords = extractKeywords(incomingText);

        if (incomingKeywords.isEmpty()) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("duplicateFound", false);
            response.put("matches", List.of());
            return response;
        }

        List<Map<String, Object>> matches = ticketRepository.findActiveTicketsForDuplicateCheck()
                .stream()
                .map(ticket -> buildDuplicateMatch(ticket, incomingKeywords))
                .filter(Objects::nonNull)
                .sorted((a, b) -> Double.compare(
                        ((Number) b.get("similarityScore")).doubleValue(),
                        ((Number) a.get("similarityScore")).doubleValue()
                ))
                .limit(5)
                .collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("duplicateFound", !matches.isEmpty());
        response.put("matches", matches);
        return response;
    }

    private Map<String, Object> buildDuplicateMatch(Ticket ticket, Set<String> incomingKeywords) {
        String existingText = buildComparableText(
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getLocation(),
                ticket.getResourceName(),
                ticket.getCategory()
        );

        Set<String> existingKeywords = extractKeywords(existingText);

        if (existingKeywords.isEmpty()) {
            return null;
        }

        Set<String> commonKeywords = new LinkedHashSet<>(incomingKeywords);
        commonKeywords.retainAll(existingKeywords);

        if (commonKeywords.isEmpty()) {
            return null;
        }

        double similarityScore = (double) commonKeywords.size()
                / Math.max(Math.min(incomingKeywords.size(), existingKeywords.size()), 1);

        if (similarityScore < 0.35) {
            return null;
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", ticket.getId());
        item.put("title", ticket.getTitle());
        item.put("description", ticket.getDescription());
        item.put("status", ticket.getStatus() != null ? ticket.getStatus().name() : "UNKNOWN");
        item.put("category", ticket.getCategory());
        item.put("location", ticket.getLocation());
        item.put("resourceName", ticket.getResourceName());
        item.put("createdAt", ticket.getCreatedAt());
        item.put("similarityScore", Math.round(similarityScore * 100.0) / 100.0);
        item.put("matchedKeywords", new ArrayList<>(commonKeywords));

        return item;
    }

    private String buildComparableText(
            String title,
            String description,
            String location,
            String resourceName,
            String category
    ) {
        return String.join(" ",
                safe(title),
                safe(description),
                safe(location),
                safe(resourceName),
                safe(category)
        ).trim();
    }

    private Set<String> extractKeywords(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }

        return Arrays.stream(text.toLowerCase()
                        .replaceAll("[^a-z0-9\\s]", " ")
                        .split("\\s+"))
                .map(String::trim)
                .filter(word -> !word.isBlank())
                .filter(word -> word.length() > 2)
                .filter(word -> !STOP_WORDS.contains(word))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    // Validate and upload attachment to Cloudinary
    private void validateAndUploadAttachment(MultipartFile file, Ticket ticket) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds 5MB limit");
        }

        String[] allowedTypes = {"image/jpeg", "image/png", "image/jpg", "image/gif"};
        boolean isValidType = false;
        for (String type : allowedTypes) {
            if (file.getContentType() != null && file.getContentType().equals(type)) {
                isValidType = true;
                break;
            }
        }

        if (!isValidType) {
            throw new RuntimeException("Only image files are allowed (JPEG, PNG, GIF)");
        }

        try {
            Map<String, Object> uploadResult = cloudinaryService.uploadImage(file);

            String url = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");

            Attachment attachment = Attachment.builder()
                    .fileName(file.getOriginalFilename())
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .fileUrl(url)
                    .publicId(publicId)
                    .ticket(ticket)
                    .build();

            ticket.getAttachments().add(attachment);

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    // Delete attachment from ticket (Admin only)
    @Transactional
    public void deleteAttachment(Long ticketId, Long attachmentId) {
        Ticket ticket = getTicketById(ticketId);

        Attachment attachment = ticket.getAttachments().stream()
                .filter(a -> a.getId().equals(attachmentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Attachment not found"));

        try {
            if (attachment.getPublicId() != null) {
                cloudinaryService.deleteImage(attachment.getPublicId());
            }

            ticket.getAttachments().remove(attachment);
            ticketRepository.save(ticket);

        } catch (IOException e) {
            throw new RuntimeException("Failed to delete image: " + e.getMessage());
        }
    }

    // Get ticket by ID
    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    // Get all tickets (Admin)
    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    // Get user's own tickets
    public List<Ticket> getUserTickets(Long userId) {
        return ticketRepository.findByReportedById(userId);
    }

    // Get technician's assigned tickets
    public List<Ticket> getTechnicianTickets(Long technicianId) {
        return ticketRepository.findByAssignedToId(technicianId);
    }

    // Get open tickets
    public List<Ticket> getOpenTickets() {
        return ticketRepository.findOpenTickets();
    }

    public List<User> getTechnicians(UserRepository userRepository) {
        return userRepository.findAll()
                .stream()
                .filter(user -> user.getRole() != null && user.getRole().equalsIgnoreCase("TECHNICIAN"))
                .collect(Collectors.toList());
    }

    // Update own ticket (Student / Lecturer)
    @Transactional
    public Ticket updateTicket(Long ticketId, TicketUpdateDTO dto, Long userId) {
        Ticket ticket = getTicketById(ticketId);

        if (ticket.getReportedBy() == null || !ticket.getReportedBy().getId().equals(userId)) {
            throw new RuntimeException("Not your ticket");
        }

        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Can only update OPEN tickets");
        }

        if (ticket.getAssignedTo() != null) {
            throw new RuntimeException("Cannot update after technician assignment");
        }

        if (dto.getDescription() != null && !dto.getDescription().trim().isEmpty()) {
            ticket.setDescription(dto.getDescription().trim());
        }

        if (dto.getPriority() != null && !dto.getPriority().trim().isEmpty()) {
            try {
                ticket.setPriority(TicketPriority.valueOf(dto.getPriority().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid priority value");
            }
        }

        return ticketRepository.save(ticket);
    }

    // Delete own ticket (Student / Lecturer)
    @Transactional
    public void deleteTicket(Long ticketId, Long userId) {
        Ticket ticket = getTicketById(ticketId);

        if (ticket.getReportedBy() == null || !ticket.getReportedBy().getId().equals(userId)) {
            throw new RuntimeException("Not your ticket");
        }

        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Can only delete OPEN tickets");
        }

        if (ticket.getAssignedTo() != null) {
            throw new RuntimeException("Cannot delete after technician assignment");
        }

        if (ticket.getAttachments() != null) {
            for (Attachment attachment : ticket.getAttachments()) {
                try {
                    if (attachment.getPublicId() != null && !attachment.getPublicId().isBlank()) {
                        cloudinaryService.deleteImage(attachment.getPublicId());
                    }
                } catch (IOException e) {
                    throw new RuntimeException("Failed to delete ticket attachment image: " + e.getMessage());
                }
            }
        }

        ticketRepository.delete(ticket);
    }

    // Assign technician to ticket
    @Transactional
    public Ticket assignTechnician(Long ticketId, Long technicianId, UserRepository userRepository) {
        Ticket ticket = getTicketById(ticketId);
        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new RuntimeException("Technician not found"));

        if (technician.getRole() == null || !technician.getRole().equalsIgnoreCase("TECHNICIAN")) {
            throw new RuntimeException("Selected user is not a technician");
        }

        ticket.setAssignedTo(technician);

        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        Ticket updatedTicket = ticketRepository.save(ticket);

        notificationService.notifyUser(
                technician.getId(),
                "Ticket assigned",
                "You have been assigned to ticket #" + ticketId
        );

        return updatedTicket;
    }

    // Update ticket status
    @Transactional
    public Ticket updateStatus(Long ticketId, String status, String notes) {
        Ticket ticket = getTicketById(ticketId);
        TicketStatus newStatus = TicketStatus.valueOf(status.toUpperCase());

        if (newStatus == TicketStatus.IN_PROGRESS && ticket.getAssignedTo() == null) {
            throw new RuntimeException("Ticket must be assigned to a technician first");
        }

        ticket.setStatus(newStatus);

        if (newStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        if (newStatus == TicketStatus.CLOSED) {
            ticket.setClosedAt(LocalDateTime.now());
        }

        if (notes != null) {
            ticket.setResolutionNotes(notes);
        }

        Ticket updatedTicket = ticketRepository.save(ticket);

        notificationService.notifyUser(
                ticket.getReportedBy().getId(),
                "Ticket status updated",
                "Ticket #" + ticketId + " status: " + status
        );

        return updatedTicket;
    }

    // Reject the ticket (Admin only)
    @Transactional
    public Ticket rejectTicket(Long ticketId, String reason) {
        Ticket ticket = getTicketById(ticketId);
        ticket.setStatus(TicketStatus.REJECTED);
        ticket.setRejectionReason(reason);
        Ticket rejectedTicket = ticketRepository.save(ticket);

        notificationService.notifyUser(
                ticket.getReportedBy().getId(),
                "Ticket rejected",
                "Your ticket was rejected. Reason: " + reason
        );

        return rejectedTicket;
    }

    // Add resolution notes (Technician)
    @Transactional
    public Ticket addResolutionNotes(Long ticketId, String notes) {
        Ticket ticket = getTicketById(ticketId);
        ticket.setResolutionNotes(notes);

        if (ticket.getStatus() == TicketStatus.IN_PROGRESS) {
            ticket.setStatus(TicketStatus.RESOLVED);
            ticket.setResolvedAt(LocalDateTime.now());
        }

        return ticketRepository.save(ticket);
    }

    // Get tickets by status
    public List<Ticket> getTicketsByStatus(String status) {
        return ticketRepository.findByStatus(TicketStatus.valueOf(status.toUpperCase()));
    }

    // Get tickets by priority
    public List<Ticket> getTicketsByPriority(String priority) {
        return ticketRepository.findByPriority(TicketPriority.valueOf(priority.toUpperCase()));
    }

    // Get tickets by category
    public List<Ticket> getTicketsByCategory(String category) {
        return ticketRepository.findByCategory(category);
    }

    // Get ticket statistics
    public Map<String, Object> getTicketStats() {
        List<Ticket> allTickets = ticketRepository.findAll();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTickets", allTickets.size());
        stats.put("open", allTickets.stream().filter(t -> t.getStatus() == TicketStatus.OPEN).count());
        stats.put("inProgress", allTickets.stream().filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS).count());
        stats.put("resolved", allTickets.stream().filter(t -> t.getStatus() == TicketStatus.RESOLVED).count());
        stats.put("closed", allTickets.stream().filter(t -> t.getStatus() == TicketStatus.CLOSED).count());
        stats.put("rejected", allTickets.stream().filter(t -> t.getStatus() == TicketStatus.REJECTED).count());

        return stats;
    }
}