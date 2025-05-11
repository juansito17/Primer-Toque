// frontend/js/client.js

// Conexión con el servidor Socket.IO
// CAMBIA 'localhost' POR LA DIRECCIÓN IP LOCAL DE TU COMPUTADORA SI PRUEBAS EN RED LOCAL
// Ejemplo: const socket = io('http://192.168.1.105:3000');
const socket = io('http://localhost:3000');

// Estado del cliente
let clientContext = {
    gameCode: null,
    playerId: null,
    isGameAdmin: false,
    adminName: 'Admin',
    playerName: null,
    currentPressesForAdmin: [],
    soundMuted: false, // Nuevo estado para silenciar sonidos
};

// --- Configuración de Sonidos con Tone.js ---
let sounds = {};
let masterVolume = new Tone.Volume(-10).toDestination(); // Bajar un poco el volumen general

function initializeSounds() {
    // Envolver la inicialización de sonidos en una interacción del usuario si es necesario
    // por políticas de autoplay de los navegadores.
    // Por ahora, intentaremos inicializar directamente.
    try {
        sounds.click = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.1 }
        }).connect(masterVolume);

        sounds.playerPress = new Tone.Synth({
            oscillator: { type: 'triangle8' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.2 },
            volume: -6
        }).connect(masterVolume);

        sounds.roundStart = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.7,
            volume: -3
        }).connect(masterVolume);
        
        sounds.roundEndWin = new Tone.Synth({ // Sonido para cuando se gana un punto
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.3 },
            filter: { type: 'lowpass', frequency: 1000, Q: 1 },
            filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0, release: 0.2, baseFrequency: 200, octaves: 2 }
        }).connect(masterVolume);

        sounds.roundEndLose = new Tone.NoiseSynth({ // Sonido para fin de ronda sin punto o error
            noise: { type: 'white' },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
            volume: -15
        }).connect(masterVolume);

        sounds.gameNotification = new Tone.Synth({ // Para notificaciones generales
            oscillator: { type: 'square' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.2, release: 0.1 },
            volume: -8
        }).connect(masterVolume);

        console.log("Sonidos inicializados con Tone.js");
    } catch (error) {
        console.error("Error inicializando sonidos con Tone.js:", error);
        // Deshabilitar sonidos si hay un error
        clientContext.soundMuted = true; 
        if(muteSoundBtnTextEl) muteSoundBtnTextEl.textContent = "Sonidos Deshabilitados (Error)";
        if(muteSoundBtn) muteSoundBtn.disabled = true;
    }
}

function playSound(soundName, note = null, duration = '8n') {
    if (clientContext.soundMuted || !sounds[soundName]) return;

    // Asegurarse de que Tone.js se haya iniciado (puede requerir interacción del usuario)
    if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
            console.log("AudioContext de Tone.js iniciado.");
            triggerSoundPlayback(soundName, note, duration);
        }).catch(e => console.error("Error al iniciar AudioContext de Tone.js:", e));
    } else {
        triggerSoundPlayback(soundName, note, duration);
    }
}

function triggerSoundPlayback(soundName, note, duration) {
    try {
        switch (soundName) {
            case 'click':
                sounds.click.triggerAttackRelease(note || 'C5', duration);
                break;
            case 'playerPress':
                sounds.playerPress.triggerAttackRelease(note || 'E4', '4n');
                break;
            case 'roundStart':
                sounds.roundStart.triggerAttackRelease(note || 'G4', '2n', Tone.now() + 0.05);
                break;
            case 'roundEndWin':
                sounds.roundEndWin.triggerAttackRelease(note || 'C5', '2n');
                // Pequeña melodía ascendente
                // sounds.roundEndWin.triggerAttackRelease("C5", "8n", "+0.0");
                // sounds.roundEndWin.triggerAttackRelease("E5", "8n", "+0.1");
                // sounds.roundEndWin.triggerAttackRelease("G5", "8n", "+0.2");
                break;
            case 'roundEndLose':
                sounds.roundEndLose.triggerAttackRelease('4n');
                break;
            case 'gameNotification':
                sounds.gameNotification.triggerAttackRelease(note || 'A4', duration);
                break;
            default:
                console.warn(`Sonido "${soundName}" no definido.`);
        }
    } catch (error) {
        console.error(`Error al reproducir sonido ${soundName}:`, error);
    }
}


// Elementos del DOM
const screens = {
    home: document.getElementById('homeScreen'),
    adminLogin: document.getElementById('adminLoginScreen'),
    adminPanel: document.getElementById('adminPanelScreen'),
    playerJoin: document.getElementById('playerJoinScreen'),
    playerWaitingRoom: document.getElementById('playerWaitingRoomScreen'),
    playerGame: document.getElementById('playerGameScreen'),
};

