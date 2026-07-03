package com.closehousie

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.closehousie.ui.GameViewModel
import com.closehousie.ui.screens.CreateGameScreen
import com.closehousie.ui.screens.GameBoardScreen
import com.closehousie.ui.screens.HomeScreen
import com.closehousie.ui.screens.JoinGameScreen
import com.closehousie.ui.theme.CloseHousieTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CloseHousieTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val viewModel: GameViewModel = hiltViewModel()
                    var currentScreen by remember { mutableStateOf("HOME") }
                    var playerName by remember { mutableStateOf("") }
                    var deviceId by remember { mutableStateOf("") }

                    val gameState by viewModel.gameState.collectAsState()
                    val currentPlayer by viewModel.currentPlayer.collectAsState()
                    val currentTicket by viewModel.currentTicket.collectAsState()
                    val isHost by viewModel.isHost.collectAsState()
                    val markedNumbers by viewModel.markedNumbers.collectAsState()

                    when (currentScreen) {
                        "HOME" -> {
                            HomeScreen(
                                onCreateGame = {
                                    deviceId = android.provider.Settings.Secure.getString(
                                        contentResolver,
                                        android.provider.Settings.Secure.ANDROID_ID
                                    )
                                    currentScreen = "CREATE_GAME"
                                },
                                onJoinGame = {
                                    deviceId = android.provider.Settings.Secure.getString(
                                        contentResolver,
                                        android.provider.Settings.Secure.ANDROID_ID
                                    )
                                    currentScreen = "JOIN_GAME"
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        "CREATE_GAME" -> {
                            CreateGameScreen(
                                onGameCreated = { joinCode ->
                                    playerName = joinCode
                                    viewModel.createGame("Player ${joinCode}", deviceId)
                                    currentScreen = "GAME_BOARD"
                                },
                                onBack = {
                                    currentScreen = "HOME"
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        "JOIN_GAME" -> {
                            JoinGameScreen(
                                onGameJoined = { hostAddress, joinCode ->
                                    playerName = "Player"
                                    viewModel.joinGame(joinCode, "Player", deviceId, hostAddress)
                                    currentScreen = "GAME_BOARD"
                                },
                                onBack = {
                                    currentScreen = "HOME"
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        "GAME_BOARD" -> {
                            GameBoardScreen(
                                gameState = gameState,
                                ticket = currentTicket,
                                markedNumbers = markedNumbers,
                                isHost = isHost,
                                onMarkNumber = { number ->
                                    viewModel.markNumber(number)
                                },
                                onDrawNumber = {
                                    viewModel.drawNumber()
                                },
                                onStartGame = {
                                    viewModel.startGame()
                                },
                                onClaimWin = { winType ->
                                    viewModel.claimWin(winType)
                                },
                                onEndGame = {
                                    viewModel.endGame()
                                    currentScreen = "HOME"
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                }
            }
        }
    }
}
