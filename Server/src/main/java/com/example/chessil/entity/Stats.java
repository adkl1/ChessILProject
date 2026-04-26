package com.example.chessil.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stats {

    @Id
    private Long playerId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "player_id")
    private User player;

    private int gamesPlayed;
    private int wins;
    private int losses;
    private int draws;

    private int elo;
}