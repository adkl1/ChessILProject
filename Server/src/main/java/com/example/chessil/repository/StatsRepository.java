package com.example.chessil.repository;

import com.example.chessil.entity.Stats;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatsRepository extends JpaRepository<Stats, Long> {

    List<Stats> findAllByOrderByEloDesc(Pageable pageable);
}