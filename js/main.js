import { StartupSequence } from './components/StartupSequence.js';
import { VitalSystems } from './components/VitalSystems.js';
import { GameState } from './components/GameState.js';
import { EventManager } from './components/EventManager.js';
import { ASCIIVideo } from './components/ASCIIVideo.js';
import { InputHandler } from './components/InputHandler.js';
import { AudioSystem } from './components/AudioSystem.js';

class BodyControlGame {
    constructor() {
        this.gameState = new GameState();
        this.startupSequence = new StartupSequence();
        this.vitalSystems = new VitalSystems(this.gameState);
        this.asciiVideo = new ASCIIVideo();
        this.audioSystem = new AudioSystem();
        this.eventManager = new EventManager(this.gameState, this.asciiVideo);
        this.inputHandler = new InputHandler(this.gameState, this.vitalSystems, this.eventManager, this.audioSystem);
        
        this.isRunning = false;
        this.lastTime = 0;
    }

    async init() {
        console.log('🤖 Initializing Body Control Interface...');
        
        await this.startupSequence.run();
        
        // Connect audio system to game state
        this.gameState.audioSystem = this.audioSystem;
        
        this.vitalSystems.init();
        this.inputHandler.init();
        this.asciiVideo.init();
        
        this.showMainInterface();
        this.startGameLoop();
        
        console.log('✅ Body Control Interface Online');
    }

    showMainInterface() {
        document.getElementById('startup-sequence').classList.add('hidden');
        document.getElementById('main-interface').classList.remove('hidden');
        
        // Reset stats to good ranges when interface becomes visible (only for enabled systems)
        if (this.gameState.vitals.oxygen.enabled) {
            this.gameState.vitals.oxygen.current = 75;
        }
        this.gameState.vitals.heartRate.current = 50; // Always enabled at start
        if (this.gameState.vitals.eyes.enabled) {
            this.gameState.vitals.eyes.moisture = 100;
        }
        this.gameState.suspicion.current = 0;
        
        // Start the actual game timer now that interface is visible
        console.log('🎮 Starting main game interface and timer...');
        this.gameState.startGame();
        
        // Debug: Log initial vital states
        console.log('Initial vitals:', {
            oxygen: this.gameState.vitals.oxygen.enabled,
            heart: this.gameState.vitals.heartRate.enabled,
            eyes: this.gameState.vitals.eyes.enabled
        });
    }

    startGameLoop() {
        this.isRunning = true;
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.gameState.update(deltaTime);
        this.vitalSystems.update(deltaTime);
        this.eventManager.update(deltaTime);
        this.asciiVideo.update(deltaTime);

        requestAnimationFrame(this.gameLoop);
    }

    stop() {
        this.isRunning = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const game = new BodyControlGame();
    await game.init();
    
    window.bodyControlGame = game;
});