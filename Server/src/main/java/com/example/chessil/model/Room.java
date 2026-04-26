package com.example.chessil.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    private Long id;

    private Long hostId;
    private String hostUsername;

    private Long guestId;
    private String guestUsername;

    private RoomStatus status;
    private Long gameId;

    private LocalDateTime createdAt;
}