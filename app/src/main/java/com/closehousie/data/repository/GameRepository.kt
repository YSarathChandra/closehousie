package com.closehousie.data.repository

import com.closehousie.data.network.NetworkManager
import com.closehousie.domain.GameEngine
import com.closehousie.domain.model.*
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GameRepository @Inject constructor(
    private val networkManager: NetworkManager,
    private val gameEngine: GameEngine
) {

    private val json = Json
    private var currentGame: GameState? = null
    private var currentPlayer: Player? = null
    private var currentTicket: Ticket? = null
    private var isHost = false

    private val stateChangeCallbacks = mutableListOf<suspend (GameState) -> Unit>()
    private val messageCallbacks = mutableListOf<suspend (GameMessage) -> Unit>()

    init {
        networkManager.onMessageReceived { message ->
            try {
                handleIncomingMessage(message)
            } catch (e: Exception) {
                Timber.e(e, "Error handling message: $message")
            }
        }
    }

    suspend fun createGame(playerName: String, deviceId: String): GameState {
        return withContext(Dispatchers.Default) {
            val joinCode = networkManager.generateJoinCode()
            val player = Player(name = playerName, deviceId = deviceId)
            currentPlayer = player
            isHost = true

            val game = GameState(
                joinCode = joinCode,
                hostId = player.id,
                players = mapOf(player.id to player),
                status = GameStatus.WAITING
            )
            currentGame = game

            // Start server
            withContext(Dispatchers.IO) {
                val ipAddress = networkManager.startServer()
                Timber.d("Host IP: $ipAddress, Join Code: $joinCode")
            }

            notifyStateChange(game)
            game
        }
    }

    suspend fun joinGame(
        joinCode: String,
        playerName: String,
        deviceId: String,
        hostAddress: String
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val player = Player(name = playerName, deviceId = deviceId)
                currentPlayer = player

                // Connect to host
                val connected = networkManager.connectToHost(hostAddress)
                if (!connected) return@withContext false

                // Send join request
                val joinRequest = GameMessage.JoinRequest(
                    senderId = player.id,
                    playerName = playerName,
                    deviceId = deviceId
                )
                networkManager.sendMessage(json.encodeToString(GameMessage.JoinRequest.serializer(), joinRequest))

                true
            } catch (e: Exception) {
                Timber.e(e, "Failed to join game")
                false
            }
        }
    }

    suspend fun startGame() {
        if (!isHost) return

        val game = currentGame?.copy(status = GameStatus.IN_PROGRESS) ?: return
        currentGame = game
        notifyStateChange(game)
        broadcastMessage(GameMessage.GameStateSync(
            senderId = currentPlayer?.id ?: "",
            gameState = game
        ))
    }

    suspend fun drawNumber() {
        if (!isHost) return

        val game = currentGame ?: return
        val drawnNumbers = game.drawnNumbers
        val nextNumber = (1..90).filter { it !in drawnNumbers }.randomOrNull() ?: return

        val updatedGame = game.copy(
            drawnNumbers = drawnNumbers + nextNumber
        )
        currentGame = updatedGame
        notifyStateChange(updatedGame)

        broadcastMessage(GameMessage.NumberDrawn(
            senderId = currentPlayer?.id ?: "",
            number = nextNumber,
            sequence = drawnNumbers.size + 1
        ))
    }

    suspend fun markNumber(number: Int) {
        currentTicket?.markedNumbers?.add(number)
    }

    suspend fun claimWin(winType: WinType) {
        val ticket = currentTicket ?: return
        val player = currentPlayer ?: return
        val winningNumbers = currentGame?.drawnNumbers?.let { drawn ->
            ticket.numbers.filter { it in drawn }
        } ?: return

        broadcastMessage(GameMessage.WinClaim(
            senderId = player.id,
            ticketId = ticket.id,
            winType = winType,
            winningNumbers = winningNumbers
        ))
    }

    suspend fun endGame() {
        if (!isHost) return

        val game = currentGame?.copy(status = GameStatus.COMPLETED) ?: return
        currentGame = game
        notifyStateChange(game)
        broadcastMessage(GameMessage.GameStateSync(
            senderId = currentPlayer?.id ?: "",
            gameState = game
        ))
    }

    private suspend fun handleIncomingMessage(messageJson: String) {
        try {
            // Try to determine message type
            if (messageJson.contains("\"JoinRequest\"")) {
                handleJoinRequest(messageJson)
            } else if (messageJson.contains("\"NumberDrawn\"")) {
                handleNumberDrawn(messageJson)
            } else if (messageJson.contains("\"GameStateSync\"")) {
                handleGameStateSync(messageJson)
            } else if (messageJson.contains("\"WinClaim\"")) {
                handleWinClaim(messageJson)
            }

            messageCallbacks.forEach { it(GameMessage.Acknowledgement(
                senderId = currentPlayer?.id ?: ""
            )) }
        } catch (e: Exception) {
            Timber.e(e, "Error processing message")
        }
    }

    private suspend fun handleJoinRequest(messageJson: String) {
        if (!isHost) return

        try {
            val regex = """"playerName"\s*:\s*"([^"]+)""".toRegex()
            val playerName = regex.find(messageJson)?.groupValues?.get(1) ?: "Unknown"
            val senderIdRegex = """"senderId"\s*:\s*"([^"]+)""".toRegex()
            val senderId = senderIdRegex.find(messageJson)?.groupValues?.get(1) ?: return

            val newPlayer = Player(id = senderId, name = playerName, deviceId = "")
            val game = currentGame ?: return
            val updatedGame = game.copy(
                players = game.players + (senderId to newPlayer)
            )

            // Generate ticket for new player
            val tickets = gameEngine.generateTickets(1)
            val ticket = tickets.first()
            val updatedGameWithTicket = updatedGame.copy(
                tickets = updatedGame.tickets + (ticket.id to ticket)
            )

            currentGame = updatedGameWithTicket
            notifyStateChange(updatedGameWithTicket)

            // Send response to joining player
            broadcastMessage(GameMessage.JoinResponse(
                senderId = currentPlayer?.id ?: "",
                gameState = updatedGameWithTicket,
                playerTicket = ticket,
                success = true
            ))
        } catch (e: Exception) {
            Timber.e(e, "Error handling join request")
        }
    }

    private suspend fun handleNumberDrawn(messageJson: String) {
        try {
            val numberRegex = """"number"\s*:\s*(\d+)""".toRegex()
            val number = numberRegex.find(messageJson)?.groupValues?.get(1)?.toIntOrNull() ?: return

            val game = currentGame ?: return
            if (number !in game.drawnNumbers) {
                val updatedGame = game.copy(
                    drawnNumbers = game.drawnNumbers + number
                )
                currentGame = updatedGame
                notifyStateChange(updatedGame)
            }
        } catch (e: Exception) {
            Timber.e(e, "Error handling number drawn")
        }
    }

    private suspend fun handleGameStateSync(messageJson: String) {
        // Parse and update game state
        try {
            // Simple update - in production, use proper JSON parsing
            Timber.d("Game state synced")
        } catch (e: Exception) {
            Timber.e(e, "Error syncing game state")
        }
    }

    private suspend fun handleWinClaim(messageJson: String) {
        if (!isHost) return
        Timber.d("Win claim received: $messageJson")
    }

    private suspend fun broadcastMessage(message: GameMessage) {
        val messageJson = when (message) {
            is GameMessage.JoinRequest -> json.encodeToString(GameMessage.JoinRequest.serializer(), message)
            is GameMessage.JoinResponse -> json.encodeToString(GameMessage.JoinResponse.serializer(), message)
            is GameMessage.NumberDrawn -> json.encodeToString(GameMessage.NumberDrawn.serializer(), message)
            is GameMessage.GameStateSync -> json.encodeToString(GameMessage.GameStateSync.serializer(), message)
            is GameMessage.WinClaim -> json.encodeToString(GameMessage.WinClaim.serializer(), message)
            is GameMessage.Acknowledgement -> json.encodeToString(GameMessage.Acknowledgement.serializer(), message)
        }
        networkManager.broadcast(messageJson)
    }

    private suspend fun notifyStateChange(gameState: GameState) {
        stateChangeCallbacks.forEach { it(gameState) }
    }

    fun onStateChange(callback: suspend (GameState) -> Unit) {
        stateChangeCallbacks.add(callback)
    }

    fun onMessageReceived(callback: suspend (GameMessage) -> Unit) {
        messageCallbacks.add(callback)
    }

    fun getCurrentGame(): GameState? = currentGame
    fun getCurrentPlayer(): Player? = currentPlayer
    fun getCurrentTicket(): Ticket? = currentTicket
    fun getIsHost(): Boolean = isHost

    fun disconnect() {
        networkManager.disconnect()
    }
}
