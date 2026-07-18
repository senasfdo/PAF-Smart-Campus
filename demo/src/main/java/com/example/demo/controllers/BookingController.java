package com.example.demo.controllers;

import com.example.demo.dto.BookingDTO;
import com.example.demo.model.Booking;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER')")
    public ResponseEntity<?> createBooking(@RequestBody BookingDTO dto, Authentication auth) {
        try {
            User user = getUserFromAuth(auth);
            Booking booking = bookingService.createBooking(dto, user);
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER')")
    public ResponseEntity<?> getMyBookings(Authentication auth) {
        User user = getUserFromAuth(auth);
        List<Booking> bookings = bookingService.getUserBookings(user.getId());
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getPendingBookings() {
        List<Booking> bookings = bookingService.getPendingBookings();
        return ResponseEntity.ok(bookings);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> approveBooking(@PathVariable Long id) {
        try {
            Booking booking = bookingService.approveBooking(id);
            return ResponseEntity.ok(Map.of(
                "message", "Booking approved successfully",
                "booking", booking
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> rejectBooking(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            String reason = request.getOrDefault("reason", "No reason provided");
            Booking booking = bookingService.rejectBooking(id, reason);
            return ResponseEntity.ok(Map.of(
                "message", "Booking rejected",
                "booking", booking
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, Authentication auth) {
        try {
            User user = getUserFromAuth(auth);
            Booking booking = bookingService.cancelBooking(id, user);
            return ResponseEntity.ok(Map.of(
                "message", "Booking cancelled successfully",
                "booking", booking
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteBooking(@PathVariable Long id, Authentication auth) {
        try {
            User user = getUserFromAuth(auth);
            bookingService.deleteBooking(id, user);
            return ResponseEntity.ok(Map.of(
                "message", "Booking deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/check-availability")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> checkAvailability(
            @RequestParam Long facilityId,
            @RequestParam String startTime,
            @RequestParam String endTime) {

        LocalDateTime start = LocalDateTime.parse(startTime);
        LocalDateTime end = LocalDateTime.parse(endTime);

        boolean isAvailable = !bookingService.hasConflict(facilityId, start, end);

        return ResponseEntity.ok(Map.of(
            "available", isAvailable,
            "facilityId", facilityId,
            "startTime", startTime,
            "endTime", endTime
        ));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllBookings() {
        List<Booking> bookings = bookingService.getAllBookings();
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getBookingStats() {
        Map<String, Object> stats = bookingService.getBookingStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/facility/{facilityId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<?> getBookingsByFacility(@PathVariable Long facilityId) {
        List<Booking> bookings = bookingService.getBookingsByFacility(facilityId);
        return ResponseEntity.ok(bookings);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER')")
    public ResponseEntity<?> updateBooking(@PathVariable Long id,
                                           @RequestBody BookingDTO dto,
                                           Authentication auth) {
        try {
            User user = getUserFromAuth(auth);
            Booking booking = bookingService.updateBooking(id, dto, user);
            return ResponseEntity.ok(Map.of(
                "message", "Booking updated successfully",
                "booking", booking
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================
    // QR CODE / CHECK-IN ENDPOINTS
    // =========================

    @GetMapping("/{id}/qr")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'MANAGER', 'ADMIN', 'TECHNICIAN')")
    public ResponseEntity<?> getBookingQr(@PathVariable Long id, Authentication auth) {
        try {
            User user = getUserFromAuth(auth);
            Map<String, Object> qrData = bookingService.getBookingQrDetails(id, user);
            return ResponseEntity.ok(qrData);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/qr/verify/{token}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'TECHNICIAN')")
    public ResponseEntity<?> verifyQr(@PathVariable String token) {
        try {
            Map<String, Object> result = bookingService.verifyQrToken(token);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/qr/check-in/{token}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'TECHNICIAN')")
    public ResponseEntity<?> checkInByQr(@PathVariable String token) {
        try {
            Booking booking = bookingService.checkInByQrToken(token);
            return ResponseEntity.ok(Map.of(
                "message", "Booking checked in successfully",
                "booking", booking
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private User getUserFromAuth(Authentication auth) {
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}