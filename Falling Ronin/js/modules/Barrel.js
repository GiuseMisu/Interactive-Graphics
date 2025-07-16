import * as THREE from 'three';

export class Barrel {
    constructor(scene) {
        this.scene = scene;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.gravity = -9.8;
        this.friction = 0.95;
        this.bounciness = 0.9;
        this.groundLevel = 0.25;
        this.lifetime = 0;
        this.maxLifetime = 30; // 30 seconds before respawn [default]
        this.respawnThreshold = -10;
        this.barrelRadius = 0.5;
        this.player = null; // Reference to player for collision

        // Create collision box
        this.collisionBox = {
            width: 1.0,
            height: 1.0,
            depth: 1.0
        };
        
        this.createBarrel();
    }

    createBarrel() {
        // barrel geometry (cylinder)
        const barrelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
        
        // barrel material with wood appearance
        const barrelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.1
        });
        
        this.mesh = new THREE.Mesh(barrelGeometry, barrelMaterial);

        // Apply shadow settings based on current shadow mode
        if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
            window.game.gameState.getShadowManager().updateObjectShadows(this.mesh);
        } else {
            // Default shadow settings
            console.warn("[BARREL] ShadowManager not found, applying default shadow settings.");
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }
        
        // barrel bands for visual detail
        this.addBarrelBands();
                
        // appear in the scene
        this.scene.add(this.mesh);
    }

    addBarrelBands() {
        // Add metal bands around the barrel for visual detail
        const bandGeometry = new THREE.TorusGeometry(0.52, 0.02, 8, 16);
        const bandMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444, // metallic color
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Top band
        const topBand = new THREE.Mesh(bandGeometry, bandMaterial);
        topBand.position.y = 0.3;
        topBand.rotation.x = Math.PI / 2;
        this.mesh.add(topBand);
        
        // Bottom band
        const bottomBand = new THREE.Mesh(bandGeometry, bandMaterial);
        bottomBand.position.y = -0.3;
        bottomBand.rotation.x = Math.PI / 2;
        this.mesh.add(bottomBand);
    }

    // MAIN UPDATE METHOD - with platform collision
    update(deltaTime, player = null, platforms = []) {
        this.player = player; // Store player reference for collision

        //barrel has a lifetime so it should increase its lifetime each frame
        this.lifetime += deltaTime; 

        // Store previous position of the barrel for collision checks
        const prevPosition = this.mesh.position.clone();

        // Apply gravity to velocity first
        this.velocity.y += this.gravity * deltaTime;

        // Calculate next position based on velocity
        const nextPosition = this.mesh.position.clone();
        nextPosition.x += this.velocity.x * deltaTime;
        nextPosition.y += this.velocity.y * deltaTime;
        nextPosition.z += this.velocity.z * deltaTime;

        // in the current frame 
        // Check for collision along the movement path BEFORE moving
        if (this.checkBarrelPlayerCollision(prevPosition, nextPosition)) {
            // Don't move, just bounce
            this.bounceOffPlayer();
            console.log("Barrel collision detected - bouncing off player!");
        } 
        else {
            // Safe to move in the next position, no collision detected
            this.mesh.position.copy(nextPosition);
        }
        // Dynamic platform collision detection
        this.checkPlatformCollisions(platforms);

        // Rolling rotation based on horizontal velocity
        if (Math.abs(this.velocity.x) > 0.1) {
            this.mesh.rotation.z -= this.velocity.x * deltaTime * 2;
        }
        // Keep barrel on its side
        this.mesh.rotation.x = Math.PI / 2;
    }

    // New method for dynamic platform collision detection
    checkPlatformCollisions(platforms) {
        // If no platforms are provided, skip collision checks
        if (!platforms || platforms.length === 0) return;

        const barrelPos = this.mesh.position;
        const barrelBottom = barrelPos.y - this.barrelRadius;

        // Check collision with each platform
        for (let platform of platforms) {
            // Safety check to ensure platform has all required properties
            if (!platform || !platform.position || !platform.geometry || !platform.geometry.parameters) {
                console.warn('Barrel collision: Invalid platform object detected, skipping...', platform);
                continue;
            }
            
            const platformPos = platform.position;
            const platformGeometry = platform.geometry;
            
            // Get platform bounds from its geometry
            const platformWidth = platformGeometry.parameters.width;
            const platformDepth = platformGeometry.parameters.depth;
            const platformHeight = platformGeometry.parameters.height;
            
            // Calculate platform boundaries
            const platformLeft = platformPos.x - platformWidth / 2;
            const platformRight = platformPos.x + platformWidth / 2;
            const platformFront = platformPos.z - platformDepth / 2;
            const platformBack = platformPos.z + platformDepth / 2;
            const platformTop = platformPos.y + platformHeight / 2;

            // Check if barrel is above this platform and within its bounds
            if (barrelPos.x >= platformLeft && barrelPos.x <= platformRight &&
                barrelPos.z >= platformFront && barrelPos.z <= platformBack &&
                barrelBottom <= platformTop && this.velocity.y < 0) {
                
                // Barrel is colliding with this platform
                this.mesh.position.y = platformTop + this.barrelRadius;
                this.velocity.y = -this.velocity.y * this.bounciness;
                
                // Stop tiny bounces if velocity is very low
                if (Math.abs(this.velocity.y) < 0.1) {
                    this.velocity.y = 0;
                }
                
                // Only apply friction if there was a significant bounce (not when resting)
                if (Math.abs(this.velocity.y) > 0.5) {
                    this.velocity.x *= 0.98;
                    this.velocity.z *= 0.98;
                }
                break; // Stop checking other platforms once we find a collision
            }
        }
    }

    // Check collision along movement path (prevents "jumping over" player)
    checkBarrelPlayerCollision(fromPos, toPos) {
        // If no player is set, skip collision checks
        if (!this.player || !this.player.model) {
            return false;
        }

        const playerPos = this.player.model.position;
        const collisionDistance = 1.6; 

        // Check multiple points along the movement pwath
        const steps = 5; // Check 5 points along the path
        for (let i = 0; i <= steps; i++) {
            const t = i / steps; // 0 to 1
            // Calculate the position at this step, lerp to find intermediate positions
            const checkPos = new THREE.Vector3().lerpVectors(fromPos, toPos, t);
            // Calculate distance to player and check for collision
            const distance = checkPos.distanceTo(playerPos);
            if (distance < collisionDistance) {
                return true;
            }
        }
        return false;
    }

    // Bounce off player when collision occurs
    // to make it more realistic, we calculate the bounce direction
    // based on the barrel's position relative to the player
    // THIS FUNCTION IS CALLED ONLY WHEN A COLLISION IS DETECTED
    bounceOffPlayer() {
        if (!this.player || !this.player.model) return;

        const barrelPos = this.mesh.position;
        const playerPos = this.player.model.position;
        
        // Calculate bounce direction from player to barrel
        // how: barrelPos - playerPos in order to get the bounce direction
        // will give us a vector pointing from the player to the barrel
        // Normalize the direction vector to get a unit vector
        const bounceDirection = new THREE.Vector3()
            .subVectors(barrelPos, playerPos)
            .normalize();
        
        // Ensure we have a valid bounce direction (prevent division by zero)
        if (bounceDirection.length() === 0) {
            // Default bounce direction if positions are identical
            bounceDirection.set(-1, 0, 0); // Bounce backwards
        }
        
        // Apply stronger bounce force with more realistic physics
        const bounceForce = 3.0; // Increased bounce strength
        this.velocity.x = bounceDirection.x * bounceForce;
        this.velocity.z = bounceDirection.z * bounceForce;
        this.velocity.y = Math.max(this.velocity.y, 1.5); // More pronounced upward bounce
        
        //console.log(`Barrel bounced off player!`);
        
        // ADDED: Directly inform the player about the collision
        // This ensures the death counter works even when player is stationary
        if (this.player) {
            const currentTime = Date.now();
            // Use the same cooldown logic as in the Player class
            // to prevent immediate respawn after collision
            if (!this.player.lastBarrelCollisionTime || 
                currentTime - this.player.lastBarrelCollisionTime > 2000) {
                this.player.playerDied('barrel collision');
            }
        }
    }
}