package com.example.demo.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class FacilityDTO {
    private String name;
    private String type;
    private Integer capacity;
    private String location;
    private String description;
    private String availabilitySchedule;
    private String imageUrl;
    private MultipartFile imageFile;
}