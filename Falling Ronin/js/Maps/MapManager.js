import { Map1 } from './Map1.js';
import { Map2 } from './Map2.js';

export class MapManager {
    constructor(gameState, assetManager) {
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.scene = null;
        this.player = null;
        this.currentMap = null;
    }

    initialize(scene, player) {
        this.scene = scene;
        this.player = player;
    }

    //function called inside the loadMap of UI after the button is pressed
    loadMap(mapName) {
        // Clear the current map if it exists
        if (this.currentMap) {
            this.currentMap.clear();
        }

        // Hide the UI
        const selectionScreen = document.getElementById('mapSelectionScreen');   
        if (selectionScreen) {
            selectionScreen.style.display = 'none';
        }
        // Reset player position with proper feet positioning
        if (this.player && this.player.model) {
            this.player.respawnPlayer();
        }       
        
        // Load the selected map
        switch (mapName) {
            case 'Map1':
                this.currentMap = new Map1(this.scene, this.gameState, this.assetManager);
                break;
            case 'Map2':
                this.currentMap = new Map2(this.scene, this.gameState, this.assetManager);
                break;
            default:
                console.error('Map not found:', mapName);
                return;
        }
        
        // Set the platform manager for the player
        if (this.player && this.currentMap) {
            this.player.setPlatformManager(this.currentMap);
        }
    }

    // Method to get all platforms from the current map
    getAllPlatforms() {
        if (this.currentMap) {
            return this.currentMap.getAllPlatforms();
        }
        return [];
    }

    // Method to reset all timed platforms in the current map
    resetAllTimedPlatforms() {
        if (this.currentMap && this.currentMap.resetAllTimedPlatforms) {
            this.currentMap.resetAllTimedPlatforms();
        }
    }

    // chiamato a sua volta da game.update() chiaato a sua volta da main.js in main loop animate()
    update(deltaTime) {
        // Update the current map, by calling its specific update method
        if (this.currentMap) {
            this.currentMap.updateCurrentMap(deltaTime, this.player);
        }
    }

    clearCurrentMap() {
        // Clear the current map and remove all its objects from the scene
        if (this.currentMap) {
            this.currentMap.clear();
            this.currentMap = null;
        }
        
        // Clear platform manager reference from player
        if (this.player) {
            this.player.setPlatformManager(null);
        }
    }
    
    returnToMenu() {
        // Clear current map
        this.clearCurrentMap();
        
        // Reset game state
        if (this.gameState) {
            this.gameState.resetCheckpoints();
        }
        
        // Clear asset cache to prevent loading issues
        if (this.assetManager) {
            this.assetManager.clearCache();
        }
        
        // Show map selection screen
        const selectionScreen = document.getElementById('mapSelectionScreen');
        if (selectionScreen) {
            selectionScreen.style.display = 'flex';
        }
        
        // Reset player position
        if (this.player) {
            this.player.respawnPlayer();
        }
    }
}