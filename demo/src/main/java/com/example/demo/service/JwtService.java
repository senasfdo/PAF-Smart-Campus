package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import com.example.demo.model.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Collections;
import java.util.Date;
import java.security.Key;

@Service
public class JwtService {

    private final Key key;
    private final long expirationMs;
    private final String adminEmail;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs,
            @Value("${admin.email}") String adminEmail
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
        this.adminEmail = adminEmail;
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    // FIXED: Check token belongs to user
    public boolean isTokenValid(String token, User user) {
        final String username = extractUsername(token);
        return (username != null && 
                username.equals(user.getEmail()) &&  //  FIXED
                !isTokenExpired(token));
    }

    // FIXED: Add ROLE_ prefix
    public Authentication getAuthentication(String token, User user) {
        // Use role from database if available
        String role = user.getRole() != null ? user.getRole() : "USER";
        
        // Override with admin if email matches
        if (user.getEmail().equals(adminEmail)) {
            role = "ADMIN";
        }

        return new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))  //  FIXED
        );
    }

    // FIXED: Add user data to token
    public String generateToken(User user) {
        String role = user.getRole() != null ? user.getRole() : "USER";
        
        if (user.getEmail().equals(adminEmail)) {
            role = "ADMIN";
        }
        
        return Jwts.builder()
                .setSubject(user.getEmail())
                .claim("role", role)           //  FIXED
                .claim("name", user.getName())  // FIXED
                .claim("userId", user.getId())  //  FIXED
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}