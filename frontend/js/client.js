// frontend/js/client.js

// Conexión con el servidor Socket.IO
// La URL debe coincidir con tu servidor backend. Si sirves el frontend desde el mismo
// host y puerto que el backend (como está configurado en el server.js),
// io() sin argumentos debería funcionar.
// const socket = io(); // Opción si se sirve desde el mismo dominio/puerto
const socket = io('http://localhost:3000'); // Especificar si es necesario

// Estado del cliente
let clientContext = {
    gameCode: null,
    playerId: null, // El ID de socket de este cliente, si es un jugador
    isGameAdmin: false, // Si este cliente es el admin de la partida actual
    adminName: 'Admin', // Nombre del admin
    playerName: null, // Nombre de este jugador
    currentPressesForAdmin: [], // Para que el admin vea quiénes han presionado en la ronda actual
};

// Elementos del DOM
const screens = {
    home: document.getElementById('homeScreen'),
    adminLogin: document.getElementById('adminLoginScreen'),
    adminPanel: document.getElementById('adminPanelScreen'),
    playerJoin: document.getElementById('playerJoinScreen'),
    playerWaitingRoom: document.getElementById('playerWaitingRoomScreen'),
    playerGame: document.getElementById('playerGameScreen'),
};
const adminUserEl = document.getElementById('adminUser');
const adminPassEl = document.getElementById('adminPass');
const adminNameDisplayEl = document.getElementById('adminNameDisplay');
const generatedGameCodeEl = document.getElementById('generatedGameCode');
const gameCodeDisplayEl = document.getElementById('gameCodeDisplay');
const adminGameControlsEl = document.getElementById('adminGameControls');
const connectedPlayersListAdminEl = document.getElementById('connectedPlayersListAdmin');
const rankingListAdminEl = document.getElementById('rankingListAdmin');
const adminRoundResultsEl = document.getElementById('adminRoundResults');
const firstPlayerDisplayEl = document.getElementById('firstPlayerDisplay');
const adminActionButtonsEl = document.getElementById('adminActionButtons');
const createGameBtn = document.getElementById('createGameBtn');
const startRoundBtn = document.getElementById('startRoundBtn');
const endGameBtn = document.getElementById('endGameBtn');

const playerGameCodeEl = document.getElementById('playerGameCode');
const playerNameEl = document.getElementById('playerName');
const playerGameCodeInfoEl = document.getElementById('playerGameCodeInfo');
const connectedPlayersListPlayerEl = document.getElementById('connectedPlayersListPlayer');
const playerPressBtn = document.getElementById('playerPressBtn');
const playerGameStatusEl = document.getElementById('playerGameStatus');
const playerFeedbackEl = document.getElementById('playerFeedback');
const currentPlayerNameDisplayEl = document.getElementById('currentPlayerNameDisplay');
const playerCurrentScoreEl = document.getElementById('playerCurrentScore');
const playerGameScreenTitleEl = document.getElementById('playerGameScreenTitle');

const messageBoxEl = document.getElementById('messageBox');

// --- Utilidades ---
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    } else {
        console.error(`Screen ${screenName} not found.`);
    }
}

function showMessage(message, duration = 3000, isError = false) {
    messageBoxEl.textContent = message;
    messageBoxEl.classList.remove('bg-red-600', 'bg-blue-600'); // Limpiar colores previos
    if (isError) {
        messageBoxEl.classList.add('bg-red-600'); // Rojo para errores
    } else {
        messageBoxEl.classList.add('bg-blue-600'); // Azul para mensajes normales
    }
    messageBoxEl.classList.add('show');
    setTimeout(() => {
        messageBoxEl.classList.remove('show');
    }, duration);
}

function resetClientContext() {
    clientContext = {
        gameCode: null,
        playerId: null,
        isGameAdmin: false,
        adminName: 'Admin',
        playerName: null,
        currentPressesForAdmin: [],
    };
}

function resetAdminUI() {
    adminNameDisplayEl.textContent = "Admin";
    gameCodeDisplayEl.classList.add('hidden');
    generatedGameCodeEl.textContent = "";
    adminGameControlsEl.classList.add('hidden');
    adminRoundResultsEl.classList.add('hidden');
    connectedPlayersListAdminEl.innerHTML = '<li class="text-gray-500">Esperando jugadores...</li>';
    rankingListAdminEl.innerHTML = '<li class="text-gray-500">El ranking aparecerá aquí.</li>';
    createGameBtn.disabled = false;
    startRoundBtn.disabled = true;
    endGameBtn.disabled = true;
}

