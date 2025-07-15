import * as THREE from 'three';
import { Barrel } from './Barrel.js';

/**
 * - Each orientation determines the direction the door opens and barrels roll
 * Orientations:
 * - 'east': Door opens toward +X, barrels roll east
 * - 'west': Door opens toward -X, barrels roll west  
 * - 'north': Door opens toward -Z, barrels roll north
 * - 'south': Door opens toward +Z, barrels roll south
 */

export class TrapDoorSpawner {
    constructor(scene, x, y, z, gameState = null, barrelSpawnCallback = null, orientation = 'east', spawnFrequency = 3.0, bounciness = 0.6, friction = 0.5) {
        this.scene = scene;
        this.gameState = gameState;
        this.barrelSpawnCallback = barrelSpawnCallback; // Callback to notify when a barrel is spawned
        
        // Position
        this.position = new THREE.Vector3(x, y, z);
        
        // Orientation configuration
        this.orientation = orientation; // 'east', 'west', 'north', 'south'
        this.setOrientationConfig();
        
        // Spawn frequency configuration
        this.spawnFrequency = spawnFrequency; // Time between spawns in seconds (default: 3.0 for Map1)
        // Bounciness and friction for barrels
        this.bounciness = bounciness;
        this.friction = friction;
        
        // Animation states
        this.animationState = 'closed'; // 'closed', 'opening', 'open', 'closing', 'cooldown'
        this.animationTimer = 0;
        this.animationDuration = 0.8; // Door opening/closing duration
        this.cooldownDuration = this.spawnFrequency; // Time between spawns (now configurable)
        this.barrelSpawnDelay = 0.1; // Delay after door opens before barrel spawns
        this.barrelSpawned = false; // Track if barrel was spawned in current cycle
        
        // Door rotation
        this.doorRotation = 0; // Current rotation angle
        this.maxDoorRotation = Math.PI / 2; // 90 degrees
        
        // Visual effects
        this.preSpawnWarning = false;
        this.warningTimer = 0;
        this.warningDuration = 0.5; // Warning signal duration before opening
        
        // Create the trap door components
        this.createTrapDoor();
        this.createWarningLight();
        
        // Initialize cooldown state
        this.animationState = 'cooldown'; //
        this.animationTimer = 0;
    }
    
    setOrientationConfig() {
        // - hingeOffset: where to position the hinge relative to center
        // - doorOffset: where to position the door relative to hinge
        // - rotationAxis: which axis to rotate around
        // - rotationDirection: direction of rotation (1 or -1)
        // - barrelDirection: direction for barrel velocity
        
        const configs = {
            'east': {
                hingeOffset: new THREE.Vector3(-1.0, 0, 0),    // Hinge on left side
                doorOffset: new THREE.Vector3(1.0, 0, 0),      // Door to the right of hinge
                rotationAxis: 'z',
                rotationDirection: 1,                          // Positive rotation
                barrelDirection: new THREE.Vector3(1, 0, 0)    // Roll toward +X (east)
            },
            'west': {
                hingeOffset: new THREE.Vector3(1.0, 0, 0),     // Hinge on right side
                doorOffset: new THREE.Vector3(-1.0, 0, 0),     // Door to the left of hinge
                rotationAxis: 'z',
                rotationDirection: -1,                         // Negative rotation
                barrelDirection: new THREE.Vector3(-1, 0, 0)   // Roll toward -X (west)
            },
            'south': {
                hingeOffset: new THREE.Vector3(0, 0, -1.0),    // Hinge on front side
                doorOffset: new THREE.Vector3(0, 0, 1.0),      // Door to the back of hinge
                rotationAxis: 'x',
                rotationDirection: -1,                         // Negative rotation
                barrelDirection: new THREE.Vector3(0, 0, 1)    // Roll toward +Z (south)
            },
            'north': {
                hingeOffset: new THREE.Vector3(0, 0, 1.0),     // Hinge on back side
                doorOffset: new THREE.Vector3(0, 0, -1.0),     // Door to the front of hinge
                rotationAxis: 'x',
                rotationDirection: 1,                          // Positive rotation
                barrelDirection: new THREE.Vector3(0, 0, -1)   // Roll toward -Z (north)
            }
        };
        this.config = configs[this.orientation] || configs['east'];
    }
    
