package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService{

    private final UserRepository userRepository;

    @Value("${admin.email}")
    private String adminEmail;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User oauthUser = super.loadUser(request);

        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");
        String providerId = oauthUser.getAttribute("sub");

        userRepository.findByEmail(email)
                .orElseGet(() -> {
                    String role = determineRole(email);  //  FIXED: Call method
                    return userRepository.save(
                        User.builder()
                                .name(name)
                                .email(email)
                                .role(role)  //  FIXED: Use determined role
                                .provider("GOOGLE")
                                .providerId(providerId)
                                .build()
                    );
                });

        return oauthUser;
    }

    // NEW METHOD: Determine role based on email pattern
    private String determineRole(String email) {
    // ADMIN - your email
    if (email.equals("premachandrabmpp@gmail.com")) {
        return "ADMIN";
    }
    // STUDENT - use one of your other accounts
    else if (email.equals("pasindupiumalcrw2002@gmail.com")) {
        return "STUDENT";
    }
    // LECTURER - use another account
    else if (email.equals("")) {
        return "LECTURER";
    }
    // TECHNICIAN - use another account
    else if (email.equals("")) {
        return "TECHNICIAN";
    }
    // MANAGER - use another account
    else if (email.equals("")) {
        return "MANAGER";
    }
    // Default
    else {
        return "STUDENT";
    }
}
}