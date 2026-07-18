package com.example.demo.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookingDTO {
    private Long facilityId;  // ✅ Instead of resourceType and resourceName
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String purpose;
    private Integer expectedAttendees;
}