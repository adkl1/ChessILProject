package com.example.chessil.dto;

import com.example.chessil.model.GameStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameResponse {

    private Long id;

    private Long whitePlayerId;
    private String whitePlayerUsername;

    private Long blackPlayerId;
    private String blackPlayerUsername;

    private String currentTurn;
    private String fen;

    private GameStatus status;
}