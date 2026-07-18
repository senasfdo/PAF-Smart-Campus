package com.example.demo.repository;

import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    // Get bookings by user
    List<Booking> findByUserId(Long userId);

    // Get bookings by status
    List<Booking> findByStatus(BookingStatus status);

    // Get bookings by facility
    List<Booking> findByFacilityId(Long facilityId);

    // Find booking by QR token
    Optional<Booking> findByQrToken(String qrToken);

    // Check whether QR token already exists
    boolean existsByQrToken(String qrToken);

    // Check for conflicting bookings
    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE " +
           "b.facility.id = :facilityId AND " +
           "b.status != 'REJECTED' AND " +
           "b.status != 'CANCELLED' AND " +
           "((b.startTime <= :endTime AND b.endTime >= :startTime))")
    boolean existsConflict(@Param("facilityId") Long facilityId,
                          @Param("startTime") LocalDateTime startTime,
                          @Param("endTime") LocalDateTime endTime);

    // Check for conflicting bookings EXCLUDING self
    @Query("SELECT COUNT(b) > 0 FROM Booking b WHERE " +
           "b.facility.id = :facilityId AND " +
           "b.id != :bookingId AND " +
           "b.status != 'REJECTED' AND " +
           "b.status != 'CANCELLED' AND " +
           "((b.startTime <= :endTime AND b.endTime >= :startTime))")
    boolean existsConflictExcludingSelf(@Param("facilityId") Long facilityId,
                                        @Param("bookingId") Long bookingId,
                                        @Param("startTime") LocalDateTime startTime,
                                        @Param("endTime") LocalDateTime endTime);

    // Get pending bookings
    @Query("SELECT b FROM Booking b WHERE b.status = 'PENDING' ORDER BY b.createdAt ASC")
    List<Booking> findPendingBookings();

    // Get upcoming bookings for a facility
    @Query("SELECT b FROM Booking b WHERE b.facility.id = :facilityId " +
           "AND b.startTime >= :now AND b.status = 'APPROVED' " +
           "ORDER BY b.startTime ASC")
    List<Booking> findUpcomingBookings(@Param("facilityId") Long facilityId,
                                       @Param("now") LocalDateTime now);
}