function resetPlayerUI() {
    playerGameCodeInfoEl.textContent = "";
    connectedPlayersListPlayerEl.innerHTML = "";
    currentPlayerNameDisplayEl.textContent = "Jugador";
    playerCurrentScoreEl.textContent = "0 puntos";
    playerPressBtn.disabled = true;
    playerPressBtn.innerHTML = '<i class="fas fa-hand-pointer mr-3"></i>¡PRESIONA!';
    playerPressBtn.classList.remove('bg-yellow-500', 'bg-gray-400');
    playerPressBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    playerGameCodeEl.value = '';
    playerNameEl.value = '';
}


// --- Lógica de Administrador ---
document.getElementById('adminAccessBtn').addEventListener('click', () => showScreen('adminLogin'));

document.getElementById('loginAdminBtn').addEventListener('click', () => {
    const user = adminUserEl.value;
    const pass = adminPassEl.value;
    if (user === 'admin' && pass === 'password') {
        clientContext.adminName = user;
        adminNameDisplayEl.textContent = clientContext.adminName;
        showScreen('adminPanel');
        showMessage('Login de administrador exitoso.', 2000);
        resetAdminUI(); // Asegurar que el panel de admin esté limpio
        createGameBtn.disabled = false; // Habilitar crear partida
    } else {
        showMessage('Credenciales incorrectas.', 3000, true);
    }
});

createGameBtn.addEventListener('click', () => {
    if (socket.connected) {
        socket.emit('adminCreateGame', { adminName: clientContext.adminName });
    } else {
        showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
    }
});

startRoundBtn.addEventListener('click', () => {
    if (!clientContext.gameCode) {
        showMessage('Error: No hay código de juego activo.', 3000, true);
        return;
    }
    if (socket.connected) {
        socket.emit('adminStartRound', { gameCode: clientContext.gameCode });
    } else {
        showMessage('No estás conectado al servidor.', 3000, true);
    }
});

endGameBtn.addEventListener('click', () => {
    if (!clientContext.gameCode) {
        showMessage('Error: No hay partida para finalizar.', 3000, true);
        return;
    }
    if (socket.connected) {
        socket.emit('adminEndGame', { gameCode: clientContext.gameCode });
    } else {
        showMessage('No estás conectado al servidor.', 3000, true);
    }
});

function adminLogout() {
    showMessage('Cerrando sesión de administrador...', 2000);
    // El backend manejará la finalización del juego si el admin se desconecta.
    // Aquí solo reseteamos el estado del cliente y la UI.
    resetClientContext();
    resetAdminUI();
    adminUserEl.value = 'admin';
    adminPassEl.value = 'password';
    showScreen('homeScreen');
    // Si el socket estaba conectado como admin de un juego, al hacer logout
    // y potencialmente reconectar, el servidor lo tratará como un nuevo socket.
    // No es necesario emitir 'adminEndGame' aquí explícitamente si el objetivo es solo salir de la UI.
    // Si se quiere finalizar el juego activamente, se podría emitir, pero la desconexión ya lo hace.
}

function updateAdminPlayersAndRanking(playersList = [], currentGameState = null) {
    connectedPlayersListAdminEl.innerHTML = '';
    if (playersList.length === 0) {
        connectedPlayersListAdminEl.innerHTML = '<li class="text-gray-500">Esperando jugadores...</li>';
    } else {
        playersList.forEach(player => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center";
            li.innerHTML = `<span><i class="fas fa-user mr-2 text-blue-500"></i>${player.name}</span> <span class="text-sm text-gray-600">(Puntos: ${player.score})</span>`;
            connectedPlayersListAdminEl.appendChild(li);
        });
    }

    rankingListAdminEl.innerHTML = '';
    const sortedPlayers = [...playersList].sort((a, b) => b.score - a.score);
    if (sortedPlayers.length === 0) {
        rankingListAdminEl.innerHTML = '<li class="text-gray-500">El ranking aparecerá aquí.</li>';
    } else {
        sortedPlayers.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'player-ranking-item';
            li.innerHTML = `
                <span class="font-semibold">${index + 1}.</span>
                <span class="flex-grow ml-2">${player.name}</span>
                <span class="font-bold text-blue-600">${player.score} pts</span>
            `;
            rankingListAdminEl.appendChild(li);
        });
    }

    // Lógica para habilitar/deshabilitar startRoundBtn
    if (currentGameState) {
        startRoundBtn.disabled = currentGameState.roundActive || playersList.length === 0;
        startRoundBtn.textContent = currentGameState.roundActive ? 'Ronda en Curso...' : 'Iniciar Ronda';
    } else {
        // Si no hay gameState, basarse solo en si hay jugadores (asumiendo que la ronda no está activa)
        startRoundBtn.disabled = playersList.length === 0;
    }
}

