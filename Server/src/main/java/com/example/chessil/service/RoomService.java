package com.example.chessil.service;

import com.example.chessil.dto.GameResponse;
import com.example.chessil.dto.RoomResponse;
import com.example.chessil.dto.SocketEvent;
import com.example.chessil.entity.User;
import com.example.chessil.model.Game;
import com.example.chessil.model.GameStatus;
import com.example.chessil.model.Room;
import com.example.chessil.model.RoomStatus;
import com.example.chessil.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Square;
import com.example.chessil.dto.MoveRequest;
import com.github.bhlangonijr.chesslib.move.Move;
import com.github.bhlangonijr.chesslib.Piece;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import com.example.chessil.entity.GameRecord;
import com.example.chessil.repository.GameRecordRepository;
import com.example.chessil.dto.GameHistoryResponse;
import com.example.chessil.entity.Stats;
import com.example.chessil.repository.StatsRepository;
import com.example.chessil.dto.StatsResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import com.example.chessil.dto.LeaderboardResponse;
import java.util.List;


@Service
@RequiredArgsConstructor
public class RoomService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final ConcurrentHashMap<Long, Room> rooms = new ConcurrentHashMap<>();
    private final AtomicLong roomIdGenerator = new AtomicLong(1);

    private final ConcurrentHashMap<Long, Game> games = new ConcurrentHashMap<>();
    private final AtomicLong gameIdGenerator = new AtomicLong(1);
    private final GameRecordRepository gameRecordRepository;
    private final StatsRepository statsRepository;

    public RoomResponse createRoom(String email) {
        User host = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean alreadyInRoom = rooms.values().stream().anyMatch(room ->
                room.getStatus() != RoomStatus.CLOSED &&
                        (host.getId().equals(room.getHostId()) || host.getId().equals(room.getGuestId()))
        );

        if (alreadyInRoom) {
            throw new RuntimeException("User is already in a room");
        }

        Long roomId = roomIdGenerator.getAndIncrement();

        Room room = Room.builder()
                .id(roomId)
                .hostId(host.getId())
                .hostUsername(host.getUsername())
                .guestId(null)
                .guestUsername(null)
                .status(RoomStatus.WAITING)
                .gameId(null)
                .createdAt(LocalDateTime.now())
                .build();

        rooms.put(roomId, room);

        RoomResponse response = mapToRoomResponse(room);

        messagingTemplate.convertAndSend(
                "/topic/rooms",
                SocketEvent.builder()
                        .type("ROOM_CREATED")
                        .payload(response)
                        .build()
        );

        return response;
    }

    public List<RoomResponse> getAllRooms() {
        return rooms.values().stream()
                .filter(room -> room.getStatus() != RoomStatus.CLOSED)
                .sorted(Comparator.comparing(Room::getCreatedAt))
                .map(this::mapToRoomResponse)
                .toList();
    }

    public RoomResponse joinRoom(Long roomId, String email) {
        User guest = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Room room = rooms.get(roomId);

        if (room == null || room.getStatus() == RoomStatus.CLOSED) {
            throw new RuntimeException("Room not found");
        }

        if (guest.getId().equals(room.getHostId())) {
            throw new RuntimeException("Host cannot join their own room");
        }

        boolean alreadyInRoom = rooms.values().stream().anyMatch(existingRoom ->
                existingRoom.getStatus() != RoomStatus.CLOSED &&
                        (guest.getId().equals(existingRoom.getHostId()) || guest.getId().equals(existingRoom.getGuestId()))
        );

        if (alreadyInRoom) {
            throw new RuntimeException("User is already in a room");
        }

        if (room.getGuestId() != null) {
            throw new RuntimeException("Room is already full");
        }

        room.setGuestId(guest.getId());
        room.setGuestUsername(guest.getUsername());
        room.setStatus(RoomStatus.FULL);

        RoomResponse response = mapToRoomResponse(room);

        messagingTemplate.convertAndSend(
                "/topic/rooms",
                SocketEvent.builder()
                        .type("ROOM_UPDATED")
                        .payload(response)
                        .build()
        );

        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId,
                SocketEvent.builder()
                        .type("ROOM_JOINED")
                        .payload(response)
                        .build()
        );

        return response;
    }

    public void leaveOrDeleteRoom(Long roomId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Room room = rooms.get(roomId);

        if (room == null || room.getStatus() == RoomStatus.CLOSED) {
            throw new RuntimeException("Room not found");
        }

        boolean isHost = user.getId().equals(room.getHostId());
        boolean isGuest = user.getId().equals(room.getGuestId());

        if (!isHost && !isGuest) {
            throw new RuntimeException("User is not in this room");
        }

        if (isHost) {
            RoomResponse response = mapToRoomResponse(room);
            rooms.remove(roomId);

            messagingTemplate.convertAndSend(
                    "/topic/rooms",
                    SocketEvent.builder()
                            .type("ROOM_DELETED")
                            .payload(response)
                            .build()
            );

            messagingTemplate.convertAndSend(
                    "/topic/rooms/" + roomId,
                    SocketEvent.builder()
                            .type("ROOM_DELETED")
                            .payload(response)
                            .build()
            );

            return;
        }

        room.setGuestId(null);
        room.setGuestUsername(null);
        room.setStatus(RoomStatus.WAITING);

        RoomResponse response = mapToRoomResponse(room);

        messagingTemplate.convertAndSend(
                "/topic/rooms",
                SocketEvent.builder()
                        .type("ROOM_UPDATED")
                        .payload(response)
                        .build()
        );

        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId,
                SocketEvent.builder()
                        .type("ROOM_LEFT")
                        .payload(response)
                        .build()
        );
    }

    public GameResponse startGame(Long roomId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Room room = rooms.get(roomId);

        if (room == null || room.getStatus() == RoomStatus.CLOSED) {
            throw new RuntimeException("Room not found");
        }

        if (!user.getId().equals(room.getHostId())) {
            throw new RuntimeException("Only the host can start the game");
        }

        if (room.getGuestId() == null) {
            throw new RuntimeException("Cannot start game until a second player joins");
        }

        if (room.getGameId() != null) {
            throw new RuntimeException("Game already started for this room");
        }

        Long gameId = gameIdGenerator.getAndIncrement();
        Board board = new Board();
        Game game = Game.builder()
                .id(gameId)
                .whitePlayerId(room.getHostId())
                .whitePlayerUsername(room.getHostUsername())
                .blackPlayerId(room.getGuestId())
                .blackPlayerUsername(room.getGuestUsername())
                .currentTurn("WHITE")
                .fen(board.getFen())
                .status(GameStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        games.put(gameId, game);

        room.setGameId(gameId);
        room.setStatus(RoomStatus.IN_GAME);

        RoomResponse roomResponse = mapToRoomResponse(room);
        GameResponse gameResponse = mapToGameResponse(game);

        messagingTemplate.convertAndSend(
                "/topic/rooms",
                SocketEvent.builder()
                        .type("ROOM_DELETED")
                        .payload(roomResponse)
                        .build()
        );

        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId,
                SocketEvent.builder()
                        .type("GAME_STARTED")
                        .payload(roomResponse)
                        .build()
        );

        messagingTemplate.convertAndSend(
                "/topic/games/" + gameId,
                SocketEvent.builder()
                        .type("GAME_CREATED")
                        .payload(gameResponse)
                        .build()
        );

        rooms.remove(roomId);

        return gameResponse;
    }

    public GameResponse getGameById(Long gameId) {
        Game game = games.get(gameId);

        if (game == null) {
            throw new RuntimeException("Game not found");
        }

        return mapToGameResponse(game);
    }

    private RoomResponse mapToRoomResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .hostId(room.getHostId())
                .hostUsername(room.getHostUsername())
                .guestId(room.getGuestId())
                .guestUsername(room.getGuestUsername())
                .status(room.getStatus())
                .gameId(room.getGameId())
                .build();
    }

    private GameResponse mapToGameResponse(Game game) {
        return GameResponse.builder()
                .id(game.getId())
                .whitePlayerId(game.getWhitePlayerId())
                .whitePlayerUsername(game.getWhitePlayerUsername())
                .blackPlayerId(game.getBlackPlayerId())
                .blackPlayerUsername(game.getBlackPlayerUsername())
                .currentTurn(game.getCurrentTurn())
                .fen(game.getFen())
                .status(game.getStatus())
                .build();
    }
    public GameResponse makeMove(Long gameId, String email, MoveRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Game game = games.get(gameId);

        if (game == null) {
            throw new RuntimeException("Game not found");
        }

        if (game.getStatus() != GameStatus.ACTIVE) {
            throw new RuntimeException("Game is not active");
        }

        boolean isWhitePlayer = user.getId().equals(game.getWhitePlayerId());
        boolean isBlackPlayer = user.getId().equals(game.getBlackPlayerId());

        if (!isWhitePlayer && !isBlackPlayer) {
            throw new RuntimeException("User is not part of this game");
        }

        if (game.getCurrentTurn().equals("WHITE") && !isWhitePlayer) {
            throw new RuntimeException("It is white player's turn");
        }

        if (game.getCurrentTurn().equals("BLACK") && !isBlackPlayer) {
            throw new RuntimeException("It is black player's turn");
        }

        Board board = new Board();
        board.loadFromFen(game.getFen());

        Square from = Square.valueOf(request.getFrom().toUpperCase());
        Square to = Square.valueOf(request.getTo().toUpperCase());

        Move move;

        if (request.getPromotion() != null && !request.getPromotion().isBlank()) {
            Piece promotionPiece = Piece.fromValue(request.getPromotion().toUpperCase());
            move = new Move(from, to, promotionPiece);
        } else {
            move = new Move(from, to);
        }

        if (!board.isMoveLegal(move, true)) {
            throw new RuntimeException("Illegal move");
        }

        board.doMove(move);

        game.setFen(board.getFen());

        String playerWhoMoved = game.getCurrentTurn();

        if (board.isMated()) {
            if (playerWhoMoved.equals("WHITE")) {
                game.setStatus(GameStatus.WHITE_WIN);
            } else {
                game.setStatus(GameStatus.BLACK_WIN);
            }
        } else if (board.isDraw()) {
            game.setStatus(GameStatus.DRAW);
        } else {
            game.setCurrentTurn(playerWhoMoved.equals("WHITE") ? "BLACK" : "WHITE");
            game.setStatus(GameStatus.ACTIVE);
        }

        if (!game.isSavedToHistory() &&
                (game.getStatus() == GameStatus.WHITE_WIN ||
                        game.getStatus() == GameStatus.BLACK_WIN ||
                        game.getStatus() == GameStatus.DRAW)) {

            saveFinishedGame(game);
            updateStatsAfterGame(game);
            game.setSavedToHistory(true);
        }

        GameResponse response = mapToGameResponse(game);

        // Broadcast update
        messagingTemplate.convertAndSend(
                "/topic/games/" + gameId,
                SocketEvent.builder()
                        .type("MOVE_PLAYED")
                        .payload(response)
                        .build()
        );

        return response;
    }

    private void saveFinishedGame(Game game) {
        GameRecord record = GameRecord.builder()
                .whitePlayerId(game.getWhitePlayerId())
                .whitePlayerUsername(game.getWhitePlayerUsername())
                .blackPlayerId(game.getBlackPlayerId())
                .blackPlayerUsername(game.getBlackPlayerUsername())
                .result(game.getStatus())
                .finalFen(game.getFen())
                .startedAt(game.getCreatedAt())
                .finishedAt(LocalDateTime.now())
                .build();

        gameRecordRepository.save(record);
    }

    public List<GameHistoryResponse> getUserGameHistory(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found");
        }

        return gameRecordRepository
                .findByWhitePlayerIdOrBlackPlayerIdOrderByFinishedAtDesc(userId, userId)
                .stream()
                .map(this::mapToGameHistoryResponse)
                .toList();
    }

    private GameHistoryResponse mapToGameHistoryResponse(GameRecord record) {
        return GameHistoryResponse.builder()
                .id(record.getId())
                .whitePlayerId(record.getWhitePlayerId())
                .whitePlayerUsername(record.getWhitePlayerUsername())
                .blackPlayerId(record.getBlackPlayerId())
                .blackPlayerUsername(record.getBlackPlayerUsername())
                .result(record.getResult())
                .finalFen(record.getFinalFen())
                .startedAt(record.getStartedAt())
                .finishedAt(record.getFinishedAt())
                .build();
    }

    private int calculateNewElo(int currentElo, int opponentElo, double score) {
        final int k = 32;

        double expectedScore = 1.0 / (1.0 + Math.pow(10, (opponentElo - currentElo) / 400.0));

        return (int) Math.round(currentElo + k * (score - expectedScore));
    }

    private void updateStatsAfterGame(Game game) {
        Stats whiteStats = statsRepository.findById(game.getWhitePlayerId())
                .orElseThrow(() -> new RuntimeException("White player stats not found"));

        Stats blackStats = statsRepository.findById(game.getBlackPlayerId())
                .orElseThrow(() -> new RuntimeException("Black player stats not found"));

        int whiteOldElo = whiteStats.getElo();
        int blackOldElo = blackStats.getElo();

        double whiteScore;
        double blackScore;


        if (game.getStatus() == GameStatus.WHITE_WIN) {
            whiteStats.setWins(whiteStats.getWins() + 1);
            blackStats.setLosses(blackStats.getLosses() + 1);

            whiteScore = 1;
            blackScore = 0;

        } else if (game.getStatus() == GameStatus.BLACK_WIN) {
            blackStats.setWins(blackStats.getWins() + 1);
            whiteStats.setLosses(whiteStats.getLosses() + 1);

            whiteScore = 0;
            blackScore = 1;

        } else if (game.getStatus() == GameStatus.DRAW) {
            whiteStats.setDraws(whiteStats.getDraws() + 1);
            blackStats.setDraws(blackStats.getDraws() + 1);

            whiteScore = 0.5;
            blackScore = 0.5;

        } else {
            return;
        }

        whiteStats.setGamesPlayed(whiteStats.getGamesPlayed() + 1);
        blackStats.setGamesPlayed(blackStats.getGamesPlayed() + 1);

        whiteStats.setElo(calculateNewElo(whiteOldElo, blackOldElo, whiteScore));
        blackStats.setElo(calculateNewElo(blackOldElo, whiteOldElo, blackScore));

        statsRepository.save(whiteStats);
        statsRepository.save(blackStats);
    }

    public StatsResponse getUserStats(Long userId) {
        Stats stats = statsRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Stats not found"));

        return StatsResponse.builder()
                .playerId(stats.getPlayerId())
                .gamesPlayed(stats.getGamesPlayed())
                .wins(stats.getWins())
                .losses(stats.getLosses())
                .draws(stats.getDraws())
                .elo(stats.getElo())
                .build();
    }

    public List<LeaderboardResponse> getLeaderboard(int limit) {

        return statsRepository
                .findAllByOrderByEloDesc(PageRequest.of(0, limit))
                .stream()
                .map(this::mapToLeaderboardResponse)
                .toList();
    }

    private LeaderboardResponse mapToLeaderboardResponse(Stats stats) {
        return LeaderboardResponse.builder()
                .playerId(stats.getPlayerId())
                .username(stats.getPlayer().getUsername())
                .elo(stats.getElo())
                .gamesPlayed(stats.getGamesPlayed())
                .wins(stats.getWins())
                .losses(stats.getLosses())
                .draws(stats.getDraws())
                .build();
    }
}