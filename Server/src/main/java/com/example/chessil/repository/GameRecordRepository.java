package com.example.chessil.repository;

import com.example.chessil.entity.GameRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameRecordRepository extends JpaRepository<GameRecord, Long> {

    List<GameRecord> findByWhitePlayerIdOrBlackPlayerIdOrderByFinishedAtDesc(
            Long whitePlayerId,
            Long blackPlayerId
    );
}