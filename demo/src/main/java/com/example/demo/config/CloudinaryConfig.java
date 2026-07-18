package com.example.demo.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {    // Cloudinary configuration

    @Value("${cloudinary.cloud-name}")  // Inject cloud name from application properties
    private String cloudName;

    @Value("${cloudinary.api-key}")  // Inject API key from application properties
    private String apiKey;

    @Value("${cloudinary.api-secret}")  // Inject API secret from application properties
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudName,
            "api_key", apiKey,
            "api_secret", apiSecret,
            "secure", true
        ));
    }
}