function displayAdminRoundActionUI(pressesThisRound = []) {
    clientContext.currentPressesForAdmin = pressesThisRound;
    adminRoundResultsEl.classList.remove('hidden');
    adminActionButtonsEl.innerHTML = '';

    if (pressesThisRound.length === 0) {
        firstPlayerDisplayEl.textContent = 'Esperando presiones o nadie presionó...';
        return;
    }

    const firstPress = pressesThisRound[0];
    firstPlayerDisplayEl.innerHTML = `<b>${firstPress.playerName}</b> presionó primero.`;

    const btnSumar = document.createElement('button');
    btnSumar.className = 'btn btn-success flex-1';
    btnSumar.innerHTML = `<i class="fas fa-plus mr-1"></i>Sumar Punto a ${firstPress.playerName}`;
    btnSumar.onclick = () => {
        if (socket.connected) {
            socket.emit('adminHandleAction', {
                gameCode: clientContext.gameCode,
                action: 'sumarPunto',
                playerId: firstPress.playerId
            });
        }
    };
    adminActionButtonsEl.appendChild(btnSumar);

    if (pressesThisRound.length > 1) {
        const btnVerSiguiente = document.createElement('button');
        btnVerSiguiente.className = 'btn btn-secondary flex-1';
        btnVerSiguiente.innerHTML = `<i class="fas fa-forward mr-1"></i>No Sumar / Ver Siguiente`;
        btnVerSiguiente.onclick = () => {
            if (socket.connected) {
                socket.emit('adminHandleAction', {
                    gameCode: clientContext.gameCode,
                    action: 'verSiguiente',
                    playerId: firstPress.playerId // ID del jugador actual para descartar
                });
            }
        };
        adminActionButtonsEl.appendChild(btnVerSiguiente);
    }

    const btnSaltar = document.createElement('button');
    btnSaltar.className = 'btn btn-danger flex-1';
    btnSaltar.innerHTML = `<i class="fas fa-ban mr-1"></i>Saltar Ronda Completa`;
    btnSaltar.onclick = () => {
        if (socket.connected) {
            socket.emit('adminHandleAction', {
                gameCode: clientContext.gameCode,
                action: 'saltarRonda'
            });
        }
    };
    adminActionButtonsEl.appendChild(btnSaltar);
}


// --- Lógica de Jugador ---
document.getElementById('joinGameBtn').addEventListener('click', () => showScreen('playerJoin'));

document.getElementById('submitJoinGameBtn').addEventListener('click', () => {
    const gameCode = playerGameCodeEl.value.trim().toUpperCase();
    const playerName = playerNameEl.value.trim();

    if (!gameCode || !playerName) {
        showMessage('Por favor, ingresa el código del juego y tu nombre.', 3000, true);
        return;
    }
    if (playerName.length > 15) {
        showMessage('Tu nombre no puede exceder los 15 caracteres.', 3000, true);
        return;
    }
    clientContext.playerName = playerName;
    if (socket.connected) {
        socket.emit('playerJoinGame', { gameCode, playerName });
    } else {
        showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
    }
});

playerPressBtn.addEventListener('click', () => {
    if (playerPressBtn.disabled) return;

    playerPressBtn.disabled = true;
    playerPressBtn.innerHTML = '<i class="fas fa-check mr-2"></i>¡PRESIONADO!';
    playerPressBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
    playerPressBtn.classList.add('bg-yellow-500');
    playerFeedbackEl.textContent = '¡Presionaste! Esperando resultados...';

    if (socket.connected) {
        socket.emit('playerPressedButton', { gameCode: clientContext.gameCode, pressedTime: Date.now() });
    }
});

function updatePlayerWaitingRoomUI(playersList = []) {
    connectedPlayersListPlayerEl.innerHTML = '';
    if (playersList.length === 0) {
        connectedPlayersListPlayerEl.innerHTML = '<li class="text-gray-500">Aún no hay jugadores.</li>';
    } else {
        playersList.forEach(player => {
            const li = document.createElement('li');
            li.className = "text-gray-700";
            li.textContent = player.name + (player.id === clientContext.playerId ? " (Tú)" : "");
            connectedPlayersListPlayerEl.appendChild(li);
        });
    }
}

function updatePlayerScoreUI(playersList = []) {
    const me = playersList.find(p => p.id === clientContext.playerId);
    if (me) {
        playerCurrentScoreEl.textContent = `${me.score} puntos`;
        currentPlayerNameDisplayEl.textContent = me.name;
    } else {
        playerCurrentScoreEl.textContent = `0 puntos`;
        currentPlayerNameDisplayEl.textContent = clientContext.playerName || "Jugador";
    }
}

