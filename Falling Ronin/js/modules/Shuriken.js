import * as THREE from 'three';

export class Shuriken {
    constructor(scene, platformPosition, platformSize, startingPathIndex = 0){

        this.scene = scene;                             // Reference to the scene
        this.platformPosition = platformPosition;       // Position of the platform where shuriken will move
        this.platformSize = platformSize;               // Size of the platform NEEDED TO CALCULATE PATH
        this.player = null;                             // Reference to player for collision
       
        // Movement properties
        this.speed = 5.5;               // Units per second 
        this.rotationSpeed = 8.0;       // Rotation speed for spinning effect (Z-axis)
        this.rotationSpeedX = 4.0;      // rotation around X-axis
        this.rotationSpeedY = 6.0;      // rotation around Y-axis
        this.heightOffset = 1.5;        // Height above platform
        
        // Path properties
        this.pathPoints = []; // Array to hold ALL THE path points -> composto da 8 elementi per piattaforma
        this.currentPathIndex = startingPathIndex; // Start from specified index
        this.pathProgress = 0; // 0 to 1 between current and next point of the shuriken path
        
        // Collision properties
        this.collisionRadius = 0.85;
        this.lastCollisionTime = 0;    // prevent multiple hits
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

        // Points for a shuriken (star-shaped) polygon.
        // It alternates between outer and inner radii to create spikes
        // ten times iteration
        for (let i = 0; i < points * 2; i++) {
            // Calculate the angle for the current point (even indices = outer, odd = inner)
            const angle = (i / (points * 2)) * (2 * Math.PI);
            // points are spread evenly on 360 degree

            // Alternate between outer and inner radius for each point
            let radius;
            if (i % 2 === 0) {
                radius = outerRadius;
            } else {
                radius = innerRadius;
            }
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                // Move to the first point without drawing a line (start of the shape)
                shape.moveTo(x, y);
            } 
            else { //after the first point draw all the line
                // Draw a line to the next point, forming the star's edges
                shape.lineTo(x, y);
            }
        }

        // Create center hole
        const hole = new THREE.Path();
        hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, false); // Create a circular hole in the center
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

        //handle the shadow settings
        if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
            window.game.gameState.getShadowManager().updateObjectShadows(this.mesh);
        } else {
            // Default shadow settings
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }

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
        
        // Create rectangular path points, not directly on the border but slightly offset inside
        // STARTING FROM THE CENTER COORDINATES OF THE PLATFORM ADD THE WIDTH AND DEPTH OF THE PLATFORM (TO GET EDGES) 
        // AND REMOVE THE MARGIN TO MAKE IT A BIT INSIDE THE PLATFORM
        this.pathPoints = [
            // Front edge
            new THREE.Vector3(x + width/2 - margin, pathY, z + depth/2 - margin/2), // Front-right part
            new THREE.Vector3(x + width/2 - margin, pathY, z - depth/2 + margin/2), // Front-left part

            // Right edge
            new THREE.Vector3(x + width/2 - margin/2, pathY, z - depth/2 + margin), // Back-right part
            new THREE.Vector3(x - width/2 + margin/2, pathY, z - depth/2 + margin), // Back-left part

            // Back edge
            new THREE.Vector3(x - width/2 + margin, pathY, z - depth/2 + margin/2), // Back-left part
            new THREE.Vector3(x - width/2 + margin, pathY, z + depth/2 - margin/2), // Back-right part

            // Left edge
            new THREE.Vector3(x - width/2 + margin/2, pathY, z + depth/2 - margin), // Front-left part
            new THREE.Vector3(x + width/2 - margin/2, pathY, z + depth/2 - margin), // Front-right part
        ];
        
        // Set initial position based on starting path index
        this.mesh.position.copy(this.pathPoints[this.currentPathIndex]);
    }
    
    // ============================================== UPDATE METHODS ============================================
    //FUNCTION CALLED EVERY FRAME TO UPDATE SHURIKEN POSITION, ROTATION AND COLLISION
    // -> called inside mapTools updateShurikens called inside the map update loop
    update(deltaTime, player = null) {

        this.player = player; //take the current player reference to be always updated to check collision
        
        //not called this.time += deltaTime;  // increase time
        
        // Update position along path with smooth transitions
        this.updateMovement(deltaTime);
        
        // Update complex rotation animations
        this.updateRotations(deltaTime);
                
        // Check collision with player
        this.checkShurikenPlayerCollision();
    }
    
    updateMovement(deltaTime) {
        // If no path points shuriken is defined, do nothing
        if (this.pathPoints.length < 2) return;
        
        // Calculate movement distance for this frame --> will be summed up to the pathProgress to increase the movement 
        const moveDistance = this.speed * deltaTime;  

        // Get current and next path points (always clockwise )
        const currentPoint = this.pathPoints[this.currentPathIndex];
        const nextIndex = (this.currentPathIndex + 1) % this.pathPoints.length; // % needed to loop around the path when reaches the last point
        const nextPoint = this.pathPoints[nextIndex];
        
        // Calculate distance between current and next point in the current frame
        const segmentDistance = currentPoint.distanceTo(nextPoint);
        
        // Calculate how much progress we make on this segment
        const segmentProgress = moveDistance / segmentDistance;
        
        // Update path progress
        this.pathProgress += segmentProgress;
        
        // Check if we've reached the next point
        if (this.pathProgress >= 1.0) {
            // Move to next segment
            this.currentPathIndex = nextIndex;
            this.pathProgress = this.pathProgress - 1.0; // bring it to 0 for the next segment
        }
                
        // Linear interpolation between current and next path point
        const currentSegmentStart = this.pathPoints[this.currentPathIndex];
        const currentSegmentEnd = this.pathPoints[nextIndex];
        let t = this.pathProgress; // in the lerp function is needed to interpolate between the two points
        this.mesh.position.lerpVectors(currentSegmentStart, currentSegmentEnd, t);
    }
    
    updateRotations(deltaTime) {
        // Primary spinning rotation (Z-axis) //not the spinning velocity but the orientation is updated
        this.mesh.rotation.z += this.rotationSpeed * deltaTime;
        
        // Secondary rotation animations for more dynamic effect
        this.mesh.rotation.x += this.rotationSpeedX * deltaTime;
        this.mesh.rotation.y += this.rotationSpeedY * deltaTime;
    }
    
    
    // ============================================== COLLISION METHODS ============================================    
    // function called in the update method to check collision with player
    checkShurikenPlayerCollision() {
        if (!this.player || !this.player.model) return;
        
        // Cooldown check, otherwise multiple times in a row
        const currentTime = Date.now();
        if (currentTime - this.lastCollisionTime < this.collisionCooldown) return; // Prevent multiple hits in a short time
        
        // Get positions of shuriken and player
        const shurikenPos = this.mesh.position;
        const playerPos = this.player.model.position;
        
        // Calculate distance between shuriken and player
        const distance = shurikenPos.distanceTo(playerPos); //DISTANCE = Euclidean distance between two points
        
        // Check collision
        if (distance < this.collisionRadius) {
            this.lastCollisionTime = currentTime;            
            console.log(`[Shuriken] hit player! Distance: ${distance.toFixed(2)}`);
            
            // Call player death method
            if (this.player) {
                this.player.playerDied('shuriken hit');
            }
        }
    }

    // Cleanup method
    destroy() {
        this.scene.remove(this.mesh);
    }
}
