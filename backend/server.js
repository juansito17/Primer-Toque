// backend/server.js
// Backend para el juego "Primer Toque"

// --- Dependencias ---
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path'); // Módulo para trabajar con rutas de archivos

// --- Configuración del Servidor ---
const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Permitir conexiones desde cualquier origen (ajusta para producción)
        methods: ["GET", "POST"]
    }
});

// --- Servir archivos estáticos del Frontend ---
// Esto le dice a Express que sirva los archivos de la carpeta 'frontend'
// cuando se acceda a la raíz del servidor (ej: http://localhost:3000/)
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta principal para servir el index.html del frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});


// --- Estado del Juego (En Memoria) ---
let games = {}; // Almacenará múltiples partidas, cada una identificada por un gameCode
/*
Estructura de un juego en 'games':
gameCode: {
    gameCode: String,
    adminSocketId: String | null,
    players: [], // { id: socket.id, name: String, score: Number }
    roundActive: Boolean,
    currentRoundPresses: [], // { playerId: String, playerName: String, pressedTime: Number }
    gameInProgress: Boolean,
    hostName: String // Nombre del administrador/host
}
*/

// --- Lógica de Socket.IO ---
io.on('connection', (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);

    // --- Eventos de Administrador ---
    socket.on('adminCreateGame', (data) => {
        const { adminName } = data;
        let gameCode = generateGameCode();
        while (games[gameCode]) {
            gameCode = generateGameCode();
        }

        games[gameCode] = {
            gameCode: gameCode,
            adminSocketId: socket.id,
            hostName: adminName || 'Admin',
            players: [],
            roundActive: false,
            currentRoundPresses: [],
            gameInProgress: true
        };

        socket.join(gameCode);
        socket.emit('gameCreated', { gameCode, hostName: games[gameCode].hostName });
        console.log(`Admin ${adminName} (${socket.id}) creó la partida ${gameCode}`);
    });

    socket.on('adminStartRound', (data) => {
        const { gameCode } = data;
        const game = games[gameCode];

        if (game && game.adminSocketId === socket.id && game.gameInProgress) {
            if (game.players.length === 0) {
                socket.emit('adminError', { message: 'No hay jugadores para iniciar la ronda.' });
                return;
            }
            game.roundActive = true;
            game.currentRoundPresses = [];
            io.to(gameCode).emit('roundStarted');
            console.log(`Partida ${gameCode}: Ronda iniciada por admin ${socket.id}`);
            io.to(gameCode).emit('gameStateUpdate', getSanitizedGameForPlayers(gameCode));
        } else {
            socket.emit('adminError', { message: 'No se pudo iniciar la ronda o no eres el admin.' });
        }
    });

    socket.on('adminHandleAction', (data) => {
        const { gameCode, action, playerId } = data;
        const game = games[gameCode];

        if (game && game.adminSocketId === socket.id && game.roundActive) {
            let roundMessageForPlayers = "";
            let playerRewarded = null;

            switch (action) {
                case 'sumarPunto':
                    const playerToAddPoint = game.players.find(p => p.id === playerId);
                    if (playerToAddPoint && game.currentRoundPresses.find(p => p.playerId === playerId)) {
                        playerToAddPoint.score += 1;
                        roundMessageForPlayers = `${playerToAddPoint.name} ganó la ronda!`;
                        playerRewarded = playerToAddPoint;
                        console.log(`Partida ${gameCode}: Admin sumó punto a ${playerToAddPoint.name}`);
                        endRound(gameCode, roundMessageForPlayers, playerRewarded);
                    } else {
                         socket.emit('adminError', { message: 'Jugador no encontrado o no presionó en esta ronda.' });
                    }
                    break;
                case 'verSiguiente':
                    // Remover el jugador actual de la lista de presiones pendientes
                    const removedPlayer = game.currentRoundPresses.shift();
                    console.log(`Partida ${gameCode}: Admin descartó a ${removedPlayer?.playerName}.`);

                    if (game.currentRoundPresses.length > 0) {
                        socket.emit('adminNextPlayerToJudge', {
                            nextPlayer: game.currentRoundPresses[0], // El nuevo primero
                            remainingPresses: game.currentRoundPresses // La lista actualizada
                        });
                         console.log(`Partida ${gameCode}: Admin verá al siguiente: ${game.currentRoundPresses[0]?.playerName}.`);
                    } else {
                        roundMessageForPlayers = "No hay más jugadores que hayan presionado en esta ronda.";
                        endRound(gameCode, roundMessageForPlayers);
                    }
                    break;
                case 'saltarRonda':
                    roundMessageForPlayers = "Ronda invalidada por el administrador.";
                    console.log(`Partida ${gameCode}: Ronda saltada por admin`);
                    endRound(gameCode, roundMessageForPlayers);
                    break;
                default:
                    socket.emit('adminError', { message: 'Acción desconocida.'});
            }
        } else {
             socket.emit('adminError', { message: 'No se pudo procesar la acción, la ronda no está activa o no eres el admin.'});
        }
    });

    socket.on('adminEndGame', (data) => {
        const { gameCode } = data;
        const game = games[gameCode];

        if (game && game.adminSocketId === socket.id) {
            io.to(gameCode).emit('gameEnded', {
                message: 'La partida ha sido finalizada por el administrador.',
                finalRanking: getRankedPlayers(gameCode)
            });
            console.log(`Partida ${gameCode}: Finalizada por admin ${socket.id}`);
            cleanupGame(gameCode);
        }
    });

    // --- Eventos de Jugador ---
    socket.on('playerJoinGame', (data) => {
        const { gameCode, playerName } = data;
        const game = games[gameCode];

        if (game && game.gameInProgress) {
            if (game.players.find(p => p.id === socket.id || p.name.toLowerCase() === playerName.toLowerCase())) {
                socket.emit('joinError', { message: 'Ya estás en esta partida o ese nombre ya está en uso.' });
                return;
            }
            if (!playerName.trim()) {
                socket.emit('joinError', { message: 'El nombre no puede estar vacío.' });
                return;
            }
            const newPlayer = {
                id: socket.id,
                name: playerName,
                score: 0
            };
            game.players.push(newPlayer);
            socket.join(gameCode);

            socket.emit('joinSuccess', {
                message: `Te has unido a la partida ${gameCode} como ${playerName}.`,
                gameState: getSanitizedGameForPlayers(gameCode),
                playerId: socket.id
            });

            io.to(gameCode).emit('gameStateUpdate', getSanitizedGameForPlayers(gameCode));
            console.log(`Jugador ${playerName} (${socket.id}) se unió a la partida ${gameCode}`);
        } else {
            socket.emit('joinError', { message: 'Código de juego inválido o la partida no existe/finalizó.' });
        }
    });

    socket.on('playerPressedButton', (data) => {
        const { gameCode, pressedTime } = data;
        const game = games[gameCode];
        const player = game ? game.players.find(p => p.id === socket.id) : null;

        if (game && player && game.roundActive && !game.currentRoundPresses.find(p => p.playerId === socket.id)) {
            game.currentRoundPresses.push({
                playerId: player.id,
                playerName: player.name,
                pressedTime: pressedTime || Date.now()
            });
            game.currentRoundPresses.sort((a, b) => a.pressedTime - b.pressedTime);

            io.to(game.adminSocketId).emit('playerPressedNotification', {
                pressedBy: { playerId: player.id, playerName: player.name },
                allPressesThisRound: game.currentRoundPresses
            });
            console.log(`Partida ${gameCode}: Jugador ${player.name} presionó.`);
        }
    });

    // --- Manejo de Desconexiones ---
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        for (const gameCode in games) {
            const game = games[gameCode];
            if (game.adminSocketId === socket.id) {
                console.log(`Admin de la partida ${gameCode} se desconectó.`);
                io.to(gameCode).emit('gameEnded', {
                    message: 'El administrador se ha desconectado. La partida ha finalizado.',
                    finalRanking: getRankedPlayers(gameCode)
                });
                cleanupGame(gameCode);
                break;
            }

            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const removedPlayer = game.players.splice(playerIndex, 1)[0];
                console.log(`Jugador ${removedPlayer.name} se desconectó de la partida ${gameCode}`);
                
                if (game.roundActive) {
                    const pressIndex = game.currentRoundPresses.findIndex(p => p.playerId === socket.id);
                    if (pressIndex !== -1) {
                        game.currentRoundPresses.splice(pressIndex, 1);
                        // Notificar al admin que la lista de presionados ha cambiado
                         io.to(game.adminSocketId).emit('playerPressedNotification', {
                            allPressesThisRound: game.currentRoundPresses,
                            disconnectedPlayerId: socket.id // Para que el admin sepa que fue por desconexión
                        });
                    }
                }
                // Si no quedan jugadores y el juego está en curso (pero sin admin), podría finalizarse.
                // Pero la desconexión del admin ya cubre esto.
                if (game.players.length === 0 && game.gameInProgress && !game.roundActive) {
                    // Opcional: si no hay jugadores, el admin podría no poder iniciar ronda.
                    // El admin ya recibe 'gameStateUpdate'
                }
                io.to(gameCode).emit('gameStateUpdate', getSanitizedGameForPlayers(gameCode));
                break;
            }
        }
    });
});

