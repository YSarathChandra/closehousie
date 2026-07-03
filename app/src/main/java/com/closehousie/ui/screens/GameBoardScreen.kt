package com.closehousie.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.closehousie.domain.model.GameState
import com.closehousie.domain.model.GameStatus
import com.closehousie.domain.model.Ticket
import com.closehousie.domain.model.WinType

@Composable
fun GameBoardScreen(
    gameState: GameState?,
    ticket: Ticket?,
    markedNumbers: Set<Int>,
    isHost: Boolean,
    onMarkNumber: (Int) -> Unit,
    onDrawNumber: () -> Unit,
    onStartGame: () -> Unit,
    onClaimWin: (WinType) -> Unit,
    onEndGame: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header with game info
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Code: ${gameState?.joinCode ?: "-"}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = "Players: ${gameState?.players?.size ?: 0}",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
                Text(
                    text = gameState?.status?.name ?: "WAITING",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = when (gameState?.status) {
                        GameStatus.IN_PROGRESS -> MaterialTheme.colorScheme.error
                        GameStatus.COMPLETED -> MaterialTheme.colorScheme.tertiary
                        else -> MaterialTheme.colorScheme.primary
                    }
                )
            }
        }

        // Drawn numbers display
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = "Drawn Numbers (${gameState?.drawnNumbers?.size ?: 0})",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(8.dp)
                )

                LazyVerticalGrid(
                    columns = GridCells.Fixed(9),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 100.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items((1..90).toList()) { number ->
                        val isDrawn = gameState?.drawnNumbers?.contains(number) == true
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(
                                    color = if (isDrawn) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surface,
                                    shape = CircleShape
                                )
                                .border(
                                    width = 1.dp,
                                    color = MaterialTheme.colorScheme.outline,
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = number.toString(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isDrawn) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurface,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }

        // Player ticket display
        if (ticket != null) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.tertiaryContainer
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "Your Ticket",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(8.dp)
                    )

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(ticket.numbers) { number ->
                            val isMarked = markedNumbers.contains(number)
                            val isDrawn = gameState?.drawnNumbers?.contains(number) == true

                            Box(
                                modifier = Modifier
                                    .height(48.dp)
                                    .fillMaxWidth()
                                    .background(
                                        color = when {
                                            isMarked -> MaterialTheme.colorScheme.secondary
                                            isDrawn -> MaterialTheme.colorScheme.tertiary
                                            else -> MaterialTheme.colorScheme.surface
                                        },
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .border(
                                        width = 2.dp,
                                        color = if (isMarked) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outline,
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .clickable(
                                        enabled = gameState?.status == GameStatus.IN_PROGRESS
                                    ) {
                                        onMarkNumber(number)
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = number.toString(),
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }
        }

        // Control buttons
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (isHost) {
                if (gameState?.status == GameStatus.WAITING) {
                    Button(
                        onClick = onStartGame,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("START", fontWeight = FontWeight.Bold)
                    }
                } else if (gameState?.status == GameStatus.IN_PROGRESS) {
                    Button(
                        onClick = onDrawNumber,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("DRAW", fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = onEndGame,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text("END", fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (gameState?.status == GameStatus.IN_PROGRESS && !isHost) {
                Button(
                    onClick = { onClaimWin(WinType.SINGLE_LINE) },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary
                    )
                ) {
                    Text("CLAIM", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }
    }
}
