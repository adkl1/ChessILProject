package com.example.chessil.service;

import com.example.chessil.dto.AuthResponse;
import com.example.chessil.dto.LoginRequest;
import com.example.chessil.dto.RegisterRequest;
import com.example.chessil.entity.User;
import com.example.chessil.repository.UserRepository;
import com.example.chessil.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.example.chessil.entity.Stats;
import com.example.chessil.repository.StatsRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StatsRepository statsRepository;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username is already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already in use");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);
        Stats stats = Stats.builder()
                .player(user)
                .gamesPlayed(0)
                .wins(0)
                .losses(0)
                .draws(0)
                .elo(1200)
                .build();

        statsRepository.save(stats);

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .message("User registered successfully")
                .token(token)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .message("Login successful")
                .token(token)
                .build();
    }
}