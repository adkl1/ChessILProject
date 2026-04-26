package com.example.chessil.controller;

import com.example.chessil.dto.StatsResponse;
import com.example.chessil.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.example.chessil.dto.UserResponse;
import com.example.chessil.entity.User;
import com.example.chessil.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final RoomService roomService;
    private final UserRepository userRepository;

    @GetMapping("/{userId}/stats")
    public StatsResponse getUserStats(@PathVariable Long userId) {
        return roomService.getUserStats(userId);
    }
    @GetMapping("/me")
    public UserResponse getCurrentUser(Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }
}