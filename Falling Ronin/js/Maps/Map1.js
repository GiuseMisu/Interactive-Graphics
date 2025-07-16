import * as THREE from 'three';
import { Barrel } from '../modules/Barrel.js';
import { Shuriken } from '../modules/Shuriken.js';
import { TrapDoorSpawner } from '../modules/TrapDoorSpawner.js';
import { RegularPlatform } from './platforms/RegularPlatform.js';
import { CheckpointPlatform } from './platforms/CheckpointPlatform.js';
import { GoalPlatform } from './platforms/GoalPlatform.js';
import { TimedPlatform } from './platforms/TimedPlatform.js';
import { MapTools } from './MapTools.js';

export class Map1 {
    constructor(scene, gameState = null, assetManager = null) {
        this.scene = scene;
        this.gameState = gameState; // Reference to game state for checkpoint system
        this.assetManager = assetManager; // Reference to asset manager
        
        this.platforms = [];
        this.barrels = []; // Array to hold all barrels -> increased by using the barrelSpawnCallback
        this.shurikens = [];
        this.trapDoorSpawners = []; 
        this.checkpointPlatforms = new Map(); // Track which platforms are checkpoints
        this.timedPlatforms = new Map(); // Track timed disappearing platforms
        this.activeTimedPlatform = null; // Currently active timed platform
        this.disappearedPlatforms = new Map(); // Track disappeared platforms for restoration
        this.createMap();
    }    
    
    createMap() {
        // Starting platform
        this.addPlatform(0, 0, 0, 12, 8, false, 'Main Platform'); 
        
        // Spiral platforms - each at increasing height and rotating around center
        this.addPlatform(13, 1.7, 0, 6, 4, false, 'Platform 1'); 
        this.addPlatform(10, 3, 8, 5, 6, false, 'Timed Platform 2', false, true); //TIMED DISAPPEARING PLATFORM
        this.addPlatform(0, 4.5, 9, 7, 3, false, 'Platform 3');
        this.addPlatform(-14, 6, 9, 4, 5, false, 'Platform 4'); 
        this.addPlatform(-16, 7.5, -2, 8, 6, true, 'Platform 5 (Checkpoint)'); //CHECKPOINT

        this.addPlatform(1, 9.5, -10, 12, 6, false, 'Platform 6'); 
        this.createShuriken(6);

        this.addPlatform(11, 11, -6, 4, 6, false, 'Platform 7');
        this.addPlatform(10, 13.5, 1, 6, 4, false, 'Platform 8');
        this.addPlatform(0, 16, 7, 5, 5, false, 'Platform 9');
        this.addPlatform(-10, 18.5, 8, 12, 8, false, 'Platform 10');
        // (barrel spawn platform)
        this.createTrapDoorSpawner(-10, 18.5, 8);

        this.addPlatform(-11, 20.5, -3, 5, 6, false, 'Platform 11'); 
        this.addPlatform(-8, 23, -15, 7, 4, false, 'Platform 12'); 
        this.addPlatform(0, 25, -24, 7, 5, false, 'Platform 13'); 
        this.createShuriken(13);
        this.addPlatform(20, 27, -24, 22, 28, false, 'Platform 14 (GOAL)', true, false); // FINAL GOAL PLATFORM
    }

    addPlatform(x, y, z, width, depth, isCheckpoint = false, platformName = '', isGoal = false, isTimed = false) {
        return MapTools.addPlatform(
            this.scene, 
            this.platforms, 
            this.timedPlatforms, 
            this.checkpointPlatforms, 
            this.gameState, 
            this.assetManager, 
            x, y, z, width, depth, 
            isCheckpoint, platformName, isGoal, isTimed
        );
    }
    
    updateCurrentMap(deltaTime, player = null) {
        // Update all trap door spawners (support multiple for consistency)
        this.trapDoorSpawners.forEach(spawner => {
            spawner.update(deltaTime);
        });
        // Update all barrels - with dynamic platform collision
        MapTools.updateBarrels(this.scene, this.barrels, deltaTime, player, this.platforms);
        // Update all shurikens
        MapTools.updateShurikens(this.shurikens, deltaTime, player);
        // Update timed platforms
        MapTools.updateTimedPlatforms(this.timedPlatforms, deltaTime, player);
        // Check if player is on a timed platform
        if (player) {
            MapTools.checkTimedPlatformCollision(this.timedPlatforms, player);
        }
    }

    createShuriken(platformIndex) {
        MapTools.createShuriken(this.scene, this.platforms, this.shurikens, platformIndex);
    }
    
    createTrapDoorSpawner(x, y, z, orientation = 'east', frequency_barrel_spawn = 3.0, bounciness = 0.9, friction = 0.3) {
        // trap door spawner
        const spawnerY = y + 0.25; // Platform surface
        const barrelSpawnCallback = (barrel) => {
            this.barrels.push(barrel);
        };
        
        bounciness = 0.5;
        const spawner = new TrapDoorSpawner(
            this.scene, x, spawnerY, z, this.gameState, barrelSpawnCallback, orientation, frequency_barrel_spawn, bounciness, friction
        );
        this.trapDoorSpawners.push(spawner);
    }


    clear() {
        // Remove all platforms from the scene
        MapTools.clearPlatforms(this.platforms);
        // Remove all barrels from the scene
        MapTools.clearBarrels(this.scene, this.barrels); //array of barrels
        // Remove all shurikens from the scene
        MapTools.clearShurikens(this.shurikens);
        // Clean up all trap door spawners
        this.trapDoorSpawners.forEach(spawner => {
            spawner.destroy();
        });
        this.trapDoorSpawners = [];
        // Clear checkpoint and timed platforms
        const resetData = MapTools.clearSpecialPlatforms(this.checkpointPlatforms, this.timedPlatforms);
        this.activeTimedPlatform = resetData.activeTimedPlatform;
        this.disappearedPlatforms = resetData.disappearedPlatforms;
        // Reset checkpoint system in game state
        MapTools.resetGameState(this.gameState);
    }

    // Essential wrapper methods used by external files
    getAllPlatforms() {
        return MapTools.getAllPlatforms(this.platforms);
    }

    resetAllTimedPlatforms() {
        this.activeTimedPlatform = MapTools.resetAllTimedPlatforms(this.timedPlatforms);
    }
    
}