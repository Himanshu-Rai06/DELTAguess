document.addEventListener('DOMContentLoaded', () => {
    const state = {
        target: 0,
        attempts: 0,
        maxRange: 100,
        highScores: JSON.parse(localStorage.getItem('guessLeaderboard')) || { easy: 0, medium: 0, hard: 0 },
        timeLeft: 60,
        timerId: null,
        isPlaying: false,
        settings: {
            volume: parseFloat(localStorage.getItem('guessVolume')) || 0.5,
            theme: localStorage.getItem('guessTheme') || 'sage-green',
            difficulty: 'medium'
        },
        audioInitialized: false
    };

    const ui = {
        body: document.body,
        card: document.querySelector('.glass-card'),
        // Views
        startScreen: document.getElementById('startScreen'),
        gameScreen: document.getElementById('gameScreen'),
        settingsPanel: document.getElementById('settingsPanel'),
        overlay: document.getElementById('overlay'),
        // Header Groups
        lobbyUI: document.getElementById('lobbyUI'),
        gameUI: document.getElementById('gameUI'),
        // Controls
        startGameBtn: document.getElementById('startGameBtn'),
        actionBtn: document.getElementById('actionBtn'),
        restartBtn: document.getElementById('restartBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        clearHSBtn: document.getElementById('clearHSBtn'),
        diffSelect: document.getElementById('diffSelect'),
        input: document.getElementById('guessInput'),
        volumeSlider: document.getElementById('volumeSlider'),
        volIcon: document.getElementById('volIcon'),
        // Display
        status: document.getElementById('statusMessage'),
        hint: document.getElementById('hintMessage'),
        timer: document.getElementById('timerDisplay'),
        rangeBar: document.getElementById('rangeBar'),
        attempts: document.getElementById('attemptsVal'),
        highScore: document.getElementById('highScoreVal'),
        overlayTitle: document.getElementById('overlayTitle'),
        overlaySub: document.getElementById('overlaySubtitle'),
        themeDots: document.querySelectorAll('.theme-dot')
    };

    const sounds = {
        bg: document.getElementById('snd-bg'),
        start: document.getElementById('snd-start'),
        clear: document.getElementById('snd-clear'),
        lose: document.getElementById('snd-lose'),
        error: document.getElementById('snd-error')
    };

    function init() {
        applyTheme(state.settings.theme);
        setVolume(state.settings.volume);
        updateHSDisplay();
        setupEventListeners();
        
        ui.diffSelect.value = state.settings.difficulty;
        ui.volumeSlider.value = state.settings.volume;
        
        // Ensure correct initial header state
        ui.lobbyUI.classList.remove('hidden');
        ui.gameUI.classList.add('hidden');
        
        document.addEventListener('click', initializeAudioContext, { once: true });
    }

    function initializeAudioContext() {
        if (state.audioInitialized) return;
        state.audioInitialized = true;
        if (state.settings.volume > 0) {
            sounds.bg.play().catch(e => console.log("Audio play prevented:", e));
        }
    }

    function startGame() {
        state.settings.difficulty = ui.diffSelect.value;
        setGameParameters();
        
        state.target = Math.floor(Math.random() * state.maxRange) + 1;
        state.attempts = 0;
        state.isPlaying = true;

        // View Swap
        ui.startScreen.classList.remove('active');
        ui.startScreen.classList.add('hidden');
        ui.gameScreen.classList.remove('hidden');
        ui.gameScreen.classList.add('active');
        
        // Header Swap: Hide Trash, Show Timer
        ui.lobbyUI.classList.add('hidden');
        ui.gameUI.classList.remove('hidden');

        // Reset Board
        ui.input.value = '';
        ui.input.placeholder = `1 - ${state.maxRange}`;
        ui.attempts.textContent = '0';
        ui.status.textContent = "GUESS";
        ui.hint.textContent = `Range: 1 to ${state.maxRange}`;
        ui.rangeBar.style.width = '0%';
        ui.input.focus();

        playSound('start');
        startTimer();
    }

    function showLobby() {
        clearInterval(state.timerId);
        state.isPlaying = false;
        
        ui.overlay.classList.add('hidden');
        ui.gameScreen.classList.remove('active');
        ui.gameScreen.classList.add('hidden');
        ui.startScreen.classList.remove('hidden');
        ui.startScreen.classList.add('active');

        // Header Swap: Show Trash, Hide Timer
        ui.gameUI.classList.add('hidden');
        ui.lobbyUI.classList.remove('hidden');

        updateHSDisplay();
    }

    function setGameParameters() {
        switch(state.settings.difficulty) {
            case 'easy': state.maxRange = 50; state.timeLeft = 45; break;
            case 'medium': state.maxRange = 100; state.timeLeft = 60; break;
            case 'hard': state.maxRange = 500; state.timeLeft = 75; break;
        }
    }

    function handleGuess() {
        if (!state.isPlaying) return;
        let val = parseInt(ui.input.value);

        if (isNaN(val) || val < 1 || val > state.maxRange) {
            ui.hint.textContent = `Keep it between 1 - ${state.maxRange}!`;
            shakeCard();
            return;
        }

        state.attempts++;
        ui.attempts.textContent = state.attempts;

        if (val === state.target) {
            gameWin();
        } else {
            playSound('error');
            giveFeedback(val);
            ui.input.value = '';
            ui.input.focus();
        }
    }

    function giveFeedback(val) {
        shakeCard();
        const diff = Math.abs(state.target - val);
        const rangePercent = diff / state.maxRange; 
        
        let color = rangePercent < 0.1 ? '#ff4757' : (rangePercent < 0.25 ? '#ffa502' : '#4f46e5');
        ui.rangeBar.style.backgroundColor = color;
        ui.rangeBar.style.width = Math.max(5, (1 - rangePercent) * 100) + "%";

        ui.status.textContent = val > state.target ? "TOO HIGH" : "TOO LOW";
        ui.hint.textContent = `Try a ${val > state.target ? 'lower' : 'higher'} number`;
    }

    function startTimer() {
        clearInterval(state.timerId);
        ui.timer.textContent = state.timeLeft + "s";
        ui.timer.classList.remove('urgent');
        
        state.timerId = setInterval(() => {
            state.timeLeft--;
            ui.timer.textContent = state.timeLeft + "s";

            if (state.timeLeft <= 10) ui.timer.classList.add('urgent');
            if (state.timeLeft <= 0) gameOver();
        }, 1000);
    }

    function gameWin() {
        endGame(true);
        const diff = state.settings.difficulty;
        
        if (state.highScores[diff] === 0 || state.attempts < state.highScores[diff]) {
            state.highScores[diff] = state.attempts;
            localStorage.setItem('guessLeaderboard', JSON.stringify(state.highScores));
            ui.overlaySub.textContent = `New ${diff.toUpperCase()} High Score!`;
        } else {
            ui.overlaySub.textContent = `Found ${state.target} in ${state.attempts} attempts.`;
        }
        ui.overlayTitle.textContent = "VICTORY";
        playSound('clear');
    }

    function gameOver() {
        endGame(false);
        ui.overlayTitle.textContent = "TIME'S UP";
        ui.overlaySub.textContent = `The number was ${state.target}`;
        playSound('lose');
    }

    function endGame(isWin) {
        clearInterval(state.timerId);
        state.isPlaying = false;
        ui.overlay.classList.remove('hidden');
    }

    function setVolume(val) {
        state.settings.volume = val;
        localStorage.setItem('guessVolume', val);
        Object.values(sounds).forEach(s => s.volume = val);
        
        if (val == 0) ui.volIcon.textContent = '🔇';
        else if (val < 0.5) ui.volIcon.textContent = '🔉';
        else ui.volIcon.textContent = '🔊';

        if (val > 0 && state.audioInitialized && sounds.bg.paused) {
            sounds.bg.play().catch(() => {});
        } else if (val == 0) {
            sounds.bg.pause();
        }
    }

    function applyTheme(themeName) {
        ui.body.setAttribute('data-theme', themeName);
        localStorage.setItem('guessTheme', themeName);
        
        ui.themeDots.forEach(dot => {
            dot.classList.remove('active');
            if(dot.dataset.setTheme === themeName) dot.classList.add('active');
        });

        updateBackgroundMusic(themeName);
    }

    function updateBackgroundMusic(theme) {
        const musicMap = {
            'pastel-blue': "blueAudio.mp3",
            'sage-green': "greenAudio.mp3",
            'grey-white': "oysterAudio.mp3",
            'pastel-pink': "pinkAudio.mp3",
            'dark': "darkAudio.mp3"
        };
        
        const newSrc = musicMap[theme];
        if (sounds.bg.getAttribute('src') !== newSrc) {
            sounds.bg.src = newSrc;
            if (state.settings.volume > 0 && state.audioInitialized) {
                sounds.bg.play().catch(() => {});
            }
        }
    }

    function setupEventListeners() {
        ui.startGameBtn.addEventListener('click', startGame);
        ui.actionBtn.addEventListener('click', handleGuess);
        ui.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGuess(); });
        ui.restartBtn.addEventListener('click', showLobby);

        ui.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ui.settingsPanel.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!ui.settingsPanel.contains(e.target) && !ui.settingsBtn.contains(e.target)) {
                ui.settingsPanel.classList.add('hidden');
            }
        });

        ui.volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));

        ui.themeDots.forEach(dot => {
            dot.addEventListener('click', () => applyTheme(dot.dataset.setTheme));
        });

        ui.diffSelect.addEventListener('change', updateHSDisplay);

        ui.clearHSBtn.addEventListener('click', () => {
            const diff = ui.diffSelect.value;
            if (confirm(`Reset ${diff} high score?`)) {
                state.highScores[diff] = 0;
                localStorage.setItem('guessLeaderboard', JSON.stringify(state.highScores));
                updateHSDisplay();
            }
        });
    }

    function playSound(type) {
        if (state.settings.volume > 0) {
            const s = sounds[type];
            s.currentTime = 0;
            s.play().catch(() => {});
        }
    }

    function updateHSDisplay() {
        const diff = ui.diffSelect.value;
        const score = state.highScores[diff];
        ui.highScore.textContent = score === 0 ? '--' : score;
    }

    function shakeCard() {
        ui.card.classList.add('shake');
        setTimeout(() => ui.card.classList.remove('shake'), 300);
    }

    init();
});