const adminAccessBtn = document.getElementById('adminAccessBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const muteSoundBtn = document.getElementById('muteSoundBtn');
const muteSoundBtnTextEl = document.getElementById('muteSoundBtnText');

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
        if (screenKey === 'adminLogin' && loginAdminBtn) {
            loginAdminBtn.disabled = !socket.connected;
        } else if (screenKey === 'playerJoin' && submitJoinGameBtn) {
            submitJoinGameBtn.disabled = !socket.connected;
        }
    } else {
        console.error(`Screen key "${screenKey}" not found in screens object.`);
    }
}

function showMessage(message, duration = 3000, isError = false, soundType = null) {
    if (!messageBoxEl) return;
    messageBoxEl.textContent = message;
    messageBoxEl.classList.remove('error', 'success', 'info'); // Quitar clases de tipo anteriores
    if (isError) {
        messageBoxEl.classList.add('error');
        playSound(soundType || 'roundEndLose'); // Sonido de error por defecto
    } else {
        // Determinar clase de éxito o info si es necesario
        if (message.toLowerCase().includes('éxito') || message.toLowerCase().includes('creada') || message.toLowerCase().includes('unido')) {
            messageBoxEl.classList.add('success');
            playSound(soundType || 'gameNotification', 'C5');
        } else {
            messageBoxEl.classList.add('info'); // Para mensajes informativos generales
            playSound(soundType || 'click', 'A4');
        }
    }
    messageBoxEl.classList.add('show');
    setTimeout(() => {
        messageBoxEl.classList.remove('show');
    }, duration);
}

function resetClientContext() {
    clientContext = {
        ...clientContext, // Mantener soundMuted
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
        playerPressBtn.classList.remove('pressed'); // Quitar clase 'pressed'
        playerPressBtn.classList.add('btn-player-press'); // Asegurar clase base
    }
    if (playerGameCodeEl) playerGameCodeEl.value = '';
    if (playerNameEl) playerNameEl.value = '';
    if (playerRoundEndRankingSectionEl) playerRoundEndRankingSectionEl.classList.add('hidden');
    if (playerRoundEndRankingListEl) playerRoundEndRankingListEl.innerHTML = '<li class="text-gray-400 italic">El ranking aparecerá al final de la ronda.</li>';
}


// --- Lógica de Administrador ---
if (adminAccessBtn) {
    adminAccessBtn.addEventListener('click', () => {
        playSound('click');
        if (socket.connected) {
            showScreen('adminLogin');
        } else {
            showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
        }
    });
}

if (loginAdminBtn) {
    loginAdminBtn.addEventListener('click', () => {
        playSound('click', 'E5');
        const user = adminUserEl.value;
        const pass = adminPassEl.value;
        if (user === 'admin' && pass === 'password') {
            clientContext.adminName = user;
            if (adminNameDisplayEl) adminNameDisplayEl.textContent = clientContext.adminName;
            showScreen('adminPanel');
            showMessage('Login de administrador exitoso.', 2000, false, 'gameNotification');
            resetAdminUI(); 
            if(createGameBtn) createGameBtn.disabled = !socket.connected;
        } else {
            showMessage('Credenciales incorrectas.', 3000, true);
        }
    });
}

if (createGameBtn) {
    createGameBtn.addEventListener('click', () => {
        playSound('click', 'C5');
        if (socket.connected) {
            socket.emit('adminCreateGame', { adminName: clientContext.adminName });
        } else {
            showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
        }
    });
}

