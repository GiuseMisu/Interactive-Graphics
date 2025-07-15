import * as THREE from 'three';

export class Shuriken {
    constructor(scene, platformPosition, platformSize, startingPathIndex = 0, shadowManager = null) {

        this.scene = scene;                             // Reference to the scene
        this.platformPosition = platformPosition;       // Position of the platform where shuriken will move
        this.platformSize = platformSize;               // Size of the platform NEEDED TO CALCULATE PATH
        this.player = null;                             // Reference to player for collision
        this.shadowManager = shadowManager;             // Reference to shadow manager for shadow handling

        // Movement properties
        this.speed = 5.5;                // Units per second 
        this.rotationSpeed = 8.0;       // Rotation speed for spinning effect (Z-axis)
        this.rotationSpeedX = 4.0;      // Additional rotation around X-axis
        this.rotationSpeedY = 6.0;      // Additional rotation around Y-axis
        this.heightOffset = 1.5;        // Height above platform
        this.bobAmplitude = 0.3;        // Vertical bobbing amplitude
        this.bobFrequency = 3.0;        // Vertical bobbing frequency
        this.time = 0;                  // Time accumulator for animations
        
        // Path properties
        this.pathPoints = []; // Array to hold ALL THE path points
        this.currentPathIndex = startingPathIndex; // Start from specified index
        this.pathProgress = 0; // 0 to 1 between current and next point
        this.smoothingFactor = 0.2; // For smooth corner transitions
        
        // Collision properties
        this.collisionRadius = 0.8;
        this.lastCollisionTime = 0;
        this.collisionCooldown = 1000; // 1 second cooldown

        this.createShuriken();
        this.generatePath();
    }
    
    createShuriken() {
        // Create shuriken geometry - 5-pointed star shape with center hole
        const shape = new THREE.Shape();
        const outerRadius = 0.5;
        const innerRadius = 0.2;
        const points = 5; //5 spikes
        const holeRadius = 0.08; // Center hole radius

        // This loop generates the points for a shuriken (star-shaped) polygon.
        // It alternates between outer and inner radii to create the "spikes" of the shuriken.
        for (let i = 0; i < points * 2; i++) {
            // Calculate the angle for the current point (even indices = outer, odd = inner)
            const angle = (i / (points * 2)) * Math.PI * 2;

            // Alternate between outer and inner radius for each point
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                // Move to the first point without drawing a line (start of the shape)
                shape.moveTo(x, y);
            } 
            else {
                // Draw a line to the next point, forming the star's edges
                shape.lineTo(x, y);
            }
        }

        // Create center hole
        const hole = new THREE.Path();
        hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
        shape.holes.push(hole);

        // Extrude the shape to create 3D geometry
        const extrudeSettings = {
            depth: 0.1,
            bevelEnabled: true, 
            bevelSegments: 2,
            steps: 2, 
            bevelSize: 0.02,
            bevelThickness: 0.02
        };

