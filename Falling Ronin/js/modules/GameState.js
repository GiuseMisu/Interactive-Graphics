export class GameState {

    // It keeps track of the checkpoints status and the death count

    constructor() {
        this.player = null;
        this.gameOver = false;
        
        // Checkpoint system
        this.checkpoints = new Map(); // Map of platform ID to checkpoint data
        this.activeCheckpoint = null; // Currently active checkpoint
        this.hasCheckpoint = false; // Whether player has reached any checkpoint
        
        // Goal system
        this.goalPlatform = null; // Goal platform data
        this.levelCompleted = false; // Whether the level has been completed

        // Death count
        this.deathCount = 0; // Number of times the player has died
        
        // Shadow manager
        this.shadowManager = null;
    }
        
    setPlayer(player) {
        this.player = player;
    }
    
    //=========================== CHECKPOINTS  METHODS ===========================

    // Checkpoint methods, needed to manage checkpoints 
    //Function called from inside the checkpoint class constructor 
    addCheckpoint(platformId, position, platformName) {
        //bind checkpoint to platform
        this.checkpoints.set(platformId, {
            position: position,
            platformName: platformName, // Name of the platform 
            reached: false // Initially not reached, control if checkpoint has been activated or not
        });
    }
    
    activateCheckpoint(platformId) {
        // take the reference of the checkpoint from the platform (jointed before)
        const checkpoint = this.checkpoints.get(platformId); 
        // Check if the checkpoint exists and has not been reached yet
        if (checkpoint && !checkpoint.reached) {
            checkpoint.reached = true;
            this.activeCheckpoint = platformId;
            this.hasCheckpoint = true;
            console.log(`Checkpoint activated: ${checkpoint.platformName}`);
            return true; // New checkpoint reached, modify the state
        }
        return false; // Already reached or doesn't exist
    }
    
    getActiveCheckpointPosition() {
        // Return the position of the active checkpoint if it exists
        if (this.activeCheckpoint && this.checkpoints.has(this.activeCheckpoint)) {
            const pos = this.checkpoints.get(this.activeCheckpoint).position;
            return pos;
        }
        return null;
    }
    
    getActiveCheckpointName() {
        if (this.activeCheckpoint && this.checkpoints.has(this.activeCheckpoint)) {
            return this.checkpoints.get(this.activeCheckpoint).platformName;
        }
        return null;
    }
    
    resetCheckpoints() {
        // clear all checkpoints info when returning to menu
        this.checkpoints.clear();
        this.activeCheckpoint = null;
        this.hasCheckpoint = false;
        this.levelCompleted = false;
        this.deathCount = 0; // Reset death count when returning to menu
    }
    
    //=========================== GOAL PLATFORM  METHODS ===========================
    
    // Goal platform methods, needed to manage the goal platform
    // BIND goal TO platform so that the player can reach it and complete the level
    // function called inside the goal platform class constructor
    setGoalPlatform(platformId, position, platformName) {
        this.goalPlatform = {
            platformId: platformId,
            position: position,
            platformName: platformName
        };
    }
    
    completeLevel() {
        this.levelCompleted = true;
        console.log(`GameState: Level completed!`);
    }
    
    isLevelCompleted() {
        return this.levelCompleted;
    }
    
    getDeathCount() {
        return this.deathCount;
    }
    
    //============================================= SHADOW METHODS ============================================
    
    // Shadow management methods--> called inside the main file
    setShadowManager(shadowManager) {
        this.shadowManager = shadowManager;
        console.log('Shadow manager set in GameState');
    }
    
    getShadowManager() {
        return this.shadowManager;
    }
    
    setShadowMode(mode) {
        if (this.shadowManager) {
            this.shadowManager.setShadowMode(mode);
        }
    }
    
    getShadowMode() {
        return this.shadowManager ? this.shadowManager.getShadowMode() : 0;
    }
    
    getShadowModeString() {
        return this.shadowManager ? this.shadowManager.getShadowModeString() : 'No Shadows';
    }
}