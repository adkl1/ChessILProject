package com.example.chessil.dto;

import com.example.chessil.model.RoomStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomResponse {

    private Long id;

    private Long hostId;
    private String hostUsername;

    private Long guestId;
    private String guestUsername;

    private RoomStatus status;

    private Long gameId;
}