        // extruded -> 3D geometry created from a 2D shape
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Create material for the flat faces (grey)
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666, // Grey color for flat faces
            metalness: 0.8,
            roughness: 0.3,
            emissive: 0x222222,
            emissiveIntensity: 0.2
        });

        // Create material for the edges (black)
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // Black color for edges
            metalness: 0.9,
            roughness: 0.1
        });

        // Create mesh with multi-material
        const mesh = new THREE.Mesh(geometry, [faceMaterial, edgeMaterial]);
        this.mesh = mesh;
        this.baseMaterial = faceMaterial; 

        // Set up shadow properties using ShadowManager
        this.updateShadowSettings();

        // Add to scene
        this.scene.add(this.mesh);
    }

    // Defines the path around the platform that the shuriken follows
    generatePath() {
        // Generate rectangular path around platform perimeter
        const { x, y, z } = this.platformPosition; // reference to platform position AT THE CENTER OF THE PLATFORM
        const { width, depth } = this.platformSize; // reference to platform size
        
        // Calculate path points around platform perimeter (slightly wider margin)
        const margin = 1.2; 
        const pathY = y + this.heightOffset; // offset to make it floating
        
        // Create rectangular path points, STARTING FROM THE CENTER ADD THE WIDTH AND DEPTH OF THE PLATFORM AND REMOVE THE MARGIN
        this.pathPoints = [
            // Front edge
            new THREE.Vector3(x + width/2 - margin, pathY, z + depth/2 - margin/2), // Front-right approach
            new THREE.Vector3(x + width/2 - margin, pathY, z - depth/2 + margin/2), // Front-left approach
            
            // Right edge
            new THREE.Vector3(x + width/2 - margin/2, pathY, z - depth/2 + margin), // Back-right approach
            new THREE.Vector3(x - width/2 + margin/2, pathY, z - depth/2 + margin), // Back-left approach
            
            // Back edge
            new THREE.Vector3(x - width/2 + margin, pathY, z - depth/2 + margin/2), // Back-left approach
            new THREE.Vector3(x - width/2 + margin, pathY, z + depth/2 - margin/2), // Back-right approach
            
            // Left edge
            new THREE.Vector3(x - width/2 + margin/2, pathY, z + depth/2 - margin), // Front-left approach
            new THREE.Vector3(x + width/2 - margin/2, pathY, z + depth/2 - margin), // Front-right approach
        ];
        
        // Set initial position based on starting path index
        this.mesh.position.copy(this.pathPoints[this.currentPathIndex]);
    }
    
    // ============================================== UPDATE METHODS ============================================
    //FUNCTION CALLED EVERY FRAME TO UPDATE SHURIKEN POSITION, ROTATION AND COLLISION
    update(deltaTime, player = null) {

        this.player = player; //take the current player reference to be always updated to check collision
        this.time += deltaTime;  // increase time
        
        // Update position along path with smooth transitions
        this.updateMovement(deltaTime);
        
        // Update complex rotation animations
        this.updateRotations(deltaTime);
                
        // Check collision with player
        if (player) {
            this.checkPlayerCollision();
        }

    }
    
    updateMovement(deltaTime) {
        // If no path points shuriken is defined, do nothing
        if (this.pathPoints.length < 2) return;
        
        // Calculate movement distance this frame
        const moveDistance = this.speed * deltaTime;
        
        // Get current and next path points (always clockwise )
        const currentPoint = this.pathPoints[this.currentPathIndex];
        const nextIndex = (this.currentPathIndex + 1) % this.pathPoints.length;
        const nextPoint = this.pathPoints[nextIndex];
        
        // Calculate distance between current and next point
        const segmentDistance = currentPoint.distanceTo(nextPoint);
        
        // Calculate how much progress we make on this segment
        const segmentProgress = moveDistance / segmentDistance;
        
        // Update path progress
        this.pathProgress += segmentProgress;
        
        // Check if we've reached the next point
        if (this.pathProgress >= 1.0) {
            // Move to next segment
            this.currentPathIndex = nextIndex;
            this.pathProgress = this.pathProgress - 1.0; // Carry over excess progress
        }
        
        // Smooth interpolation with bezier-like curve for corners
        const currentSegmentStart = this.pathPoints[this.currentPathIndex];
        const currentSegmentEnd = this.pathPoints[(this.currentPathIndex + 1) % this.pathPoints.length];
        
        // Apply smooth curve interpolation near corners
        let t = this.pathProgress;
        
        // Smooth the transition using ease-in-out function
        if (t < this.smoothingFactor) {
            // Ease in at the start of segment
            t = this.smoothEaseInOut(t / this.smoothingFactor) * this.smoothingFactor;
        }
        else if (t > 1.0 - this.smoothingFactor) {
            // Ease out at the end of segment
            const localT = (t - (1.0 - this.smoothingFactor)) / this.smoothingFactor;
            t = (1.0 - this.smoothingFactor) + this.smoothEaseInOut(localT) * this.smoothingFactor;
        }
        this.mesh.position.lerpVectors(currentSegmentStart, currentSegmentEnd, t);
    }

    // Smooth easing function for corner transitions
    // This helps the shuriken transition smoothly at corners.
    smoothEaseInOut(t) {
        // The smoothstep function creates a gentle acceleration and deceleration.
        // For t in [0, 1]: returns 0 at t=0, 0.5 at t=0.5, and 1 at t=1.
        return t * t * (3 - 2 * t);
    }
    
    updateRotations(deltaTime) {
        // Primary spinning rotation (Z-axis)
        this.mesh.rotation.z += this.rotationSpeed * deltaTime;
        
        // Secondary rotation animations for more dynamic effect
        this.mesh.rotation.x += this.rotationSpeedX * deltaTime;
        this.mesh.rotation.y += this.rotationSpeedY * deltaTime;
    }
    
    
    // ============================================== COLLISION METHODS ============================================    
    // function called in the update method to check collision with player
    checkPlayerCollision() {
        if (!this.player || !this.player.model) return;
        
        // Cooldown check, otherwise multiple times in a row
        const currentTime = Date.now();
        if (currentTime - this.lastCollisionTime < this.collisionCooldown) return;
        
        // Get positions of shuriken and player
        const shurikenPos = this.mesh.position;
        const playerPos = this.player.model.position;
        
        // Calculate distance between shuriken and player
        const distance = shurikenPos.distanceTo(playerPos); //DISTANCE = Euclidean distance between two points
        
        // Check collision
        if (distance < this.collisionRadius) {
            this.lastCollisionTime = currentTime;
            
            console.log(`Shuriken hit player! Distance: ${distance.toFixed(2)}`);
            
            // Call player death method
            if (this.player && typeof this.player.playerDied === 'function') {
                this.player.playerDied('shuriken hit');
            }
        }
    }

    // ============================================== SHADOW METHODS ============================================

    // Method to update shadow settings based on ShadowManager
    updateShadowSettings() {
        if (!this.mesh) return;
        
        if (this.shadowManager) {
            // Use ShadowManager to determine shadow settings
            this.shadowManager.updateObjectShadows(this.mesh);
        } 
        else {
            // Fallback: disable shadows if no ShadowManager
            this.mesh.castShadow = false;
            this.mesh.receiveShadow = false;
        }
    }
    
    // Method to be called when shadow mode changes
    onShadowModeChanged() {
        this.updateShadowSettings();
    }

    // Cleanup method
    destroy() {
        this.scene.remove(this.mesh);
    }
}
