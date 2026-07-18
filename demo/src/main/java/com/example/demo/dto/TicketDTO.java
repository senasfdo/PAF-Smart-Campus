package com.example.demo.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Data 
public class TicketDTO {
    private String title;
    private String description;
    private String category;
    private String priority;  // LOW, MEDIUM, HIGH, URGENT
    private String location;
    private String resourceName;
    private String contactEmail;
    private String contactPhone;
    private List<MultipartFile> attachments;  // Up to 3 images max size 
}