package com.closehousie.domain

import com.closehousie.domain.model.Ticket
import com.closehousie.domain.model.WinType
import javax.inject.Inject
import kotlin.math.abs
import kotlin.math.min

class GameEngine @Inject constructor() {

    fun generateTickets(count: Int): List<Ticket> {
        return (0 until count).map { index ->
            generateTicketForIndex(index)
        }
    }

    private fun generateTicketForIndex(index: Int): Ticket {
        val numbers = mutableSetOf<Int>()
        val seed = index.toLong()

        // Each column has specific number ranges
        val ranges = listOf(
            1..9,      // Column 1
            10..19,    // Column 2
            20..29,    // Column 3
            30..39,    // Column 4
            40..49,    // Column 5
            50..59,    // Column 6
            60..69,    // Column 7
            70..79,    // Column 8
            80..90     // Column 9
        )

        // Pick 1-2 numbers from each of 9 columns to get 15 total
        for ((colIndex, range) in ranges.withIndex()) {
            val count = if (colIndex < 3) 2 else if (colIndex < 6) 2 else 1
            val selected = range.shuffled(java.util.Random(seed + colIndex))
                .take(count)
            numbers.addAll(selected)
        }

        return Ticket(numbers = numbers.sorted())
    }

    fun detectWin(markedNumbers: Set<Int>, drawnNumbers: List<Int>): Pair<WinType?, List<Int>> {
        val drawnSet = drawnNumbers.toSet()
        val matchedNumbers = markedNumbers.filter { it in drawnSet }

        val singleLineWin = checkSingleLine(matchedNumbers)
        val twoLineWin = checkTwoLine(matchedNumbers)
        val fullHouseWin = checkFullHouse(matchedNumbers, markedNumbers)

        return when {
            fullHouseWin -> WinType.FULL_HOUSE to matchedNumbers
            twoLineWin -> WinType.TWO_LINE to matchedNumbers
            singleLineWin -> WinType.SINGLE_LINE to matchedNumbers
            else -> null to emptyList()
        }
    }

    private fun checkSingleLine(matchedNumbers: List<Int>): Boolean {
        return matchedNumbers.size >= 5  // Simple heuristic for single line
    }

    private fun checkTwoLine(matchedNumbers: List<Int>): Boolean {
        return matchedNumbers.size >= 10  // Simple heuristic for two lines
    }

    private fun checkFullHouse(matchedNumbers: List<Int>, allNumbers: Set<Int>): Boolean {
        return matchedNumbers.size >= min(13, allNumbers.size)  // 13 out of 15 numbers
    }

    fun getPrizeMultiplier(winType: WinType): Double {
        return when (winType) {
            WinType.SINGLE_LINE -> 2.0
            WinType.TWO_LINE -> 3.5
            WinType.FULL_HOUSE -> 5.0
        }
    }

    fun getWinningNumbers(ticket: Ticket, drawnNumbers: List<Int>): List<Int> {
        val drawnSet = drawnNumbers.toSet()
        return ticket.numbers.filter { it in drawnSet }
    }
}
