import * as THREE from 'three';
import { BasePlatform } from './BasePlatform.js';

export class TimedPlatform extends BasePlatform {
    constructor(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        super(scene, gameState, assetManager);
        
        this.platformName = platformName;
        this.platformId = platformId;
        this.originalPosition = { x, y, z };
        this.timerState = 'inactive'; // 'inactive', 'active', 'disappearing', 'disappeared'
        this.timeRemaining = 1.0; // 1.0 seconds countdown
        this.playerOnPlatform = false;
        this.animationProgress = 0;
        
        // Create material for timed platform
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
            transparent: true,
            opacity: 0.7, // Semi-transparent
            metalness: 0.0, // Not shiny
            roughness: 1.0 // Rough surface
        });
        
        // Create the mesh
        this.createMesh(x, y, z, width, depth, material);
        
        // Set platform-specific user data
        this.setUserData({
            isCheckpoint: false,
            isGoal: false,
            isTimedPlatform: true,
            platformName: platformName,
            platformId: platformId,
            originalPosition: this.originalPosition,
            timerState: this.timerState,
            timeRemaining: this.timeRemaining,
            playerOnPlatform: this.playerOnPlatform,
            animationProgress: this.animationProgress
        });
        
        // Add to scene
        this.addToScene();
        
        console.log(`Created Timed Platform - ID: ${platformId}, Name: ${platformName}, Position: x=${x}, y=${y}, z=${z}`);
    }

    // Check if player is on this platform
    //The checks are done by controlling the player position and the platform size
    isPlayerOnPlatform(player) {
        if (!player || !player.model || !this.mesh) return false;
        
        const playerPos = player.model.position;
        const platformPos = this.mesh.position;
        const platformWidth = this.mesh.geometry.parameters.width;
        const platformDepth = this.mesh.geometry.parameters.depth;

        return (
            playerPos.x >= platformPos.x - platformWidth / 2 &&
            playerPos.x <= platformPos.x + platformWidth / 2 &&
            playerPos.z >= platformPos.z - platformDepth / 2 &&
            playerPos.z <= platformPos.z + platformDepth / 2
        );
    }

    // Check collision and activate timer if needed
    checkPlayerOnTimedPlatform(player) {
        if (!player || !player.model) return false;

        const playerFeet = player.getPlayerFeetPosition();
        const platformTop = this.mesh.position.y + (this.mesh.geometry.parameters.height / 2);
        const isOnPlatform = this.isPlayerOnPlatform(player);

        if (isOnPlatform && Math.abs(playerFeet.y - platformTop) < 0.1) {
            // Player stepped on timed platform
            if (this.timerState === 'inactive') {
                //timer started
                this.timerState = 'active';
                this.timeRemaining = 1.0;
                console.log(`TIMER STARTED: Platform "${this.platformName}" - 1.0 seconds countdown!`);
            }
            this.playerOnPlatform = true;
            return true;
        } else {
            this.playerOnPlatform = false;
            return false;
        }
    }

    // Update the timed platform
    update(deltaTime, player) {
        if (this.timerState === 'active') {
            this.timeRemaining -= deltaTime;
            
            // Log every second
            const secondsRemaining = Math.ceil(this.timeRemaining);
            const lastSecond = Math.ceil(this.timeRemaining + deltaTime);
            if (secondsRemaining !== lastSecond && secondsRemaining > 0) {
                console.log(`Platform "${this.platformName}" disappearing in ${secondsRemaining} seconds!`);
            }

            // Visual warning effects as time runs out
            if (this.timeRemaining <= 0.9) {
                // ===Opacity fade as warning===
                const fadeAmount = this.timeRemaining / 0.9;
                this.mesh.material.opacity = 0.7 * fadeAmount;
            }

            // Time's up - start disappearing
            if (this.timeRemaining <= 0) {
                this.timerState = 'disappearing';
                this.animationProgress = 0;
                //console.log(`Platform "${this.platformName}" time's up! Starting disappearing animation...`);
            }
        } 
        else if (this.timerState === 'disappearing') {
            // Animate disappearing, original was * 2
            this.animationProgress += deltaTime * 3; //the higher the less the scaling down last

            if (this.animationProgress >= 1.0) {
                // Platform has disappeared
                this.timerState = 'disappeared';
                this.mesh.visible = false; //--> you cannot interact with the platform anymore
                console.log(`Platform "${this.platformName}" has disappeared!`);
            }
            else {
                // Animate scaling down and fading out
                const scale = 1.0 - this.animationProgress;
                this.mesh.scale.set(scale, scale, scale);
                this.mesh.rotation.y = this.animationProgress * Math.PI * 2;
                this.mesh.material.opacity = 0.7 * scale;
            }
        }
    }

    // Reset the platform
    // this is called by MapTools.resetTimedPlatform when player respawns. 
    // in particuolar the MapTools.resetTimedPlatform is called inside the two respawn method of the player class
    reset() {
        this.timerState = 'inactive';
        this.timeRemaining = 1.0;
        this.playerOnPlatform = false;
        this.animationProgress = 0;
        
        // Reset visual properties
        this.mesh.scale.set(1, 1, 1);
        this.mesh.material.opacity = 0.7;
        this.mesh.material.transparent = true;
        this.mesh.rotation.y = 0;
        this.mesh.position.set(
            this.originalPosition.x,
            this.originalPosition.y,
            this.originalPosition.z
        );
        this.mesh.visible = true;
        
        // Re-add to scene if needed
        if (!this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }
        
        console.log(`Platform "${this.platformName}" has been reset!`);
    }

    static create(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        return new TimedPlatform(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
    }
}
