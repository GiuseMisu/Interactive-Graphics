/* import * as THREE from 'three';
import { Barrel } from '../modules/Barrel.js';
import { Shuriken } from '../modules/Shuriken.js';
import { RegularPlatform } from './platforms/RegularPlatform.js';
import { CheckpointPlatform } from './platforms/CheckpointPlatform.js';
import { GoalPlatform } from './platforms/GoalPlatform.js';
import { TimedPlatform } from './platforms/TimedPlatform.js';
import { MapTools } from './MapTools.js';

export class Map2 {
    constructor(scene, gameState = null, assetManager = null) {
        this.scene = scene;
        this.gameState = gameState; // Reference to game state for checkpoint system
        this.assetManager = assetManager; // Reference to asset manager
        this.shadowManager = gameState ? gameState.shadowManager : null; // Get shadowManager from gameState
        this.platforms = [];
        this.barrels = [];
        this.shurikens = [];
        this.barrelSpawnTimer = 0;
        this.barrelSpawnInterval = 2.5; // Slightly faster spawn rate than Map1
        this.checkpointPlatforms = new Map(); // Track which platforms are checkpoints
        this.timedPlatforms = new Map(); // Track timed disappearing platforms
        this.activeTimedPlatform = null; // Currently active timed platform
        this.disappearedPlatforms = new Map(); // Track disappeared platforms for restoration
        this.createMap();
    }
    
    createMap() {
        // Create platforms for Map2 - Much larger spiral pattern than Map1
        // Following the same spiral pattern as Map1 but with closer platforms for double jump accessibility
        
        // Starting platform (bigger main ground level)
        this.addPlatform(0, 0, 0, 16, 10, false, 'Main Platform'); // Platform 0 - Starting area (bigger than Map1)
        
        // First spiral layer - Start spiral pattern going clockwise - closer spacing
        this.addPlatform(8, 1.5, 2, 6, 4, false, 'Platform 1'); // Platform 1 - East
        this.addPlatform(4, 3, 8, 7, 5, false, 'Platform 2'); // Platform 2 - Southeast
        this.addPlatform(-2, 4.5, 9, 6, 4, false, 'Platform 3'); // Platform 3 - South
        this.addPlatform(-7, 6, 5, 5, 5, false, 'Platform 4'); // Platform 4 - Southwest
        this.addPlatform(-9, 7.5, -1, 8, 6, false, 'Platform 5'); // Platform 5 - West - Regular platform
        this.addPlatform(-5, 9, -7, 6, 5, false, 'Platform 6'); // Platform 6 - Northwest
        this.addPlatform(2, 10.5, -9, 7, 4, false, 'Platform 7'); // Platform 7 - North
        this.addPlatform(8, 12, -5, 6, 6, false, 'Platform 8'); // Platform 8 - Northeast
        
        // Second spiral layer - Continue spiral pattern higher up - closer spacing
        this.addPlatform(10, 13.5, 1, 5, 5, false, 'Platform 9'); // Platform 9 - East (higher)
        this.addPlatform(5, 15, 9, 6, 5, false, 'Timed Platform 10', false, false, true); // Platform 10 - Southeast - TIMED PLATFORM 1
        this.addPlatform(-1, 16.5, 10, 7, 6, false, 'Platform 11'); // Platform 11 - South (higher)
        this.addPlatform(-8, 18, 6, 6, 4, false, 'Platform 12'); // Platform 12 - Southwest (higher)
        this.addPlatform(-10, 19.5, -1, 5, 7, false, 'Platform 13'); // Platform 13 - West (higher)
        this.addPlatform(-6, 21, -8, 8, 5, false, 'Platform 14'); // Platform 14 - Northwest (higher)
        this.addPlatform(1, 22.5, -10, 6, 6, false, 'Platform 15'); // Platform 15 - North (higher)
        this.addPlatform(9, 24, -6, 7, 4, false, 'Platform 16'); // Platform 16 - Northeast (higher)
        
        // Third spiral layer - Add complexity and hazards - closer spacing
        this.addPlatform(11, 25.5, 0, 6, 5, false, 'Platform 17'); // Platform 17 - East (highest)
        this.addPlatform(6, 27, 10, 7, 6, false, 'Timed Platform 18', false, false, true); // Platform 18 - Southeast - TIMED PLATFORM 2
        this.addPlatform(-1, 28.5, 11, 8, 5, false, 'Platform 19'); // Platform 19 - South (highest)
        this.addPlatform(-9, 30, 7, 6, 7, false, 'Platform 20'); // Platform 20 - Southwest (highest)
        this.addPlatform(-11, 31.5, -1, 7, 4, true, 'Platform 21 (Checkpoint 1)'); // Platform 21 - West - CHECKPOINT 1
        this.addPlatform(-7, 33, -9, 6, 6, false, 'Platform 22'); // Platform 22 - Northwest (highest)
        this.addPlatform(1, 34.5, -12, 9, 5, false, 'Platform 23'); // Platform 23 - North (highest) - BARREL SPAWN 1
        this.addPlatform(10, 36, -7, 5, 7, false, 'Platform 24'); // Platform 24 - Northeast (highest)
        
        // Fourth spiral layer - Shuriken platforms and more challenges - closer spacing
        this.addPlatform(12, 37.5, 0, 10, 8, false, 'Platform 25'); // Platform 25 - East - SHURIKEN PLATFORM 1
        this.createShuriken(25); // Add shurikens to Platform 25
        
        this.addPlatform(7, 39, 11, 6, 5, false, 'Timed Platform 26', false, false, true); // Platform 26 - Southeast - TIMED PLATFORM 3
        this.addPlatform(-2, 40.5, 12, 7, 6, false, 'Platform 27'); // Platform 27 - South - BARREL SPAWN 2
        this.addPlatform(-9, 42, 8, 8, 4, false, 'Platform 28'); // Platform 28 - Southwest
        this.addPlatform(-13, 43.5, -1, 6, 7, true, 'Platform 29 (Checkpoint 2)'); // Platform 29 - West - CHECKPOINT 2
        this.addPlatform(-8, 45, -10, 10, 8, false, 'Platform 30'); // Platform 30 - Northwest - SHURIKEN PLATFORM 2
        this.createShuriken(30); // Add shurikens to Platform 30
        
        this.addPlatform(2, 46.5, -13, 7, 5, false, 'Platform 31'); // Platform 31 - North - BARREL SPAWN 3
        this.addPlatform(11, 48, -8, 6, 6, false, 'Platform 32'); // Platform 32 - Northeast
        
        // Fifth spiral layer - Final challenging section - closer spacing
        this.addPlatform(13, 49.5, 1, 5, 8, false, 'Platform 33'); // Platform 33 - East
        this.addPlatform(8, 51, 12, 8, 6, false, 'Timed Platform 34', false, false, true); // Platform 34 - Southeast - TIMED PLATFORM 4
        this.addPlatform(-1, 52.5, 14, 6, 5, false, 'Platform 35'); // Platform 35 - South
        this.addPlatform(-10, 54, 9, 7, 7, false, 'Platform 36'); // Platform 36 - Southwest
        this.addPlatform(-14, 55.5, 0, 8, 4, true, 'Platform 37 (Checkpoint 3)'); // Platform 37 - West - CHECKPOINT 3
        this.addPlatform(-9, 57, -11, 6, 6, false, 'Platform 38'); // Platform 38 - Northwest
        this.addPlatform(3, 58.5, -14, 7, 5, false, 'Platform 39'); // Platform 39 - North
        this.addPlatform(12, 60, -9, 9, 7, false, 'Platform 40'); // Platform 40 - Northeast
        
        // Final spiral approach to goal - closer spacing
        this.addPlatform(15, 61.5, 1, 6, 6, false, 'Platform 41'); // Platform 41 - East (final approach)
        this.addPlatform(9, 63, 13, 8, 5, false, 'Platform 42'); // Platform 42 - Southeast
        this.addPlatform(-1, 64.5, 15, 7, 8, false, 'Platform 43'); // Platform 43 - South
        this.addPlatform(-11, 66, 10, 6, 6, false, 'Platform 44'); // Platform 44 - Southwest
        this.addPlatform(-16, 67.5, -1, 5, 7, false, 'Platform 45'); // Platform 45 - West
        this.addPlatform(-10, 69, -12, 8, 6, false, 'Platform 46'); // Platform 46 - Northwest
        this.addPlatform(4, 70.5, -16, 7, 5, false, 'Platform 47'); // Platform 47 - North
        this.addPlatform(13, 72, -10, 6, 8, false, 'Platform 48'); // Platform 48 - Northeast
        
        // Final goal platform at the center of the highest spiral
        this.addPlatform(0, 75, 0, 12, 10, false, 'Platform 49 (GOAL)', true); // Platform 49 - FINAL GOAL PLATFORM
    }

    addPlatform(x, y, z, width, depth, isCheckpoint = false, platformName = '', isGoal = false, isTimed = false) {
        return MapTools.addPlatform(this.scene, this.platforms, this.timedPlatforms, this.checkpointPlatforms, this.gameState, this.assetManager, x, y, z, width, depth, isCheckpoint, platformName, isGoal, isTimed);
    }

    spawnBarrel() {
        const barrel = new Barrel(this.scene);
        
        // Add randomness to make each barrel unique
        const randomSpeedMultiplier = 0.4 + Math.random() * 1.4; // Speed between 40% and 180%
        const randomDirectionVariation = (Math.random() - 0.5) * 1.2; // Z direction variation
        const randomHeightVariation = Math.random() * 1.5; // Height variation
        const randomSpawnOffset = (Math.random() - 0.5) * 2.0; // Spawn position variation
        
        // Choose random barrel spawn platform - Updated for new spiral layout
        // Platform 23 (North), Platform 27 (South), Platform 31 (North)
        const barrelSpawnPlatforms = [
            { id: 23, x: 2, y: 34.5, z: -17, width: 9, depth: 5 },  // Platform 23 - North (highest) - BARREL SPAWN 1
            { id: 27, x: -3, y: 40.5, z: 17, width: 7, depth: 6 },  // Platform 27 - South - BARREL SPAWN 2
            { id: 31, x: 3, y: 46.5, z: -18, width: 7, depth: 5 }   // Platform 31 - North - BARREL SPAWN 3
        ];
        
        const spawnPlatform = barrelSpawnPlatforms[Math.floor(Math.random() * barrelSpawnPlatforms.length)];
        const platformY = spawnPlatform.y + 0.25; // Platform surface
        const spawnX = spawnPlatform.x + randomSpawnOffset;
        const spawnY = platformY + 1 + randomHeightVariation;
        const spawnZ = spawnPlatform.z + (Math.random() - 0.5) * 3.0;
        
        // Position barrel at spawn point
        barrel.mesh.position.set(spawnX, spawnY, spawnZ);
        
        // Rotate barrel to be on its side with random rotation
        barrel.mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        barrel.mesh.rotation.y = (Math.random() - 0.5) * 0.6;
        barrel.mesh.rotation.z = (Math.random() - 0.5) * 0.8;
        
        // Set velocity to roll towards center/down following spiral path
        const baseSpeed = 4.0 * randomSpeedMultiplier;
        const randomYVelocity = (Math.random() - 0.3) * 2.0;
        const directionToCenter = new THREE.Vector3(-spawnX, 0, -spawnZ).normalize();
        barrel.velocity.set(
            directionToCenter.x * baseSpeed + randomDirectionVariation,
            randomYVelocity,
            directionToCenter.z * baseSpeed + randomDirectionVariation
        );
        
        // Add randomness to barrel physics properties
        barrel.bounciness = 0.5 + Math.random() * 0.35;
        barrel.friction = 0.75 + Math.random() * 0.15;

        // Random angular velocity for chaotic rolling
        barrel.angularVelocity.set(
            (Math.random() - 0.5) * 1.0,
            (Math.random() - 0.5) * 1.0,
            (Math.random() - 0.5) * 1.0
        );
        
        this.barrels.push(barrel);
    }
    
    createShuriken(platformIndex) {
        MapTools.createShuriken(this.scene, this.platforms, this.shurikens, this.shadowManager, platformIndex);
    }

    // Method to update shadow settings for all shurikens when shadow mode changes
    updateShurikenShadows() {
        MapTools.updateShurikenShadows(this.shurikens);
    }

    update(deltaTime, player = null) {
        // Update barrel spawn timer
        this.barrelSpawnTimer += deltaTime;
        if (this.barrelSpawnTimer >= this.barrelSpawnInterval) {
            this.spawnBarrel();
            this.barrelSpawnTimer = 0;
        }
        
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
        
        // Clear checkpoint and timed platforms
        const resetData = MapTools.clearSpecialPlatforms(this.checkpointPlatforms, this.timedPlatforms);
        this.activeTimedPlatform = resetData.activeTimedPlatform;
        this.disappearedPlatforms = resetData.disappearedPlatforms;
        
        // Reset checkpoint system in game state
        MapTools.resetGameState(this.gameState);
        
        // Reset barrel spawn timer
        this.barrelSpawnTimer = 0;
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
} */