    createTrapDoor() {
        // Create the trap door frame (fixed part) - black like the void
        const frameGeometry = new THREE.BoxGeometry(2.2, 0.1, 2.2);
        const frameMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x000000, // Black 
            transparent: true,
            opacity: 0.9
        });

        this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.copy(this.position);
        this.frame.position.y += 0.05; // Slightly above the platform

        this.scene.add(this.frame);
        
        // Create the black interior surface (the hole where barrels come from)
        const interiorGeometry = new THREE.BoxGeometry(2.0, 0.05, 2.0);
        const interiorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x000000, // Black interior
            transparent: true,
            opacity: 1.0
        });
        this.interior = new THREE.Mesh(interiorGeometry, interiorMaterial);
        this.interior.position.copy(this.position);
        this.interior.position.y += 0.02; // Just below the frame

        this.scene.add(this.interior);
        
        // Create the trap door itself (movable part) - all wood now
        const doorGeometry = new THREE.BoxGeometry(2.0, 0.08, 2.0);
        
        // Create wood material for all surfaces of the door
        const doorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xA0522D,
            transparent: true,
            opacity: 0.95
        });
        
        this.door = new THREE.Mesh(doorGeometry, doorMaterial);
        // Apply shadow settings, here are shadow setup is needed
        if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
            window.game.gameState.getShadowManager().updateObjectShadows(this.door);
        }
        
        // Create door hinges- positioned at the hinge edge
        const hingeGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.3);
        const hingeMaterial = new THREE.MeshLambertMaterial({ color: 0x404040 });
        
        this.hinge1 = new THREE.Mesh(hingeGeometry, hingeMaterial);
        this.hinge2 = new THREE.Mesh(hingeGeometry, hingeMaterial);
        
        // Position hinges at the hinge edge based on orientation
        if (this.config.rotationAxis === 'z') {
            // East/West orientations - hinges on Z axis
            this.hinge1.position.set(0, 0.06, -0.7); // Left side of hinge edge
            this.hinge2.position.set(0, 0.06, 0.7);  // Right side of hinge edge
        } else {
            // North/South orientations - hinges on X axis
            this.hinge1.position.set(-0.7, 0.06, 0); // Left side of hinge edge
            this.hinge2.position.set(0.7, 0.06, 0);  // Right side of hinge edge
        }
        
        // Create a group for the door and hinges to rotate together
        this.doorGroup = new THREE.Group();
        this.doorGroup.add(this.door);
        this.doorGroup.add(this.hinge1);
        this.doorGroup.add(this.hinge2);
        
        // Position the door group at the hinge edge based on orientation
        this.doorGroup.position.copy(this.position);
        this.doorGroup.position.add(this.config.hingeOffset);
        this.doorGroup.position.y += 0.1;
        
        // Position the door so that its hinge edge is at the group origin (hinge point)
        this.door.position.copy(this.config.doorOffset);
        
        // Position hinges at the pivot point (group origin)
        this.hinge1.position.set(0, 0.06, 0);
        this.hinge2.position.set(0, 0.06, 0);
        
        // Adjust hinge positions based on orientation
        if (this.config.rotationAxis === 'z') {
            // East/West orientations - spread hinges along Z axis
            this.hinge1.position.z = -0.7;
            this.hinge2.position.z = 0.7;
        } else {
            // North/South orientations - spread hinges along X axis
            this.hinge1.position.x = -0.7;
            this.hinge2.position.x = 0.7;
        }
        
        this.scene.add(this.doorGroup);
        
        // Add barrel-like texture to the door top
        this.addBarrelTexture();
    }
    
    addBarrelTexture() {
        // Create barrel-like texture with wood stripes and orthogonal black stripes
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // wood base
        const gradient = ctx.createLinearGradient(0, 0, 128, 0);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.3, '#A0522D');
        gradient.addColorStop(0.6, '#8B4513');
        gradient.addColorStop(1, '#A0522D');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // horizontal wood grain lines
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 16 + Math.random() * 8);
            ctx.lineTo(128, i * 16 + Math.random() * 8);
            ctx.stroke();
        }
        
        // vertical black stripes (like barrel hoops)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        // First vertical stripe at 1/4
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.lineTo(32, 128);
        ctx.stroke();
        
        // Second vertical stripe at 3/4
        ctx.beginPath();
        ctx.moveTo(96, 0);
        ctx.lineTo(96, 128);
        ctx.stroke();
        
        // horizontal black stripes (orthogonal to wood grain)
        ctx.lineWidth = 2;
        
        // First horizontal stripe at 1/4
        ctx.beginPath();
        ctx.moveTo(0, 32);
        ctx.lineTo(128, 32);
        ctx.stroke();
        
        // Second horizontal stripe at 3/4
        ctx.beginPath();
        ctx.moveTo(0, 96);
        ctx.lineTo(128, 96);
        ctx.stroke();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        // Apply texture to door
        this.door.material.map = texture;
        this.door.material.needsUpdate = true;
    }
    
    createWarningLight() {
        // warning light that flickers before the door opens
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4444,
            transparent: true,
            opacity: 0.0
        });
        
        this.warningLight = new THREE.Mesh(lightGeometry, lightMaterial);
        this.warningLight.position.copy(this.position);
        this.warningLight.position.y += 0.5;

        this.scene.add(this.warningLight);
        
        // Add a point light for the warning effect
        this.warningPointLight = new THREE.PointLight(0xff4444, 0, 3);
        this.warningPointLight.position.copy(this.warningLight.position);
        this.scene.add(this.warningPointLight);
    }
    
    //main function that updates the trap door spawner state and spawns barrels
    //it does dictate the trap door spawner's behavior
    update(deltaTime) {
        this.animationTimer += deltaTime;
        
        switch (this.animationState) {
            case 'cooldown':
                this.updateCooldown();
                break;
            case 'warning':
                this.updateWarning(deltaTime);
                break;
            case 'opening':
                this.updateOpening(deltaTime);
                break;
            case 'open':
                this.updateOpen(); //inside this method spawn the barrel
                break;
            case 'closing':
                this.updateClosing(deltaTime);
                break;
        }
    }
    
    updateCooldown() {
        if (this.animationTimer >= this.cooldownDuration) {
            this.startWarning();
        }
    }
    
    startWarning() {
        this.animationState = 'warning';
        this.animationTimer = 0;
        this.preSpawnWarning = true;
        this.warningTimer = 0;
    }
    
    updateWarning(deltaTime) {
        this.warningTimer += deltaTime;
        
        // Flicker warning light
        const flickerIntensity = Math.sin(this.warningTimer * 20) * 0.5 + 0.5;
        this.warningLight.material.opacity = flickerIntensity * 0.8;
        this.warningPointLight.intensity = flickerIntensity * 2;
        
        if (this.animationTimer >= this.warningDuration) {
            this.startOpening();
        }
    }
    
    startOpening() {
        this.animationState = 'opening';
        this.animationTimer = 0;
        this.preSpawnWarning = false;
        
        // Hide warning light
        this.warningLight.material.opacity = 0;
        this.warningPointLight.intensity = 0;
    }
    
    updateOpening(deltaTime) {
        const progress = Math.min(this.animationTimer / this.animationDuration, 1.0);
        const easeProgress = this.easeInOutQuad(progress);
        
        // Rotate door based on orientation configuration
        this.doorRotation = easeProgress * this.maxDoorRotation * this.config.rotationDirection;
        
        if (this.config.rotationAxis === 'z') {
            this.doorGroup.rotation.z = this.doorRotation;
        } else {
            this.doorGroup.rotation.x = this.doorRotation;
        }
        
        if (progress >= 1.0) {
            this.animationState = 'open';
            this.animationTimer = 0;
            this.barrelSpawned = false; // Reset barrel spawn flag
        }
    }
    
    updateOpen() {
        if (this.animationTimer >= this.barrelSpawnDelay && !this.barrelSpawned) {
            this.spawnBarrel();
            this.barrelSpawned = true;
        }
        // Bit more time after spawning before closing
        if (this.animationTimer >= this.barrelSpawnDelay + 0.2) {
            this.startClosing();
        }
    }
    
    startClosing() {
        this.animationState = 'closing';
        this.animationTimer = 0;
    }
    
    updateClosing(deltaTime) {
        const progress = Math.min(this.animationTimer / this.animationDuration, 1.0);
        const easeProgress = this.easeInOutQuad(progress);
        
        // Rotate door back based on orientation configuration
        this.doorRotation = (1.0 - easeProgress) * this.maxDoorRotation * this.config.rotationDirection;
        
        if (this.config.rotationAxis === 'z') {
            this.doorGroup.rotation.z = this.doorRotation;
        } else {
            this.doorGroup.rotation.x = this.doorRotation;
        }
        
        if (progress >= 1.0) {
            this.animationState = 'cooldown';
            this.animationTimer = 0;
        }
    }
    
    spawnBarrel() {
        const barrel = new Barrel(this.scene);
        
        // Position barrel at the trap door with minimal randomization
        const spawnX = this.position.x + (Math.random() - 0.5) * 0.5;
        const spawnY = this.position.y + 1.0;
        const spawnZ = this.position.z + (Math.random() - 0.5) * 0.5;
        
        barrel.mesh.position.set(spawnX, spawnY, spawnZ);
        
        // Set barrel rotation
        barrel.mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        barrel.mesh.rotation.y = (Math.random() - 0.5) * 0.3;
        barrel.mesh.rotation.z = (Math.random() - 0.5) * 0.3;
        
        // Set velocity based on orientation
        const baseSpeed = 4.0;
        // Math.random()  generates a random value between 0 and 1, then we scale it to a range of 0.1 to 1.3 for Y velocity
        const randomYVelocity = (Math.random() - 0.2) * 1.5; // THE POSSIBLE VALUES ARE BETWEEN 0.1 AND 1.3
        const directionVariation = (Math.random() - 0.5) * 0.8;
        
        // Calculate primary direction based on orientation
        const primaryVelocity = this.config.barrelDirection.clone().multiplyScalar(baseSpeed);
        
        // Add variation perpendicular to the main direction
        let perpendicularDirection;
        if (this.config.rotationAxis === 'z') {
            // East/West: perpendicular is Z direction
            perpendicularDirection = new THREE.Vector3(0, 0, directionVariation);
        } else {
            // North/South: perpendicular is X direction
            perpendicularDirection = new THREE.Vector3(directionVariation, 0, 0);
        }
        
        const finalVelocity = primaryVelocity.add(perpendicularDirection);
        finalVelocity.y = randomYVelocity; 
        
        barrel.velocity.copy(finalVelocity);
        
        // Set barrel properties
        barrel.bounciness = this.bounciness + Math.random() * 0.2;
        barrel.friction = this.friction + Math.random() * 0.1;

        // Set angular velocity
        barrel.angularVelocity.set(
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8
        );
        
        // Notify the map that a barrel was spawned
        if (this.barrelSpawnCallback) {
            this.barrelSpawnCallback(barrel);
        }
        
        return barrel;
    }
    
    // function for smooth animation of the door opening and closing
    easeInOutQuad(t) {
        // accelerates in first half, decelerates in second half
        if (t < 0.5) {
            // Ease in (accelerate)
            return 2 * t * t;
        } else {
            // Ease out (decelerate)
            return 1 - Math.pow(-2 * t + 2, 2) / 2;
        }
    }
    
    // Get the current spawn position (for external use)
    getSpawnPosition() {
        return this.position.clone();
    }
    
    // Check if the spawner is ready to spawn
    isReady() {
        return this.animationState === 'cooldown' && this.animationTimer >= this.cooldownDuration;
    }
    
    // Force trigger the spawner (for testing or special events)
    trigger() {
        if (this.animationState === 'cooldown') {
            this.startWarning();
        }
    }
    
    // Clean up when removing the spawner
    destroy() {
        this.scene.remove(this.frame);
        this.scene.remove(this.interior);
        this.scene.remove(this.doorGroup);
        this.scene.remove(this.warningLight);
        this.scene.remove(this.warningPointLight);
    }
    
    // Get available orientations
    static getAvailableOrientations() {
        return ['east', 'west', 'north', 'south'];
    }
    
    // Get current orientation
    getOrientation() {
        return this.orientation;
    }
    
    // Change orientation (requires recreation of the door)
    setOrientation(newOrientation) {
        if (!TrapDoorSpawner.getAvailableOrientations().includes(newOrientation)) {
            console.warn(`Invalid orientation: ${newOrientation}. Using 'east' as default.`);
            newOrientation = 'east';
        }
        
        if (newOrientation !== this.orientation) {
            this.orientation = newOrientation;
            this.setOrientationConfig();
            
            // Recreate the door with new orientation
            this.destroy();
            this.createTrapDoor();
            this.createWarningLight();
        }
    }
    
    // Get direction vector for barrel spawning (for debugging)
    getBarrelDirection() {
        return this.config.barrelDirection.clone();
    }
    
    // Get current spawn frequency
    getSpawnFrequency() {
        return this.spawnFrequency;
    }
    
    // Set spawn frequency (updates cooldown duration to match)
    setSpawnFrequency(frequency) {
        if (frequency <= 0) {
            console.warn('Spawn frequency must be positive. Using default value of 3.0 seconds.');
            frequency = 3.0; //default value
        }
        
        this.spawnFrequency = frequency;
        this.cooldownDuration = this.spawnFrequency;
        
        // If currently in cooldown and the new frequency is shorter than remaining time,
        // adjust the timer to prevent excessively long waits
        if (this.animationState === 'cooldown' && this.animationTimer > this.cooldownDuration) {
            this.animationTimer = this.cooldownDuration;
        }
    }
}
