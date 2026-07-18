package com.example.demo.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/technician")
@RequiredArgsConstructor
public class TechnicianController {

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<?> technicianDashboard() {
        return ResponseEntity.ok(Map.of(
            "message", "Welcome Technician!",
            "email", "Your technician dashboard"
        ));
    }
}