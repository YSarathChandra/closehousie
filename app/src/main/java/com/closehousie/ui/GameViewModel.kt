package com.closehousie.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.closehousie.data.repository.GameRepository
import com.closehousie.domain.model.GameState
import com.closehousie.domain.model.GameStatus
import com.closehousie.domain.model.Player
import com.closehousie.domain.model.Ticket
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class GameViewModel @Inject constructor(
    private val gameRepository: GameRepository
) : ViewModel() {

    private val _gameState = MutableStateFlow<GameState?>(null)
    val gameState: StateFlow<GameState?> = _gameState.asStateFlow()

    private val _currentPlayer = MutableStateFlow<Player?>(null)
    val currentPlayer: StateFlow<Player?> = _currentPlayer.asStateFlow()

    private val _currentTicket = MutableStateFlow<Ticket?>(null)
    val currentTicket: StateFlow<Ticket?> = _currentTicket.asStateFlow()

    private val _isHost = MutableStateFlow(false)
    val isHost: StateFlow<Boolean> = _isHost.asStateFlow()

    private val _markedNumbers = MutableStateFlow<Set<Int>>(emptySet())
    val markedNumbers: StateFlow<Set<Int>> = _markedNumbers.asStateFlow()

    private val _uiMessage = MutableStateFlow<String?>(null)
    val uiMessage: StateFlow<String?> = _uiMessage.asStateFlow()

    private val _gamePlayers = MutableStateFlow<List<Player>>(emptyList())
    val gamePlayers: StateFlow<List<Player>> = _gamePlayers.asStateFlow()

    init {
        gameRepository.onStateChange { gameState ->
            viewModelScope.launch {
                _gameState.value = gameState
                _gameStatus.value = gameState.status
                _gamePlayers.value = gameState.players.values.toList()
            }
        }

        _currentPlayer.value = gameRepository.getCurrentPlayer()
        _currentTicket.value = gameRepository.getCurrentTicket()
        _isHost.value = gameRepository.getIsHost()
    }

    private val _gameStatus = MutableStateFlow<GameStatus?>(null)
    val gameStatus: StateFlow<GameStatus?> = _gameStatus.asStateFlow()

    fun createGame(playerName: String, deviceId: String) {
        viewModelScope.launch {
            try {
                val game = gameRepository.createGame(playerName, deviceId)
                _gameState.value = game
                _currentPlayer.value = gameRepository.getCurrentPlayer()
                _isHost.value = true
                _uiMessage.value = "Game created! Code: ${game.joinCode}"
            } catch (e: Exception) {
                Timber.e(e, "Failed to create game")
                _uiMessage.value = "Failed to create game: ${e.message}"
            }
        }
    }

    fun joinGame(joinCode: String, playerName: String, deviceId: String, hostAddress: String) {
        viewModelScope.launch {
            try {
                val success = gameRepository.joinGame(joinCode, playerName, deviceId, hostAddress)
                if (success) {
                    _currentPlayer.value = gameRepository.getCurrentPlayer()
                    _uiMessage.value = "Joined game!"
                } else {
                    _uiMessage.value = "Failed to connect to host"
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to join game")
                _uiMessage.value = "Failed to join game: ${e.message}"
            }
        }
    }

    fun startGame() {
        viewModelScope.launch {
            try {
                gameRepository.startGame()
            } catch (e: Exception) {
                Timber.e(e, "Failed to start game")
                _uiMessage.value = "Failed to start game"
            }
        }
    }

    fun drawNumber() {
        viewModelScope.launch {
            try {
                gameRepository.drawNumber()
            } catch (e: Exception) {
                Timber.e(e, "Failed to draw number")
                _uiMessage.value = "Failed to draw number"
            }
        }
    }

    fun markNumber(number: Int) {
        viewModelScope.launch {
            val newMarked = _markedNumbers.value.toMutableSet()
            if (newMarked.contains(number)) {
                newMarked.remove(number)
            } else {
                newMarked.add(number)
            }
            _markedNumbers.value = newMarked
            gameRepository.markNumber(number)
        }
    }

    fun claimWin(winType: com.closehousie.domain.model.WinType) {
        viewModelScope.launch {
            try {
                gameRepository.claimWin(winType)
                _uiMessage.value = "Win claimed!"
            } catch (e: Exception) {
                Timber.e(e, "Failed to claim win")
                _uiMessage.value = "Failed to claim win"
            }
        }
    }

    fun endGame() {
        viewModelScope.launch {
            try {
                gameRepository.endGame()
            } catch (e: Exception) {
                Timber.e(e, "Failed to end game")
            }
        }
    }

    fun clearMessage() {
        _uiMessage.value = null
    }

    override fun onCleared() {
        super.onCleared()
        gameRepository.disconnect()
    }
}
