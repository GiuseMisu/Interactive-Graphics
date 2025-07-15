import { GameState } from './modules/GameState.js';
import { MapManager } from './Maps/MapManager.js';
import { UI } from './modules/UI.js';

export class Game {
    constructor(scene, player, assetManager, gameState = null) {
        this.scene = scene;
        this.player = player;
        this.assetManager = assetManager;
        this.gameState = gameState || new GameState(); // Use provided gameState or create new one
        this.mapManager = new MapManager(this.gameState, assetManager); // Pass asset manager
        this.startGameCallback = null;
        
        // Initialize map manager with scene and player
        this.mapManager.initialize(this.scene, this.player);
        
        // Set up platform manager for player collision detection
        this.player.setPlatformManager(this.mapManager);
        
        // Set up game state for player checkpoint system
        this.player.setGameState(this.gameState);
        
        // Setup game UI
        this.ui = new UI(this.mapManager);
        
        // Connect UI to player for death counter
        this.player.setGameUI(this.ui);
        
        // Set player in game state
        this.gameState.setPlayer(player);
    }

    setStartGameCallback(callback) {
        this.startGameCallback = callback;
        if (this.ui) {
            this.ui.setStartGameCallback(callback);
        }
    }
    
    setReturnToMenuCallback(callback) {
        if (this.ui) {
            this.ui.setReturnToMenuCallback(callback);
        }
    }
    
    update(deltaTime) {
        // Update game logic here
        this.mapManager.update(deltaTime);
    }
    
    reset() {
        // Reset death counter when returning to map selection
        this.ui.resetDeathCounter();
        
        // Hide level complete screen if showing
        this.ui.hideLevelCompleteScreen();
        
        // Reset game state
        this.gameState.resetCheckpoints();
        
        // Reset UI elements
        this.ui.hideGameUI();
        
        // Clear any death messages
        const deathMessage = document.getElementById('deathMessage');
        if (deathMessage) {
            deathMessage.style.display = 'none';
        }
    }
}