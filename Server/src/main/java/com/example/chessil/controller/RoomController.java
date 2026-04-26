package com.example.chessil.controller;

import com.example.chessil.dto.RoomResponse;
import com.example.chessil.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public RoomResponse createRoom(Authentication authentication) {
        return roomService.createRoom(authentication.getName());
    }

    @GetMapping
    public List<RoomResponse> getAllRooms() {
        return roomService.getAllRooms();
    }

    @PostMapping("/{roomId}/join")
    public RoomResponse joinRoom(@PathVariable Long roomId, Authentication authentication) {
        return roomService.joinRoom(roomId, authentication.getName());
    }

    @DeleteMapping("/{roomId}")
    public void leaveOrDeleteRoom(@PathVariable Long roomId, Authentication authentication) {
        roomService.leaveOrDeleteRoom(roomId, authentication.getName());
    }
}