package com.closehousie.domain.model

import kotlinx.serialization.Serializable
import java.util.*

@Serializable
data class Player(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val deviceId: String
)

@Serializable
data class Ticket(
    val id: String = UUID.randomUUID().toString(),
    val numbers: List<Int>,
    val issuedAt: Long = System.currentTimeMillis()
) {
    val markedNumbers = mutableSetOf<Int>()
}

@Serializable
data class GameState(
    val gameId: String = UUID.randomUUID().toString(),
    val joinCode: String,
    val hostId: String,
    val players: Map<String, Player> = emptyMap(),
    val tickets: Map<String, Ticket> = emptyMap(),
    val drawnNumbers: List<Int> = emptyList(),
    val status: GameStatus = GameStatus.WAITING,
    val createdAt: Long = System.currentTimeMillis()
)

enum class GameStatus {
    WAITING, IN_PROGRESS, COMPLETED, CANCELLED
}

@Serializable
sealed class GameMessage {
    abstract val messageId: String
    abstract val senderId: String
    abstract val timestamp: Long

    @Serializable
    data class JoinRequest(
        override val messageId: String = UUID.randomUUID().toString(),
        override val senderId: String,
        val playerName: String,
        val deviceId: String,
        override val timestamp: Long = System.currentTimeMillis()
    ) : GameMessage()

    @Serializable
    data class JoinResponse(
        override val messageId: String = UUID.randomUUID().toString(),
        override val senderId: String,
        val gameState: GameState,
        val playerTicket: Ticket,
        val success: Boolean,
        val errorMessage: String? = null,
        override val timestamp: Long = System.currentTimeMillis()
    ) : GameMessage()

    @Serializable
    data class NumberDrawn(
        override val messageId: String = UUID.randomUUID().toString(),
        override val senderId: String,
        val number: Int,
        val sequence: Int,
        override val timestamp: Long = System.currentTimeMillis()
    ) : GameMessage()

    @Serializable
    data class GameStateSync(
        override val messageId: String = UUID.randomUUID().toString(),
        override val senderId: String,
        val gameState: GameState,
        override val timestamp: Long = System.currentTimeMillis()
    ) : GameMessage()

    @Serializable
    data class WinClaim(
        override val messageId: String = UUID.randomUUID().toString(),
        override val senderId: String,
        val ticketId: String,
        val winType: WinType,
        val winningNumbers: List<Int>,
        override val timestamp: Long = System.currentTimeMillis()
    ) : GameMessage()

    @Serializable
    data class Acknowledgement(
        override val messageId: String = UUID.randomUUID().toString(),
        override val senderId: String,
        val acknowledgedMessageId: String,
        override val timestamp: Long = System.currentTimeMillis()
    ) : GameMessage()
}

enum class WinType {
    SINGLE_LINE, TWO_LINE, FULL_HOUSE
}

@Serializable
data class WinResult(
    val playerId: String,
    val winType: WinType,
    val multiplier: Double
)
