package com.example.demo.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lecturer")
@RequiredArgsConstructor
public class LecturerController {

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<?> lecturerDashboard() {
        return ResponseEntity.ok(Map.of(
            "message", "Welcome Lecturer!",
            "email", "Your lecturer dashboard"
        ));
    }
}