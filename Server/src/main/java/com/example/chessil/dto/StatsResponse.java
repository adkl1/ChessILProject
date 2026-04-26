package com.example.chessil.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatsResponse {

    private Long playerId;

    private int gamesPlayed;
    private int wins;
    private int losses;
    private int draws;

    private int elo;
}