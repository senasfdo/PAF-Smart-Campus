package com.example.demo.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> managerDashboard() {
        return ResponseEntity.ok(Map.of(
            "message", "Welcome Manager!",
            "email", "Your manager dashboard"
        ));
    }
}