if (startRoundBtn) {
    startRoundBtn.addEventListener('click', () => {
        // El sonido de inicio de ronda se reproducirá para todos con el evento 'roundStarted'
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
        playSound('click', 'A3');
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
    playSound('click');
    showMessage('Cerrando sesión de administrador...', 2000);
    resetClientContext();
    resetAdminUI();
    if(adminUserEl) adminUserEl.value = 'admin';
    if(adminPassEl) adminPassEl.value = 'password';
    showScreen('home');
}

function updateAdminPlayersAndRanking(playersList = [], currentGameState = null) {
    // ... (sin cambios en la lógica interna, solo asegurarse que los IDs son correctos)
    if (connectedPlayersListAdminEl) {
        connectedPlayersListAdminEl.innerHTML = '';
        if (playersList.length === 0) {
            connectedPlayersListAdminEl.innerHTML = '<li class="text-gray-500">Esperando jugadores...</li>';
        } else {
            playersList.forEach(player => {
                const li = document.createElement('li');
                li.className = "flex justify-between items-center";
                li.innerHTML = `<span><i class="fas fa-user mr-2 text-poli-green"></i>${player.name}</span> <span class="text-sm text-poli-gray">(Puntos: ${player.score})</span>`;
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
                    <span class="font-bold text-poli-orange">${player.score} pts</span>
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
    // ... (sin cambios en la lógica interna, solo asegurarse que los IDs son correctos)
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
    btnSumar.className = 'btn btn-poli-green flex-1'; // Usar color Poli
    btnSumar.innerHTML = `<i class="fas fa-plus mr-1"></i>Sumar Punto a ${firstPress.playerName}`;
    btnSumar.onclick = () => {
        playSound('click', 'G4');
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
        btnVerSiguiente.className = 'btn btn-poli-gray flex-1'; // Usar color Poli
        btnVerSiguiente.innerHTML = `<i class="fas fa-forward mr-1"></i>No Sumar / Ver Siguiente`;
        btnVerSiguiente.onclick = () => {
            playSound('click');
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
    btnSaltar.className = 'btn btn-poli-red flex-1'; // Usar color Poli
    btnSaltar.innerHTML = `<i class="fas fa-ban mr-1"></i>Saltar Ronda Completa`;
    btnSaltar.onclick = () => {
        playSound('click', 'C4');
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
        playSound('click');
        if (socket.connected) {
            showScreen('playerJoin');
        } else {
            showMessage('No estás conectado al servidor. Intenta recargar.', 3000, true);
        }
    });
}

if (submitJoinGameBtn) {
    submitJoinGameBtn.addEventListener('click', () => {
        playSound('click', 'E5');
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
        // El sonido de 'playerPress' se reproduce aquí porque es una acción directa del jugador
        playSound('playerPress'); 
        if (playerPressBtn.disabled) return;

        playerPressBtn.disabled = true;
        playerPressBtn.innerHTML = '<i class="fas fa-check mr-2"></i>¡PRESIONADO!';
        playerPressBtn.classList.add('pressed'); // Añadir clase para cambio de color
        
        if(playerFeedbackEl) playerFeedbackEl.textContent = '¡Presionaste! Esperando resultados...';

        if (socket.connected) {
            socket.emit('playerPressedButton', { gameCode: clientContext.gameCode, pressedTime: Date.now() });
        }
    });
}

function updatePlayerWaitingRoomUI(playersList = []) {
    // ... (sin cambios en la lógica interna, solo asegurarse que los IDs son correctos)
    if(connectedPlayersListPlayerEl) {
        connectedPlayersListPlayerEl.innerHTML = '';
        if (playersList.length === 0) {
            connectedPlayersListPlayerEl.innerHTML = '<li class="text-gray-500">Aún no hay jugadores.</li>';
        } else {
            playersList.forEach(player => {
                const li = document.createElement('li');
                li.className = "text-poli-gray"; // Usar color Poli
                li.textContent = player.name + (player.id === clientContext.playerId ? " (Tú)" : "");
                connectedPlayersListPlayerEl.appendChild(li);
            });
        }
    }
}

function updatePlayerScoreUI(playersList = []) {
    // ... (sin cambios en la lógica interna, solo asegurarse que los IDs son correctos)
    const me = playersList.find(p => p.id === clientContext.playerId);
    if (me) {
        if(playerCurrentScoreEl) playerCurrentScoreEl.textContent = `${me.score} puntos`;
        if(currentPlayerNameDisplayEl) currentPlayerNameDisplayEl.textContent = me.name;
    } else {
        if(playerCurrentScoreEl) playerCurrentScoreEl.textContent = `0 puntos`;
        if(currentPlayerNameDisplayEl) currentPlayerNameDisplayEl.textContent = clientContext.playerName || "Jugador";
    }
}

function displayPlayerRoundEndRanking(ranking = []) {
    if (!playerRoundEndRankingListEl || !playerRoundEndRankingSectionEl) return;

    playerRoundEndRankingListEl.innerHTML = '';
    if (ranking.length === 0) {
        playerRoundEndRankingListEl.innerHTML = '<li class="text-gray-500 italic">No hay datos de ranking disponibles.</li>';
    } else {
        ranking.forEach((player, index) => {
            const li = document.createElement('li');
            // Aplicar clase 'highlight-player' si es el jugador actual
            li.className = `player-ranking-item p-2 rounded ${player.id === clientContext.playerId ? 'highlight-player' : 'bg-white'}`;
            li.innerHTML = `
                <span class="w-6 text-center">${index + 1}.</span>
                <span class="flex-grow ml-2 truncate">${player.name}</span>
                <span class="font-bold text-poli-orange">${player.score} pts</span>
            `;
            playerRoundEndRankingListEl.appendChild(li);
        });
    }
    playerRoundEndRankingSectionEl.classList.remove('hidden');
}


function playerLeaveGame() {
    playSound('click', 'C4');
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
    showMessage('Conectado al servidor.', 1500, false, 'gameNotification');

    if(adminAccessBtn) adminAccessBtn.disabled = false;
    if(joinGameBtn) joinGameBtn.disabled = false;

    if (screens.adminLogin && screens.adminLogin.classList.contains('active') && loginAdminBtn) {
        loginAdminBtn.disabled = false;
    }
    if (screens.playerJoin && screens.playerJoin.classList.contains('active') && submitJoinGameBtn) {
        submitJoinGameBtn.disabled = false;
    }
    if (screens.adminPanel && screens.adminPanel.classList.contains('active') && createGameBtn) {
        createGameBtn.disabled = !!clientContext.gameCode;
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
    showMessage(`Nueva partida creada. Código: ${data.gameCode}`, 5000, false, 'gameNotification');
    playSound('roundEndWin', 'C5'); // Sonido de éxito al crear partida
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
        // No reproducir sonido aquí, ya que el admin solo ve la notificación.
        // showMessage(`${data.pressedBy.playerName} ha presionado.`); // Mensaje podría ser redundante
        displayAdminRoundActionUI(data.allPressesThisRound);
    }
});

socket.on('adminNextPlayerToJudge', (data) => {
    if (clientContext.isGameAdmin) {
        if (data.remainingPresses && data.remainingPresses.length > 0) {
            showMessage(`Mostrando siguiente jugador: ${data.remainingPresses[0].playerName}`, 2000, false, 'click');
            displayAdminRoundActionUI(data.remainingPresses);
        } else {
            showMessage('No hay más jugadores que hayan presionado en esta ronda.', 2000, false, 'roundEndLose');
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
    showMessage(data.message, 3000, false, 'gameNotification');
    playSound('roundEndWin', 'E5'); // Sonido de éxito al unirse
});

socket.on('joinError', (data) => {
    showMessage(data.message, 4000, true);
    clientContext.playerName = null;
});

socket.on('roundStarted', () => {
    playSound('roundStart');
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
            playerPressBtn.classList.remove('pressed'); // Quitar clase 'pressed'
        }
        if(playerFeedbackEl) playerFeedbackEl.textContent = '';
        if (playerRoundEndRankingSectionEl) playerRoundEndRankingSectionEl.classList.add('hidden');
    }
});

socket.on('roundEnded', (data) => { // data: { message, ranking, playerRewarded }
    if (data.playerRewarded && data.playerRewarded.id === clientContext.playerId) {
        playSound('roundEndWin', 'G5'); // Sonido de ganar la ronda para el jugador que ganó
    } else if (data.playerRewarded) {
        playSound('roundEndLose', null); // Sonido diferente si otro ganó
    } else {
        playSound('roundEndLose', null); // Sonido si nadie ganó o ronda saltada
    }
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
            playerPressBtn.classList.remove('pressed');
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
        }, 7000); // Aumentado tiempo para ver ranking
    }
});

socket.on('gameEnded', (data) => {
    playSound('roundEndWin', 'A5'); // Sonido de fin de juego
    showMessage(data.message + (data.finalRanking ? " Ranking Final:" : ""), 5000);
    if (data.finalRanking) {
        console.log("Ranking Final:", data.finalRanking);
        if (clientContext.playerId && playerRoundEndRankingSectionEl) {
            const finalRankingTitle = document.querySelector('#playerRoundEndRankingSection h3');
            if(finalRankingTitle) finalRankingTitle.textContent = "Ranking Final de la Partida";
            displayPlayerRoundEndRanking(data.finalRanking);
            if (screens.playerGame) showScreen('playerGame');
        }
    }

    const delayReset = (data.finalRanking && clientContext.playerId) ? 8000 : 0;

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
    // Inicializar sonidos después de que el DOM esté cargado.
    // Idealmente, la primera interacción del usuario con la página (ej. un clic)
    // debería llamar a Tone.start() si aún no se ha iniciado.
    initializeSounds(); 

    if (muteSoundBtn && muteSoundBtnTextEl) {
        muteSoundBtn.addEventListener('click', () => {
            if (Tone.context.state !== 'running') {
                Tone.start().then(() => { // Intenta iniciar Tone.js si no lo está
                    toggleMuteState();
                });
            } else {
                toggleMuteState();
            }
        });
    }

    function toggleMuteState() {
        clientContext.soundMuted = !clientContext.soundMuted;
        if (clientContext.soundMuted) {
            masterVolume.mute = true;
            muteSoundBtnTextEl.textContent = "Activar Sonidos";
            if(muteSoundBtn.querySelector('i')) muteSoundBtn.querySelector('i').className = 'fas fa-volume-up mr-2';
            showMessage("Sonidos silenciados.", 1500);
        } else {
            masterVolume.mute = false;
            muteSoundBtnTextEl.textContent = "Silenciar Sonidos";
            if(muteSoundBtn.querySelector('i')) muteSoundBtn.querySelector('i').className = 'fas fa-volume-mute mr-2';
            showMessage("Sonidos activados.", 1500);
            playSound('click'); // Sonido de prueba al activar
        }
    }
    
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
