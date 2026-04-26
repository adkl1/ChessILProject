package com.example.chessil.controller;

import com.example.chessil.dto.GameResponse;
import com.example.chessil.dto.MoveRequest;
import com.example.chessil.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.example.chessil.dto.GameHistoryResponse;
import java.util.List;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final RoomService roomService;

    @PostMapping("/rooms/{roomId}/start")
    public GameResponse startGame(@PathVariable Long roomId, Authentication authentication) {
        return roomService.startGame(roomId, authentication.getName());
    }

    @GetMapping("/{gameId}")
    public GameResponse getGameById(@PathVariable Long gameId) {
        return roomService.getGameById(gameId);
    }

    @PostMapping("/{gameId}/move")
    public GameResponse makeMove(
            @PathVariable Long gameId,
            @RequestBody MoveRequest request,
            Authentication authentication
    ) {
        return roomService.makeMove(gameId, authentication.getName(), request);
    }

    @GetMapping("/history/{userId}")
    public List<GameHistoryResponse> getUserGameHistory(@PathVariable Long userId) {
        return roomService.getUserGameHistory(userId);
    }
}