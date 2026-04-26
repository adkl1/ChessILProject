package com.example.chessil.entity;

import com.example.chessil.model.GameStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long whitePlayerId;
    private String whitePlayerUsername;

    private Long blackPlayerId;
    private String blackPlayerUsername;

    @Enumerated(EnumType.STRING)
    private GameStatus result;

    @Column(columnDefinition = "TEXT")
    private String finalFen;

    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}