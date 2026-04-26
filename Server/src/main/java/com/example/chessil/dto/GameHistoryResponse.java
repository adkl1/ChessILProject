package com.example.chessil.dto;

import com.example.chessil.model.GameStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameHistoryResponse {

    private Long id;

    private Long whitePlayerId;
    private String whitePlayerUsername;

    private Long blackPlayerId;
    private String blackPlayerUsername;

    private GameStatus result;

    private String finalFen;

    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}