// --- Funciones Auxiliares ---
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRankedPlayers(gameCode) {
    const game = games[gameCode];
    if (!game) return [];
    return [...game.players].sort((a, b) => b.score - a.score);
}

function endRound(gameCode, messageForPlayers, playerRewarded = null) {
    const game = games[gameCode];
    if (game) {
        game.roundActive = false;
        // No limpiar currentRoundPresses aquí, se hace al inicio de la siguiente ronda
        // o cuando el admin toma una decisión final sobre todas las presiones.

        io.to(gameCode).emit('roundEnded', {
            message: messageForPlayers,
            ranking: getRankedPlayers(gameCode), // Envía el ranking actualizado
            playerRewarded: playerRewarded ? {id: playerRewarded.id, name: playerRewarded.name, score: playerRewarded.score} : null
        });
        io.to(gameCode).emit('gameStateUpdate', getSanitizedGameForPlayers(gameCode));
        console.log(`Partida ${gameCode}: Ronda finalizada. Mensaje: ${messageForPlayers}`);
    }
}

function cleanupGame(gameCode) {
    const game = games[gameCode];
    if (!game) return;

    const roomSockets = io.sockets.adapter.rooms.get(gameCode);
    if (roomSockets) {
        roomSockets.forEach(clientSocketId => {
            const clientSocket = io.sockets.sockets.get(clientSocketId);
            if (clientSocket) {
                 clientSocket.leave(gameCode);
            }
        });
    }
    delete games[gameCode];
    console.log(`Partida ${gameCode} eliminada y sockets limpiados.`);
}


function getSanitizedGameForPlayers(gameCode) {
    const game = games[gameCode];
    if (!game) return null;
    return {
        gameCode: game.gameCode,
        hostName: game.hostName,
        players: game.players,
        roundActive: game.roundActive,
        gameInProgress: game.gameInProgress,
    };
}

// --- Iniciar el Servidor ---
server.listen(port, () => {
    console.log(`Servidor "Primer Toque" escuchando en http://localhost:${port}`);
});
