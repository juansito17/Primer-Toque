// frontend/js/client.js

// Conexión con el servidor Socket.IO
// CAMBIA 'localhost' POR LA DIRECCIÓN IP LOCAL DE TU COMPUTADORA SI PRUEBAS EN RED LOCAL
// Ejemplo: const socket = io('http://192.168.1.105:3000');
const socket = io('http://192.168.0.178:3000');

// Estado del cliente
let clientContext = {
    gameCode: null,
    playerId: null,
    isGameAdmin: false,
    adminName: 'Admin',
    playerName: null,
    currentPressesForAdmin: [],
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

// Botones principales de la pantalla de inicio
const adminAccessBtn = document.getElementById('adminAccessBtn');
const joinGameBtn = document.getElementById('joinGameBtn');

// Otros elementos del DOM
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
const loginAdminBtn = document.getElementById('loginAdminBtn');

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
const submitJoinGameBtn = document.getElementById('submitJoinGameBtn');

// Nuevos elementos para el ranking del jugador al final de la ronda
const playerRoundEndRankingSectionEl = document.getElementById('playerRoundEndRankingSection');
const playerRoundEndRankingListEl = document.getElementById('playerRoundEndRankingList');

const messageBoxEl = document.getElementById('messageBox');

// --- Utilidades ---
function showScreen(screenKey) {
    Object.values(screens).forEach(screen => {
        if(screen) screen.classList.remove('active');
    });
    if (screens[screenKey]) {
        screens[screenKey].classList.add('active');
        // Habilitar/deshabilitar botones según la pantalla y el estado de conexión
        if (screenKey === 'adminLogin' && loginAdminBtn) {
            loginAdminBtn.disabled = !socket.connected;
        } else if (screenKey === 'playerJoin' && submitJoinGameBtn) {
            submitJoinGameBtn.disabled = !socket.connected;
        }
    } else {
        console.error(`Screen key "${screenKey}" not found in screens object.`);
    }
}

function showMessage(message, duration = 3000, isError = false) {
    if (!messageBoxEl) return;
    messageBoxEl.textContent = message;
    messageBoxEl.classList.remove('bg-red-600', 'bg-blue-600');
    if (isError) {
        messageBoxEl.classList.add('bg-red-600');
    } else {
        messageBoxEl.classList.add('bg-blue-600');
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
    if (adminNameDisplayEl) adminNameDisplayEl.textContent = "Admin";
    if (gameCodeDisplayEl) gameCodeDisplayEl.classList.add('hidden');
    if (generatedGameCodeEl) generatedGameCodeEl.textContent = "";
    if (adminGameControlsEl) adminGameControlsEl.classList.add('hidden');
    if (adminRoundResultsEl) adminRoundResultsEl.classList.add('hidden');
    if (connectedPlayersListAdminEl) connectedPlayersListAdminEl.innerHTML = '<li class="text-gray-500">Esperando jugadores...</li>';
    if (rankingListAdminEl) rankingListAdminEl.innerHTML = '<li class="text-gray-500">El ranking aparecerá aquí.</li>';
    if (createGameBtn) createGameBtn.disabled = !socket.connected;
    if (startRoundBtn) startRoundBtn.disabled = true;
    if (endGameBtn) endGameBtn.disabled = true;
}

function resetPlayerUI() {
    if (playerGameCodeInfoEl) playerGameCodeInfoEl.textContent = "";
    if (connectedPlayersListPlayerEl) connectedPlayersListPlayerEl.innerHTML = "";
    if (currentPlayerNameDisplayEl) currentPlayerNameDisplayEl.textContent = "Jugador";
    if (playerCurrentScoreEl) playerCurrentScoreEl.textContent = "0 puntos";
    if (playerPressBtn) {
        playerPressBtn.disabled = true;
        playerPressBtn.innerHTML = '<i class="fas fa-hand-pointer mr-3"></i>¡PRESIONA!';
        playerPressBtn.classList.remove('bg-yellow-500', 'bg-gray-400');
        playerPressBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    }
    if (playerGameCodeEl) playerGameCodeEl.value = '';
    if (playerNameEl) playerNameEl.value = '';
    if (playerRoundEndRankingSectionEl) playerRoundEndRankingSectionEl.classList.add('hidden');
    if (playerRoundEndRankingListEl) playerRoundEndRankingListEl.innerHTML = '<li class="text-gray-400 italic">El ranking aparecerá al final de la ronda.</li>';
}


// --- Lógica de Administrador ---
if (adminAccessBtn) {
    adminAccessBtn.addEventListener('click', () => {
        if (socket.connected) {
            showScreen('adminLogin');
        } else {
            showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
        }
    });
}

if (loginAdminBtn) {
    loginAdminBtn.addEventListener('click', () => {
        const user = adminUserEl.value;
        const pass = adminPassEl.value;
        if (user === 'admin' && pass === 'password') {
            clientContext.adminName = user;
            if (adminNameDisplayEl) adminNameDisplayEl.textContent = clientContext.adminName;
            showScreen('adminPanel');
            showMessage('Login de administrador exitoso.', 2000);
            resetAdminUI(); 
            if(createGameBtn) createGameBtn.disabled = !socket.connected;
        } else {
            showMessage('Credenciales incorrectas.', 3000, true);
        }
    });
}

if (createGameBtn) {
    createGameBtn.addEventListener('click', () => {
        if (socket.connected) {
            socket.emit('adminCreateGame', { adminName: clientContext.adminName });
        } else {
            showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
        }
    });
}

if (startRoundBtn) {
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
}

if (endGameBtn) {
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
}

function adminLogout() {
    showMessage('Cerrando sesión de administrador...', 2000);
    resetClientContext();
    resetAdminUI();
    if(adminUserEl) adminUserEl.value = 'admin';
    if(adminPassEl) adminPassEl.value = 'password';
    showScreen('home');
}

function updateAdminPlayersAndRanking(playersList = [], currentGameState = null) {
    if (connectedPlayersListAdminEl) {
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
    }

    if (rankingListAdminEl) {
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
    }
    
    if (startRoundBtn && currentGameState) {
        startRoundBtn.disabled = currentGameState.roundActive || playersList.length === 0;
        startRoundBtn.textContent = currentGameState.roundActive ? 'Ronda en Curso...' : 'Iniciar Ronda';
    } else if (startRoundBtn) {
        startRoundBtn.disabled = playersList.length === 0;
    }
}

function displayAdminRoundActionUI(pressesThisRound = []) {
    clientContext.currentPressesForAdmin = pressesThisRound;
    if(adminRoundResultsEl) adminRoundResultsEl.classList.remove('hidden');
    if(adminActionButtonsEl) adminActionButtonsEl.innerHTML = '';

    if (pressesThisRound.length === 0) {
        if(firstPlayerDisplayEl) firstPlayerDisplayEl.textContent = 'Esperando presiones o nadie presionó...';
        return;
    }

    const firstPress = pressesThisRound[0];
    if(firstPlayerDisplayEl) firstPlayerDisplayEl.innerHTML = `<b>${firstPress.playerName}</b> presionó primero.`;

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
    if(adminActionButtonsEl) adminActionButtonsEl.appendChild(btnSumar);

    if (pressesThisRound.length > 1) {
        const btnVerSiguiente = document.createElement('button');
        btnVerSiguiente.className = 'btn btn-secondary flex-1';
        btnVerSiguiente.innerHTML = `<i class="fas fa-forward mr-1"></i>No Sumar / Ver Siguiente`;
        btnVerSiguiente.onclick = () => {
            if (socket.connected) {
                socket.emit('adminHandleAction', {
                    gameCode: clientContext.gameCode,
                    action: 'verSiguiente',
                    playerId: firstPress.playerId
                });
            }
        };
        if(adminActionButtonsEl) adminActionButtonsEl.appendChild(btnVerSiguiente);
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
    if(adminActionButtonsEl) adminActionButtonsEl.appendChild(btnSaltar);
}


// --- Lógica de Jugador ---
if (joinGameBtn) {
    joinGameBtn.addEventListener('click', () => {
        if (socket.connected) {
            showScreen('playerJoin');
        } else {
            showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
        }
    });
}

if (submitJoinGameBtn) {
    submitJoinGameBtn.addEventListener('click', () => {
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
}

if (playerPressBtn) {
    playerPressBtn.addEventListener('click', () => {
        if (playerPressBtn.disabled) return;

        playerPressBtn.disabled = true;
        playerPressBtn.innerHTML = '<i class="fas fa-check mr-2"></i>¡PRESIONADO!';
        playerPressBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
        playerPressBtn.classList.add('bg-yellow-500');
        if(playerFeedbackEl) playerFeedbackEl.textContent = '¡Presionaste! Esperando resultados...';

        if (socket.connected) {
            socket.emit('playerPressedButton', { gameCode: clientContext.gameCode, pressedTime: Date.now() });
        }
    });
}

function updatePlayerWaitingRoomUI(playersList = []) {
    if(connectedPlayersListPlayerEl) {
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
}

function updatePlayerScoreUI(playersList = []) {
    const me = playersList.find(p => p.id === clientContext.playerId);
    if (me) {
        if(playerCurrentScoreEl) playerCurrentScoreEl.textContent = `${me.score} puntos`;
        if(currentPlayerNameDisplayEl) currentPlayerNameDisplayEl.textContent = me.name;
    } else {
        if(playerCurrentScoreEl) playerCurrentScoreEl.textContent = `0 puntos`;
        if(currentPlayerNameDisplayEl) currentPlayerNameDisplayEl.textContent = clientContext.playerName || "Jugador";
    }
}

// FUNCIÓN para mostrar el ranking general a los jugadores al final de la ronda
function displayPlayerRoundEndRanking(ranking = []) {
    if (!playerRoundEndRankingListEl || !playerRoundEndRankingSectionEl) return;

    playerRoundEndRankingListEl.innerHTML = '';
    if (ranking.length === 0) {
        playerRoundEndRankingListEl.innerHTML = '<li class="text-gray-500 italic">No hay datos de ranking disponibles.</li>';
    } else {
        ranking.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = `player-ranking-item p-2 rounded ${player.id === clientContext.playerId ? 'bg-blue-100 font-semibold' : 'bg-white'}`;
            li.innerHTML = `
                <span class="w-6 text-center">${index + 1}.</span>
                <span class="flex-grow ml-2 truncate">${player.name}</span>
                <span class="font-bold text-blue-600">${player.score} pts</span>
            `;
            playerRoundEndRankingListEl.appendChild(li);
        });
    }
    playerRoundEndRankingSectionEl.classList.remove('hidden');
}


function playerLeaveGame() {
    showMessage('Saliendo de la partida...', 1500);
    socket.disconnect(); 
    resetClientContext();
    resetPlayerUI();
    showScreen('home');
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

    if(adminAccessBtn) adminAccessBtn.disabled = false;
    if(joinGameBtn) joinGameBtn.disabled = false;

    if (screens.adminLogin && screens.adminLogin.classList.contains('active') && loginAdminBtn) {
        loginAdminBtn.disabled = false;
    }
    if (screens.playerJoin && screens.playerJoin.classList.contains('active') && submitJoinGameBtn) {
        submitJoinGameBtn.disabled = false;
    }
    if (screens.adminPanel && screens.adminPanel.classList.contains('active') && createGameBtn) {
        createGameBtn.disabled = !!clientContext.gameCode; // Deshabilitar si ya hay un juego
    }
});

socket.on('disconnect', (reason) => {
    console.log('Desconectado del servidor:', reason);
    showMessage(`Desconectado: ${reason}. Reintenta la acción o recarga.`, 4000, true);

    if(adminAccessBtn) adminAccessBtn.disabled = true;
    if(joinGameBtn) joinGameBtn.disabled = true;
    if(loginAdminBtn) loginAdminBtn.disabled = true;
    if(createGameBtn) createGameBtn.disabled = true;
    if(submitJoinGameBtn) submitJoinGameBtn.disabled = true;

    if (clientContext.gameCode) {
        if (clientContext.isGameAdmin) resetAdminUI();
        else resetPlayerUI();
        
        resetClientContext();
        showScreen('home');
    }
});

socket.on('gameCreated', (data) => {
    clientContext.gameCode = data.gameCode;
    clientContext.isGameAdmin = true;
    if(generatedGameCodeEl) generatedGameCodeEl.textContent = data.gameCode;
    if(adminNameDisplayEl) adminNameDisplayEl.textContent = data.hostName;
    if(gameCodeDisplayEl) gameCodeDisplayEl.classList.remove('hidden');
    if(adminGameControlsEl) adminGameControlsEl.classList.remove('hidden');
    if(adminRoundResultsEl) adminRoundResultsEl.classList.add('hidden');
    if(startRoundBtn) startRoundBtn.disabled = true;
    if(endGameBtn) endGameBtn.disabled = false;
    if(createGameBtn) createGameBtn.disabled = true;
    updateAdminPlayersAndRanking([], { roundActive: false, players: [] });
    showMessage(`Nueva partida creada. Código: ${data.gameCode}`, 5000);
});

socket.on('gameStateUpdate', (gameState) => {
    if (!gameState) return;
    clientContext.gameCode = gameState.gameCode;

    if (clientContext.isGameAdmin && screens.adminPanel && screens.adminPanel.classList.contains('active')) {
        updateAdminPlayersAndRanking(gameState.players, gameState);
        if (!gameState.gameInProgress) {
            if(adminGameControlsEl) adminGameControlsEl.classList.add('hidden');
            if(createGameBtn) createGameBtn.disabled = !socket.connected;
            if(endGameBtn) endGameBtn.disabled = true;
        } else {
            if(endGameBtn) endGameBtn.disabled = !socket.connected;
        }
    }

    if (clientContext.playerId) {
        updatePlayerScoreUI(gameState.players);
        if(playerGameCodeInfoEl) playerGameCodeInfoEl.textContent = gameState.gameCode;

        if (screens.playerWaitingRoom && screens.playerWaitingRoom.classList.contains('active')) {
            updatePlayerWaitingRoomUI(gameState.players);
            const waitingMsgEl = document.getElementById('waitingMessage');
            if(waitingMsgEl) waitingMsgEl.textContent = gameState.roundActive ? "¡Ronda en curso! Ve a la pantalla de juego." : "Esperando a que el administrador inicie la ronda...";
        }
    }
});

socket.on('playerPressedNotification', (data) => {
    if (clientContext.isGameAdmin) {
        showMessage(`${data.pressedBy.playerName} ha presionado.`);
        displayAdminRoundActionUI(data.allPressesThisRound);
    }
});

socket.on('adminNextPlayerToJudge', (data) => {
    if (clientContext.isGameAdmin) {
        if (data.remainingPresses && data.remainingPresses.length > 0) {
            showMessage(`Mostrando siguiente jugador: ${data.remainingPresses[0].playerName}`);
            displayAdminRoundActionUI(data.remainingPresses);
        } else {
            showMessage('No hay más jugadores que hayan presionado en esta ronda.');
            if(adminRoundResultsEl) adminRoundResultsEl.classList.add('hidden');
        }
    }
});

socket.on('adminError', (data) => {
    showMessage(`Error Admin: ${data.message}`, 3000, true);
});

socket.on('joinSuccess', (data) => {
    clientContext.gameCode = data.gameState.gameCode;
    clientContext.playerId = data.playerId;

    if(playerGameCodeInfoEl) playerGameCodeInfoEl.textContent = clientContext.gameCode;
    if(currentPlayerNameDisplayEl) currentPlayerNameDisplayEl.textContent = clientContext.playerName;
    updatePlayerScoreUI(data.gameState.players);

    showScreen('playerWaitingRoom');
    updatePlayerWaitingRoomUI(data.gameState.players);
    showMessage(data.message, 3000);
    if(playerGameCodeEl) playerGameCodeEl.value = '';
    if(playerNameEl) playerNameEl.value = '';
});

socket.on('joinError', (data) => {
    showMessage(data.message, 4000, true);
    clientContext.playerName = null;
});

socket.on('roundStarted', () => {
    showMessage('¡La ronda ha comenzado!', 2000);
    clientContext.currentPressesForAdmin = [];

    if (clientContext.isGameAdmin) {
        if(startRoundBtn) {
            startRoundBtn.disabled = true;
            startRoundBtn.textContent = 'Ronda en Curso...';
        }
        if(adminRoundResultsEl) adminRoundResultsEl.classList.add('hidden');
        if(firstPlayerDisplayEl) firstPlayerDisplayEl.textContent = 'Esperando presiones...';
        if(adminActionButtonsEl) adminActionButtonsEl.innerHTML = '';
    }
    if (clientContext.playerId) {
        showScreen('playerGame');
        if(playerGameScreenTitleEl) playerGameScreenTitleEl.textContent = "¡RONDA ACTIVA!";
        if(playerGameStatusEl) playerGameStatusEl.textContent = '¡Presiona el botón lo más rápido que puedas!';
        if(playerPressBtn) {
            playerPressBtn.disabled = false;
            playerPressBtn.innerHTML = '<i class="fas fa-hand-pointer mr-3"></i>¡PRESIONA!';
            playerPressBtn.classList.remove('bg-yellow-500', 'bg-gray-400');
            playerPressBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        }
        if(playerFeedbackEl) playerFeedbackEl.textContent = '';
        if (playerRoundEndRankingSectionEl) playerRoundEndRankingSectionEl.classList.add('hidden');
    }
});

socket.on('roundEnded', (data) => { // data: { message, ranking, playerRewarded }
    showMessage(data.message, 4000);
    if (clientContext.isGameAdmin) {
        if(adminRoundResultsEl) adminRoundResultsEl.classList.add('hidden');
        updateAdminPlayersAndRanking(data.ranking, { roundActive: false, players: data.ranking, gameInProgress: true });
    }
    if (clientContext.playerId) {
        if(playerGameScreenTitleEl) playerGameScreenTitleEl.textContent = "Ronda Finalizada";
        if(playerGameStatusEl) playerGameStatusEl.textContent = data.message;
        if(playerPressBtn) {
            playerPressBtn.disabled = true;
            playerPressBtn.innerHTML = 'Esperando...';
            playerPressBtn.classList.remove('bg-green-500', 'hover:bg-green-600', 'bg-yellow-500');
            playerPressBtn.classList.add('bg-gray-400');
        }
        if(playerFeedbackEl) playerFeedbackEl.textContent = '';
        updatePlayerScoreUI(data.ranking);
        displayPlayerRoundEndRanking(data.ranking);

        setTimeout(() => {
            if (screens.playerGame && screens.playerGame.classList.contains('active')) {
                showScreen('playerWaitingRoom');
                const waitingMsgEl = document.getElementById('waitingMessage');
                if(waitingMsgEl) waitingMsgEl.textContent = "Esperando la siguiente ronda...";
                if (playerRoundEndRankingSectionEl) playerRoundEndRankingSectionEl.classList.add('hidden');
            }
        }, 6000);
    }
});

socket.on('gameEnded', (data) => {
    showMessage(data.message + (data.finalRanking ? " Ranking Final:" : ""), 5000);
    if (data.finalRanking) {
        console.log("Ranking Final:", data.finalRanking);
        if (clientContext.playerId && playerRoundEndRankingSectionEl) {
            const finalRankingTitle = document.querySelector('#playerRoundEndRankingSection h3');
            if(finalRankingTitle) finalRankingTitle.textContent = "Ranking Final de la Partida";
            displayPlayerRoundEndRanking(data.finalRanking);
            // Mantener playerGameScreen activa para mostrar el ranking final
            if (screens.playerGame) showScreen('playerGame');
        }
    }

    const delayReset = (data.finalRanking && clientContext.playerId) ? 7000 : 0; // Mayor delay si se muestra ranking final

    setTimeout(() => {
        if (clientContext.isGameAdmin) resetAdminUI();
        else if (clientContext.playerId) resetPlayerUI();
        
        resetClientContext();
        showScreen('home');
        if(adminAccessBtn) adminAccessBtn.disabled = !socket.connected;
        if(joinGameBtn) joinGameBtn.disabled = !socket.connected;
    }, delayReset);
});

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
    if(adminUserEl) adminUserEl.value = 'admin';
    if(adminPassEl) adminPassEl.value = 'password';

    if(adminAccessBtn) adminAccessBtn.disabled = true;
    if(joinGameBtn) joinGameBtn.disabled = true;
    if(loginAdminBtn) loginAdminBtn.disabled = true;
    if(createGameBtn) createGameBtn.disabled = true;
    if(submitJoinGameBtn) submitJoinGameBtn.disabled = true;
    
    showMessage('Intentando conectar al servidor...', 2000, false);
});
