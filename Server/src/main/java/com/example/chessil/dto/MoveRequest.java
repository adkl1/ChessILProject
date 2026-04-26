package com.example.chessil.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoveRequest {

    private String from;
    private String to;
    private String promotion;
}