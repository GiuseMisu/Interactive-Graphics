import * as THREE from 'three';
import { Barrel } from '../modules/Barrel.js';
import { Shuriken } from '../modules/Shuriken.js';
import { TrapDoorSpawner } from '../modules/TrapDoorSpawner.js';
import { RegularPlatform } from './platforms/RegularPlatform.js';
import { CheckpointPlatform } from './platforms/CheckpointPlatform.js';
import { GoalPlatform } from './platforms/GoalPlatform.js';
import { TimedPlatform } from './platforms/TimedPlatform.js';
import { MapTools } from './MapTools.js';

export class Map2 {
    constructor(scene, gameState = null, assetManager = null) {
        this.scene = scene;
        this.gameState = gameState;
        this.assetManager = assetManager;
        //this.shadowManager = gameState ? gameState.shadowManager : null;
        this.platforms = [];
        this.barrels = [];
        this.shurikens = [];
        this.trapDoorSpawners = []; 
        this.checkpointPlatforms = new Map();
        this.timedPlatforms = new Map();
        this.activeTimedPlatform = null;
        this.disappearedPlatforms = new Map();
        this.createMap();
    }

    createMap() {
        // U-shaped platform layout 
        const baseY = 0.0;
        const platformSpacing = 12; // spacing
        
        // STARTING PLATFORM 
        this.addPlatform(0, baseY, 0, 12, 10, false, 'Starting Platform');
        
        this.addPlatform(0, baseY, -12, 8, 6, false, 'Timed Platform 1', false, true);
        this.addPlatform(0, baseY, -24, 6, 6, false, 'Platform 2');
        this.addPlatform(0, baseY, -36, 8, 6, false, 'Shuriken Platform 1');
        this.createShuriken(3); 
        this.addPlatform(0, baseY, -48, 6, 6, false, 'Platform 4');
        
        // CHECKPOINT
        this.addPlatform(0, baseY, -60, 8, 8, true, 'Checkpoint Platform 1');
        
        this.addPlatform(18, baseY, -72, 28, 4, false, 'Platform 7');
        this.addPlatform(36, baseY, -72, 8, 6, false, 'Barrel Platform 1');
        this.createTrapDoorSpawner(36, baseY, -72);
        
        this.addPlatform(48, baseY, -72, 6, 6, false, 'Turn Platform 1', false, true);
        this.addPlatform(60, baseY, -72, 6, 6, false, 'Turn Platform 2', false, true);
        this.addPlatform(72, baseY, -72, 6, 6, false, 'Turn Platform 3', false, true);
        this.addPlatform(84, baseY, -72, 6, 6, false, 'Turn Platform 4');
        
        this.addPlatform(108, baseY, -72, 36, 40, false, 'Goal Platform', true, false);
    }

    createTrapDoorSpawner(x, y, z) {
        const spawnerY = y + 0.25; // Platform surface
        
        // callback function to handle barrel spawning
        const barrelSpawnCallback = (barrel) => {
            this.barrels.push(barrel);
        };
        
        const orientation = 'west';
        const frequency_barrel_spawn = 0.25; // 3.0 is the Default frequency
        const bounciness = 0.9;
        const friction = 0.3;

        const spawner = new TrapDoorSpawner(this.scene, x, spawnerY, z, this.gameState, barrelSpawnCallback, orientation, frequency_barrel_spawn, bounciness, friction); 
        this.trapDoorSpawners.push(spawner);
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

    createShuriken(platformIndex) {
        //MapTools.createShuriken(this.scene, this.platforms, this.shurikens, this.shadowManager, platformIndex);
        MapTools.createShuriken(this.scene, this.platforms, this.shurikens, platformIndex);
    }

    update(deltaTime, player = null) {
        // Update all trap door spawners
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

    clear() {
        // Remove all platforms from the scene
        MapTools.clearPlatforms(this.platforms);
        
        // Remove all barrels from the scene
        MapTools.clearBarrels(this.scene, this.barrels);
        
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

    getBarrels() {
        return MapTools.getBarrels(this.barrels);
    }
    
    getCheckpointPlatforms() {
        return MapTools.getCheckpointPlatforms(this.checkpointPlatforms);
    }

    resetAllTimedPlatforms() {
        this.activeTimedPlatform = MapTools.resetAllTimedPlatforms(this.timedPlatforms);
    }
}
