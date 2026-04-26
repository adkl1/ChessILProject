package com.example.chessil.model;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Game {

    private Long id;

    private Long whitePlayerId;
    private String whitePlayerUsername;

    private Long blackPlayerId;
    private String blackPlayerUsername;

    private String currentTurn;
    private String fen;

    private GameStatus status;

    private LocalDateTime createdAt;
    private boolean savedToHistory;
}