package com.example.demo.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    // Upload image to Cloudinary
    @SuppressWarnings("unchecked")
    public Map<String, Object> uploadImage(MultipartFile file) throws IOException {
        // ✅ SIMPLE: Use ObjectUtils.asMap with direct params
        Map<String, Object> uploadParams = ObjectUtils.asMap(
            "folder", "ticket_attachments",
            "allowed_formats", new String[]{"jpg", "jpeg", "png", "gif"},
            "width", 1000,
            "height", 1000,
            "crop", "limit"
        );
        
        return cloudinary.uploader().upload(file.getBytes(), uploadParams);
    }

    // Delete image from Cloudinary
    public void deleteImage(String publicId) throws IOException {
        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }

    // Get secure URL
    public String getSecureUrl(String publicId) {
        return cloudinary.url().secure(true).generate(publicId);
    }
}