function playerLeaveGame() {
    showMessage('Saliendo de la partida...', 1500);
    socket.disconnect(); // Esto dispara 'disconnect' en servidor y cliente
    resetClientContext();
    resetPlayerUI();
    showScreen('homeScreen');
    // Reintentar conexión después de un breve momento para futuras partidas
    setTimeout(() => {
        if (!socket.connected) {
            socket.connect();
        }
    }, 500);
}

// --- Handlers de Eventos de Socket.IO ---

socket.on('connect', () => {
    console.log('Conectado al servidor Socket.IO:', socket.id);
    showMessage('Conectado al servidor.', 1500);
    // Si el cliente se reconecta y tenía un gameCode, podría intentar reunirse
    // pero la lógica actual del servidor no soporta "re-unión" con el mismo estado.
    // Al reconectar, se obtiene un nuevo socket.id.
    // Por ahora, si no está en la pantalla de inicio, lo llevamos allí.
    if (!screens.home.classList.contains('active') && !clientContext.gameCode) {
        // No hacer nada drástico aquí, el usuario puede estar en login o join.
    }
});

socket.on('disconnect', (reason) => {
    console.log('Desconectado del servidor:', reason);
    showMessage(`Desconectado: ${reason}. Reintenta la acción o recarga.`, 4000, true);
    // Si estábamos en un juego, limpiar la UI y el contexto.
    if (clientContext.gameCode) {
        if (clientContext.isGameAdmin) resetAdminUI();
        else resetPlayerUI();
        
        resetClientContext();
        showScreen('homeScreen'); // Volver a inicio es lo más seguro
    }
    // Los botones de acción que dependen de la conexión podrían deshabilitarse.
    createGameBtn.disabled = true; // Ejemplo
});

// Eventos para Administrador
socket.on('gameCreated', (data) => {
    clientContext.gameCode = data.gameCode;
    clientContext.isGameAdmin = true;
    generatedGameCodeEl.textContent = data.gameCode;
    adminNameDisplayEl.textContent = data.hostName; // Usar el nombre del host desde el servidor
    gameCodeDisplayEl.classList.remove('hidden');
    adminGameControlsEl.classList.remove('hidden');
    adminRoundResultsEl.classList.add('hidden');
    startRoundBtn.disabled = true; // Hasta que haya jugadores
    endGameBtn.disabled = false;
    createGameBtn.disabled = true;
    updateAdminPlayersAndRanking([], { roundActive: false }); // Ranking vacío, ronda no activa
    showMessage(`Nueva partida creada. Código: ${data.gameCode}`, 5000);
});

socket.on('gameStateUpdate', (gameState) => {
    if (!gameState) return;

    clientContext.gameCode = gameState.gameCode; // Sincronizar gameCode

    if (clientContext.isGameAdmin && screens.adminPanel.classList.contains('active')) {
        updateAdminPlayersAndRanking(gameState.players, gameState);
        if (!gameState.gameInProgress) {
            adminGameControlsEl.classList.add('hidden');
            createGameBtn.disabled = false;
            endGameBtn.disabled = true;
        } else {
            endGameBtn.disabled = false;
        }
    }

    if (clientContext.playerId) { // Si es un jugador
        updatePlayerScoreUI(gameState.players);
        playerGameCodeInfoEl.textContent = gameState.gameCode;

        if (screens.playerWaitingRoom.classList.contains('active')) {
            updatePlayerWaitingRoomUI(gameState.players);
            document.getElementById('waitingMessage').textContent = gameState.roundActive ? "¡Ronda en curso! Ve a la pantalla de juego." : "Esperando a que el administrador inicie la ronda...";
            if (gameState.roundActive) {
                // El evento 'roundStarted' se encargará de mover al jugador a la pantalla de juego.
            }
        }
    }
});

socket.on('playerPressedNotification', (data) => { // Solo para Admin
    if (clientContext.isGameAdmin) {
        showMessage(`${data.pressedBy.playerName} ha presionado.`);
        displayAdminRoundActionUI(data.allPressesThisRound);
    }
});

socket.on('adminNextPlayerToJudge', (data) => { // Solo para Admin
    if (clientContext.isGameAdmin) {
        if (data.remainingPresses && data.remainingPresses.length > 0) {
            showMessage(`Mostrando siguiente jugador: ${data.remainingPresses[0].playerName}`);
            displayAdminRoundActionUI(data.remainingPresses);
        } else {
            showMessage('No hay más jugadores que hayan presionado en esta ronda.');
            adminRoundResultsEl.classList.add('hidden');
            // El botón de iniciar ronda se habilitará/deshabilitará via gameStateUpdate o roundEnded
        }
    }
});

