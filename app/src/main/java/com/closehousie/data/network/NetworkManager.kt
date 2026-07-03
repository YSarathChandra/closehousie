package com.closehousie.data.network

import android.content.Context
import android.net.wifi.WifiManager
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import timber.log.Timber
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.random.Random

@Singleton
class NetworkManager @Inject constructor(private val context: Context) {

    private val json = Json
    private var serverSocket: ServerSocket? = null
    private var clientSocket: Socket? = null
    private var outWriter: PrintWriter? = null
    private var inReader: BufferedReader? = null
    private val receiveScope = CoroutineScope(Dispatchers.IO + Job())

    private val messageCallbacks = mutableListOf<suspend (String) -> Unit>()

    fun generateJoinCode(): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return (0 until 4)
            .map { chars[Random.nextInt(chars.length)] }
            .joinToString("")
    }

    suspend fun startServer(port: Int = 9999): String {
        return withContext(Dispatchers.IO) {
            try {
                serverSocket = ServerSocket(port)
                Timber.d("Server started on port $port")

                // Accept connections in background
                receiveScope.launch {
                    while (serverSocket != null && !serverSocket!!.isClosed) {
                        try {
                            val socket = serverSocket!!.accept()
                            Timber.d("Client connected from ${socket.inetAddress.hostAddress}")
                            handleClientConnection(socket)
                        } catch (e: Exception) {
                            if (serverSocket != null && !serverSocket!!.isClosed) {
                                Timber.e(e, "Error accepting client")
                            }
                        }
                    }
                }

                getLocalIpAddress()
            } catch (e: Exception) {
                Timber.e(e, "Failed to start server")
                throw e
            }
        }
    }

    private suspend fun handleClientConnection(socket: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            val writer = PrintWriter(socket.getOutputStream(), true)

            var line: String?
            while (reader.readLine().also { line = it } != null) {
                line?.let {
                    Timber.d("Received: $it")
                    messageCallbacks.forEach { callback ->
                        callback(it)
                    }
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Error handling client")
        }
    }

    suspend fun connectToHost(hostAddress: String, port: Int = 9999): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                clientSocket = Socket(hostAddress, port)
                outWriter = PrintWriter(clientSocket!!.getOutputStream(), true)
                inReader = BufferedReader(InputStreamReader(clientSocket!!.getInputStream()))

                Timber.d("Connected to host at $hostAddress:$port")

                // Listen for messages
                receiveScope.launch {
                    try {
                        var line: String?
                        while (inReader!!.readLine().also { line = it } != null) {
                            line?.let {
                                Timber.d("Received from host: $it")
                                messageCallbacks.forEach { callback ->
                                    callback(it)
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Timber.e(e, "Error reading from host")
                    }
                }

                true
            } catch (e: Exception) {
                Timber.e(e, "Failed to connect to host")
                false
            }
        }
    }

    fun sendMessage(message: String) {
        try {
            outWriter?.println(message)
            outWriter?.flush()
            Timber.d("Sent: $message")
        } catch (e: Exception) {
            Timber.e(e, "Failed to send message")
        }
    }

    fun broadcast(message: String) {
        sendMessage(message)
    }

    fun onMessageReceived(callback: suspend (String) -> Unit) {
        messageCallbacks.add(callback)
    }

    private fun getLocalIpAddress(): String {
        return try {
            val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            val ip = wifiInfo.ipAddress
            String.format(
                "%d.%d.%d.%d",
                ip and 0xff,
                (ip shr 8) and 0xff,
                (ip shr 16) and 0xff,
                (ip shr 24) and 0xff
            )
        } catch (e: Exception) {
            Timber.e(e, "Failed to get local IP")
            "localhost"
        }
    }

    fun discoverHosts(timeout: Long = 3000): List<String> {
        return try {
            val hosts = mutableListOf<String>()
            val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            val ip = wifiInfo.ipAddress

            val subnet = String.format(
                "%d.%d.%d",
                ip and 0xff,
                (ip shr 8) and 0xff,
                (ip shr 16) and 0xff
            )

            // Simple ping scan
            for (i in 1..254) {
                val address = "$subnet.$i"
                try {
                    if (InetAddress.getByName(address).isReachable(100)) {
                        hosts.add(address)
                    }
                } catch (e: Exception) {
                    // Ignore
                }
            }

            hosts
        } catch (e: Exception) {
            Timber.e(e, "Failed to discover hosts")
            emptyList()
        }
    }

    fun disconnect() {
        try {
            inReader?.close()
            outWriter?.close()
            clientSocket?.close()
            serverSocket?.close()
            receiveScope.cancel()
            Timber.d("Disconnected")
        } catch (e: Exception) {
            Timber.e(e, "Error during disconnect")
        }
    }
}
