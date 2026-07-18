package com.example.demo.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.demo.dto.FacilityDTO;
import com.example.demo.model.Booking;
import com.example.demo.model.BookingStatus;
import com.example.demo.model.Facility;
import com.example.demo.model.FacilityStatus;
import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.FacilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    @Value("${cloudinary.api-key}")
    private String apiKey;

    @Value("${cloudinary.api-secret}")
    private String apiSecret;

    private Cloudinary buildCloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }

    private String uploadFacilityImage(MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return null;
            }

            if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
                throw new RuntimeException("Only image files are allowed for facility upload");
            }

            if (file.getSize() > 5 * 1024 * 1024) {
                throw new RuntimeException("Facility image must be 5MB or smaller");
            }

            Cloudinary cloudinary = buildCloudinary();

            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("folder", "facilities")
            );

            Object secureUrl = uploadResult.get("secure_url");

            if (secureUrl == null) {
                throw new RuntimeException("Failed to upload facility image");
            }

            return secureUrl.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload facility image");
        }
    }

    private String resolveImageUrl(FacilityDTO dto, String currentImageUrl) {
        if (dto.getImageFile() != null && !dto.getImageFile().isEmpty()) {
            return uploadFacilityImage(dto.getImageFile());
        }

        String imageUrl = dto.getImageUrl() != null ? dto.getImageUrl().trim() : "";

        if (!imageUrl.isEmpty()) {
            return imageUrl;
        }

        return currentImageUrl != null ? currentImageUrl : "";
    }

    @Transactional
    public Facility createFacility(FacilityDTO dto) {
        Facility facility = Facility.builder()
                .name(dto.getName())
                .type(dto.getType())
                .capacity(dto.getCapacity())
                .location(dto.getLocation())
                .description(dto.getDescription())
                .availabilitySchedule(dto.getAvailabilitySchedule())
                .imageUrl(resolveImageUrl(dto, ""))
                .status(FacilityStatus.ACTIVE)
                .build();

        return facilityRepository.save(facility);
    }

    public List<Facility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public Facility getFacilityById(Long id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facility not found"));
    }

    public List<Facility> getFacilitiesByType(String type) {
        return facilityRepository.findByType(type);
    }

    public List<Facility> getFacilitiesByLocation(String location) {
        return facilityRepository.findByLocationContaining(location);
    }

    public List<Facility> getFacilitiesByMinCapacity(Integer capacity) {
        return facilityRepository.findByCapacityGreaterThanEqual(capacity);
    }

    public List<Facility> getActiveFacilities() {
        return facilityRepository.findByStatus(FacilityStatus.ACTIVE);
    }

    public List<Facility> searchFacilities(String type, Integer minCapacity, String location, String status) {
        FacilityStatus facilityStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                facilityStatus = FacilityStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid status, ignore
            }
        }
        return facilityRepository.searchFacilities(type, minCapacity, location, facilityStatus);
    }

    @Transactional
    public Facility updateFacility(Long id, FacilityDTO dto) {
        Facility facility = getFacilityById(id);

        facility.setName(dto.getName());
        facility.setType(dto.getType());
        facility.setCapacity(dto.getCapacity());
        facility.setLocation(dto.getLocation());
        facility.setDescription(dto.getDescription());
        facility.setAvailabilitySchedule(dto.getAvailabilitySchedule());
        facility.setImageUrl(resolveImageUrl(dto, facility.getImageUrl()));

        return facilityRepository.save(facility);
    }

    @Transactional
    public Facility updateFacilityStatus(Long id, String status) {
        Facility facility = getFacilityById(id);
        facility.setStatus(FacilityStatus.valueOf(status.toUpperCase()));
        return facilityRepository.save(facility);
    }

    @Transactional
    public void deleteFacility(Long id) {
        Facility facility = getFacilityById(id);
        facilityRepository.delete(facility);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getFacilityAnalytics() {
        List<Facility> facilities = facilityRepository.findAll();
        List<Booking> allBookings = bookingRepository.findAll();

        List<Booking> approvedBookings = allBookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.APPROVED)
                .collect(Collectors.toList());

        long totalFacilities = facilities.size();
        long activeFacilities = facilities.stream()
                .filter(facility -> "ACTIVE".equalsIgnoreCase(String.valueOf(facility.getStatus())))
                .count();

        long outOfServiceFacilities = facilities.stream()
                .filter(facility -> "OUT_OF_SERVICE".equalsIgnoreCase(String.valueOf(facility.getStatus())))
                .count();

        long totalApprovedBookings = approvedBookings.size();

        Map<Long, Long> approvedBookingCountByFacilityId = approvedBookings.stream()
                .filter(booking -> booking.getFacility() != null && booking.getFacility().getId() != null)
                .collect(Collectors.groupingBy(
                        booking -> booking.getFacility().getId(),
                        Collectors.counting()
                ));

        Map<String, Long> facilitiesByType = facilities.stream()
                .collect(Collectors.groupingBy(
                        facility -> safeText(facility.getType()),
                        Collectors.counting()
                ));

        Map<String, Long> facilitiesByLocation = facilities.stream()
                .collect(Collectors.groupingBy(
                        facility -> safeText(facility.getLocation()),
                        Collectors.counting()
                ));

        Map<String, Long> bookingsByType = approvedBookings.stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getFacility() != null
                                ? safeText(booking.getFacility().getType())
                                : "Unknown",
                        Collectors.counting()
                ));

        Map<String, Long> bookingsByLocation = approvedBookings.stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getFacility() != null
                                ? safeText(booking.getFacility().getLocation())
                                : "Unknown",
                        Collectors.counting()
                ));

        Map<Integer, Long> bookingsByHour = approvedBookings.stream()
                .filter(booking -> booking.getStartTime() != null)
                .collect(Collectors.groupingBy(
                        booking -> booking.getStartTime().getHour(),
                        Collectors.counting()
                ));

        List<Map<String, Object>> topBookedFacilities = facilities.stream()
                .sorted(Comparator
                        .comparingLong((Facility facility) ->
                                approvedBookingCountByFacilityId.getOrDefault(facility.getId(), 0L))
                        .reversed()
                        .thenComparing(Facility::getName, String.CASE_INSENSITIVE_ORDER))
                .limit(5)
                .map(facility -> buildFacilityUsageItem(
                        facility,
                        approvedBookingCountByFacilityId.getOrDefault(facility.getId(), 0L)
                ))
                .collect(Collectors.toList());

        List<Map<String, Object>> underusedFacilities = facilities.stream()
                .sorted(Comparator
                        .comparingLong((Facility facility) ->
                                approvedBookingCountByFacilityId.getOrDefault(facility.getId(), 0L))
                        .thenComparing(Facility::getName, String.CASE_INSENSITIVE_ORDER))
                .limit(5)
                .map(facility -> buildFacilityUsageItem(
                        facility,
                        approvedBookingCountByFacilityId.getOrDefault(facility.getId(), 0L)
                ))
                .collect(Collectors.toList());

        double averageBookingsPerFacility = totalFacilities == 0
                ? 0.0
                : Math.round(((double) totalApprovedBookings / totalFacilities) * 100.0) / 100.0;

        String busiestHour = bookingsByHour.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> formatHourLabel(entry.getKey()))
                .orElse("N/A");

        String mostCommonFacilityType = facilitiesByType.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        String mostBookedFacilityName = topBookedFacilities.isEmpty()
                ? "N/A"
                : String.valueOf(topBookedFacilities.get(0).get("facilityName"));

        String leastUsedFacilityName = underusedFacilities.isEmpty()
                ? "N/A"
                : String.valueOf(underusedFacilities.get(0).get("facilityName"));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalFacilities", totalFacilities);
        summary.put("activeFacilities", activeFacilities);
        summary.put("outOfServiceFacilities", outOfServiceFacilities);
        summary.put("totalApprovedBookings", totalApprovedBookings);
        summary.put("averageBookingsPerFacility", averageBookingsPerFacility);

        Map<String, Object> insights = new LinkedHashMap<>();
        insights.put("mostBookedFacility", mostBookedFacilityName);
        insights.put("leastUsedFacility", leastUsedFacilityName);
        insights.put("busiestHour", busiestHour);
        insights.put("mostCommonFacilityType", mostCommonFacilityType);

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("summary", summary);
        analytics.put("insights", insights);
        analytics.put("facilitiesByType", toLabelValueList(facilitiesByType));
        analytics.put("facilitiesByLocation", toLabelValueList(facilitiesByLocation));
        analytics.put("bookingsByType", toLabelValueList(bookingsByType));
        analytics.put("bookingsByLocation", toLabelValueList(bookingsByLocation));
        analytics.put("peakBookingHours", toHourValueList(bookingsByHour));
        analytics.put("topBookedFacilities", topBookedFacilities);
        analytics.put("underusedFacilities", underusedFacilities);

        return analytics;
    }

    private String safeText(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "Unknown";
        }
        return value.trim();
    }

    private String formatHourLabel(Integer hour) {
        if (hour == null) {
            return "Unknown";
        }

        int nextHour = (hour + 1) % 24;
        return String.format("%02d:00 - %02d:00", hour, nextHour);
    }

    private Map<String, Object> buildFacilityUsageItem(Facility facility, Long bookingCount) { // Helper method to build facility usage item for analytics
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("facilityId", facility.getId());
        item.put("facilityName", facility.getName());
        item.put("type", safeText(facility.getType()));
        item.put("location", safeText(facility.getLocation()));
        item.put("status", String.valueOf(facility.getStatus()));
        item.put("capacity", facility.getCapacity());
        item.put("approvedBookingCount", bookingCount != null ? bookingCount : 0L);
        return item;
    }

    private List<Map<String, Object>> toLabelValueList(Map<String, Long> source) {
        return source.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("label", entry.getKey());
                    row.put("value", entry.getValue());
                    return row;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> toHourValueList(Map<Integer, Long> source) {
        return source.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("label", formatHourLabel(entry.getKey()));
                    row.put("hour", entry.getKey());
                    row.put("value", entry.getValue());
                    return row;
                })
                .collect(Collectors.toList());
    }
}