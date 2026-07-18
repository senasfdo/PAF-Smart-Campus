package com.example.demo.service;

import com.example.demo.dto.BookingDTO;
import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import com.example.demo.model.Facility;
import com.example.demo.model.FacilityStatus;
import com.example.demo.model.User;
import com.example.demo.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final FacilityService facilityService;
    private final NotificationService notificationService;

    @Transactional
    public Booking createBooking(BookingDTO dto, User user) {
        if (dto.getStartTime().isAfter(dto.getEndTime())) {
            throw new RuntimeException("Start time must be before end time");
        }

        if (dto.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot book past dates");
        }

        Facility facility = facilityService.getFacilityById(dto.getFacilityId());

        if (facility.getStatus() != FacilityStatus.ACTIVE) {
            throw new RuntimeException("Facility is not available for booking");
        }

        if (hasConflict(facility.getId(), dto.getStartTime(), dto.getEndTime())) {
            throw new RuntimeException("Facility already booked for this time slot");
        }

        Booking booking = Booking.builder()
                .user(user)
                .facility(facility)
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .purpose(dto.getPurpose())
                .expectedAttendees(dto.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .checkedIn(false)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        notificationService.notifyManagers(
                "New booking request from " + user.getName(),
                "Booking ID: " + savedBooking.getId() + " for " + facility.getName()
        );

        return savedBooking;
    }

    public boolean hasConflict(Long facilityId, LocalDateTime startTime, LocalDateTime endTime) {
        return bookingRepository.existsConflict(facilityId, startTime, endTime);
    }

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public List<Booking> getPendingBookings() {
        return bookingRepository.findPendingBookings();
    }

    @Transactional
    public Booking approveBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Can only approve pending bookings");
        }

        boolean conflict = bookingRepository.existsConflictExcludingSelf(
                booking.getFacility().getId(),
                booking.getId(),
                booking.getStartTime(),
                booking.getEndTime()
        );

        if (conflict) {
            booking.setStatus(BookingStatus.REJECTED);
            booking.setRejectionReason("Time slot no longer available");
            booking.setQrToken(null);
            booking.setCheckedIn(false);
            booking.setCheckedInAt(null);
            bookingRepository.save(booking);
            throw new RuntimeException("Time slot no longer available");
        }

        booking.setStatus(BookingStatus.APPROVED);
        booking.setRejectionReason(null);
        booking.setCheckedIn(false);
        booking.setCheckedInAt(null);

        if (booking.getQrToken() == null || booking.getQrToken().isBlank()) {
            booking.setQrToken(generateUniqueQrToken());
        }

        Booking approvedBooking = bookingRepository.save(booking);

        notificationService.notifyUser(
                booking.getUser().getId(),
                "Booking Approved",
                "Your booking for " + booking.getFacility().getName() + " has been approved"
        );

        return approvedBooking;
    }

    @Transactional
    public Booking rejectBooking(Long bookingId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Can only reject pending bookings");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(reason);
        booking.setQrToken(null);
        booking.setCheckedIn(false);
        booking.setCheckedInAt(null);

        Booking rejectedBooking = bookingRepository.save(booking);

        notificationService.notifyUser(
                booking.getUser().getId(),
                "Booking Rejected",
                "Your booking for " + booking.getFacility().getName() + " was rejected. Reason: " + reason
        );

        return rejectedBooking;
    }

    @Transactional
    public Booking cancelBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isOwner = booking.getUser().getId().equals(currentUser.getId());
        boolean isAdminOrManager =
                "ADMIN".equals(currentUser.getRole()) || "MANAGER".equals(currentUser.getRole());

        if (!isOwner && !isAdminOrManager) {
            throw new RuntimeException("You can only cancel your own bookings");
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new RuntimeException("Only approved bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setQrToken(null);
        booking.setCheckedIn(false);
        booking.setCheckedInAt(null);

        Booking cancelledBooking = bookingRepository.save(booking);

        notificationService.notifyManagers(
                "Booking cancelled",
                "Booking ID: " + bookingId + " for " + booking.getFacility().getName()
                        + " was cancelled by " + currentUser.getName()
        );

        return cancelledBooking;
    }

    @Transactional
    public void deleteBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isOwner = booking.getUser().getId().equals(currentUser.getId());
        boolean isAdminOrManager =
                "ADMIN".equals(currentUser.getRole()) || "MANAGER".equals(currentUser.getRole());

        if (!isOwner && !isAdminOrManager) {
            throw new RuntimeException("You can only delete your own bookings");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Only pending bookings can be deleted");
        }

        String facilityName = booking.getFacility().getName();
        String deletedBy = currentUser.getName();
        Long bookingOwnerId = booking.getUser().getId();

        bookingRepository.delete(booking);

        if (isOwner) {
            notificationService.notifyManagers(
                    "Pending booking deleted",
                    "Booking ID: " + bookingId + " for " + facilityName
                            + " was deleted by " + deletedBy
            );
        } else {
            notificationService.notifyUser(
                    bookingOwnerId,
                    "Booking Deleted",
                    "Your pending booking for " + facilityName + " was deleted by " + deletedBy
            );
        }
    }

    @Transactional
    public Booking updateBooking(Long bookingId, BookingDTO dto, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isOwner = booking.getUser().getId().equals(currentUser.getId());
        if (!isOwner) {
            throw new RuntimeException("You can only update your own bookings");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Can only update pending bookings");
        }

        if (dto.getStartTime().isAfter(dto.getEndTime())) {
            throw new RuntimeException("Start time must be before end time");
        }

        if (dto.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot book past dates");
        }

        Facility facility = facilityService.getFacilityById(dto.getFacilityId());

        if (facility.getStatus() != FacilityStatus.ACTIVE) {
            throw new RuntimeException("Facility is not available for booking");
        }

        boolean conflict = bookingRepository.existsConflictExcludingSelf(
                facility.getId(),
                bookingId,
                dto.getStartTime(),
                dto.getEndTime()
        );

        if (conflict) {
            throw new RuntimeException("Facility already booked for this time slot");
        }

        booking.setFacility(facility);
        booking.setStartTime(dto.getStartTime());
        booking.setEndTime(dto.getEndTime());
        booking.setPurpose(dto.getPurpose());
        booking.setExpectedAttendees(dto.getExpectedAttendees());

        return bookingRepository.save(booking);
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> getBookingsByFacility(Long facilityId) {
        return bookingRepository.findByFacilityId(facilityId);
    }

    public Map<String, Object> getBookingStats() {
        List<Booking> allBookings = bookingRepository.findAll();
        List<Booking> pending = bookingRepository.findPendingBookings();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBookings", allBookings.size());
        stats.put("pendingApprovals", pending.size());
        stats.put("approved", allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .count());
        stats.put("rejected", allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.REJECTED)
                .count());
        stats.put("cancelled", allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CANCELLED)
                .count());
        stats.put("checkedIn", allBookings.stream()
                .filter(b -> Boolean.TRUE.equals(b.getCheckedIn()))
                .count());

        return stats;
    }

    public Map<String, Object> getBookingQrDetails(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isOwner = booking.getUser().getId().equals(currentUser.getId());
        boolean isPrivileged =
                "ADMIN".equals(currentUser.getRole()) ||
                "MANAGER".equals(currentUser.getRole()) ||
                "TECHNICIAN".equals(currentUser.getRole());

        if (!isOwner && !isPrivileged) {
            throw new RuntimeException("You are not allowed to view this QR code");
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new RuntimeException("QR code is only available for approved bookings");
        }

        if (booking.getQrToken() == null || booking.getQrToken().isBlank()) {
            booking.setQrToken(generateUniqueQrToken());
            bookingRepository.save(booking);
        }

        Map<String, Object> qrData = new HashMap<>();
        qrData.put("bookingId", booking.getId());
        qrData.put("qrToken", booking.getQrToken());
        qrData.put("checkedIn", booking.getCheckedIn());
        qrData.put("checkedInAt", booking.getCheckedInAt());
        qrData.put("facilityName", booking.getFacility().getName());
        qrData.put("facilityLocation", booking.getFacility().getLocation());
        qrData.put("startTime", booking.getStartTime());
        qrData.put("endTime", booking.getEndTime());
        qrData.put("status", booking.getStatus());
        qrData.put("userName", booking.getUser().getName());

        return qrData;
    }

    @Transactional
    public Booking checkInByQrToken(String qrToken) {
        Booking booking = bookingRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Invalid QR code"));

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new RuntimeException("Only approved bookings can be checked in");
        }

        if (Boolean.TRUE.equals(booking.getCheckedIn())) {
            throw new RuntimeException("This booking has already been checked in");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime validFrom = booking.getStartTime().minusMinutes(30);
        LocalDateTime validUntil = booking.getEndTime().plusMinutes(30);

        if (now.isBefore(validFrom) || now.isAfter(validUntil)) {
            throw new RuntimeException("QR check-in is not available at this time");
        }

        booking.setCheckedIn(true);
        booking.setCheckedInAt(now);

        Booking checkedInBooking = bookingRepository.save(booking);

        notificationService.notifyUser(
                booking.getUser().getId(),
                "Booking Checked In",
                "Your booking for " + booking.getFacility().getName() + " has been successfully checked in"
        );

        return checkedInBooking;
    }

    public Map<String, Object> verifyQrToken(String qrToken) {
        Booking booking = bookingRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Invalid QR code"));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime validFrom = booking.getStartTime().minusMinutes(30);
        LocalDateTime validUntil = booking.getEndTime().plusMinutes(30);

        Map<String, Object> result = new HashMap<>();
        result.put("bookingId", booking.getId());
        result.put("facilityName", booking.getFacility().getName());
        result.put("facilityLocation", booking.getFacility().getLocation());
        result.put("userName", booking.getUser().getName());
        result.put("startTime", booking.getStartTime());
        result.put("endTime", booking.getEndTime());
        result.put("status", booking.getStatus());
        result.put("checkedIn", booking.getCheckedIn());
        result.put("checkedInAt", booking.getCheckedInAt());
        result.put("validNow", false);

        if (booking.getStatus() == BookingStatus.APPROVED &&
                !Boolean.TRUE.equals(booking.getCheckedIn()) &&
                !now.isBefore(validFrom) &&
                !now.isAfter(validUntil)) {
            result.put("validNow", true);
        }

        return result;
    }

    private String generateUniqueQrToken() {
        String token;

        do {
            token = UUID.randomUUID().toString();
        } while (bookingRepository.existsByQrToken(token));

        return token;
    }
}