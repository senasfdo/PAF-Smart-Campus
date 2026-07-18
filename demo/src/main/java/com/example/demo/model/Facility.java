package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;  // ✅ ADD THIS IMPORT
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "facilities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Facility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    private Integer capacity;

    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private FacilityStatus status;

    private String availabilitySchedule;

    private String imageUrl;

    // ✅ ADD @JsonIgnore to break the infinite loop
    @JsonIgnore
    @Builder.Default
    @OneToMany(mappedBy = "facility", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    private List<Booking> bookings = new ArrayList<>();

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = FacilityStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}