socket.on('adminError', (data) => {
    showMessage(`Error Admin: ${data.message}`, 3000, true);
});

// Eventos para Jugador
socket.on('joinSuccess', (data) => {
    clientContext.gameCode = data.gameState.gameCode;
    clientContext.playerId = data.playerId;
    // clientContext.playerName ya se guardó antes de emitir 'playerJoinGame'

    playerGameCodeInfoEl.textContent = clientContext.gameCode;
    currentPlayerNameDisplayEl.textContent = clientContext.playerName;
    updatePlayerScoreUI(data.gameState.players);

    showScreen('playerWaitingRoom');
    updatePlayerWaitingRoomUI(data.gameState.players);
    showMessage(data.message, 3000);
    playerGameCodeEl.value = '';
    playerNameEl.value = '';
});

socket.on('joinError', (data) => {
    showMessage(data.message, 4000, true);
    clientContext.playerName = null; // Resetear si falló el unirse
});

// Eventos para Ambos (Admin y Jugador)
socket.on('roundStarted', () => {
    showMessage('¡La ronda ha comenzado!', 2000);
    clientContext.currentPressesForAdmin = []; // Limpiar presiones para el admin al inicio de ronda

    if (clientContext.isGameAdmin) {
        startRoundBtn.disabled = true;
        startRoundBtn.textContent = 'Ronda en Curso...';
        adminRoundResultsEl.classList.add('hidden');
        firstPlayerDisplayEl.textContent = 'Esperando presiones...'; // Mensaje inicial
        adminActionButtonsEl.innerHTML = ''; // Limpiar botones de acción
    }
    if (clientContext.playerId) {
        showScreen('playerGame');
        playerGameScreenTitleEl.textContent = "¡RONDA ACTIVA!";
        playerGameStatusEl.textContent = '¡Presiona el botón lo más rápido que puedas!';
        playerPressBtn.disabled = false;
        playerPressBtn.innerHTML = '<i class="fas fa-hand-pointer mr-3"></i>¡PRESIONA!';
        playerPressBtn.classList.remove('bg-yellow-500', 'bg-gray-400');
        playerPressBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        playerFeedbackEl.textContent = '';
    }
});

socket.on('roundEnded', (data) => { // data: { message, ranking, playerRewarded }
    showMessage(data.message, 4000);
    if (clientContext.isGameAdmin) {
        adminRoundResultsEl.classList.add('hidden'); // Ocultar acciones de ronda
        // El estado del botón startRoundBtn se actualizará con gameStateUpdate
        updateAdminPlayersAndRanking(data.ranking, { roundActive: false, players: data.ranking });
    }
    if (clientContext.playerId) {
        playerGameScreenTitleEl.textContent = "Ronda Finalizada";
        playerGameStatusEl.textContent = data.message;
        playerPressBtn.disabled = true;
        playerPressBtn.innerHTML = 'Esperando...';
        playerPressBtn.classList.remove('bg-green-500', 'hover:bg-green-600', 'bg-yellow-500');
        playerPressBtn.classList.add('bg-gray-400');
        playerFeedbackEl.textContent = '';
        updatePlayerScoreUI(data.ranking);

        setTimeout(() => {
            if (screens.playerGame.classList.contains('active')) { // Solo si aún está en pantalla de juego
                showScreen('playerWaitingRoom');
                document.getElementById('waitingMessage').textContent = "Esperando la siguiente ronda...";
            }
        }, 4000);
    }
});

socket.on('gameEnded', (data) => {
    showMessage(data.message + (data.finalRanking ? " Ranking Final:" : ""), 5000);
    if (data.finalRanking) {
        console.log("Ranking Final:", data.finalRanking);
        // Podrías mostrar el ranking final en una pantalla específica o en la de inicio.
    }

    if (clientContext.isGameAdmin) {
        resetAdminUI();
    } else if (clientContext.playerId) {
        resetPlayerUI();
    }
    
    resetClientContext();
    showScreen('homeScreen');
});

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
    adminUserEl.value = 'admin'; // Pre-llenar para facilidad de prueba
    adminPassEl.value = 'password';

    // Deshabilitar botones que requieren conexión si el socket no está conectado al inicio
    if (!socket.connected) {
        createGameBtn.disabled = true;
        // Podrías añadir más aquí
        showMessage('Intentando conectar al servidor...', 2000, false);
    }
});
