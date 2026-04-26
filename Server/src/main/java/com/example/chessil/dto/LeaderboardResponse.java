package com.example.chessil.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardResponse {

    private Long playerId;
    private String username;

    private int elo;
    private int gamesPlayed;
    private int wins;
    private int losses;
    private int draws;
}