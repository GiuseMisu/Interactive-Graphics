import * as THREE from 'three';

export class CameraController {
    constructor(camera, controls, target) {
        this.camera = camera; // reference to the camera to control
        this.controls = controls; // reference to the orbit controls (if any)
        this.target = target; // reference to the target object (usually the player model)
        
        // Camera settings in third-person view
        this.distance = 12;      // Distance from player
        this.height = 7;        // Height above player
        
        // For smooth camera rotation
        this.cameraAngle = 0;   // Current camera angle
        this.lerpFactor = 0.1;  // How quickly camera follows the target 

        // Camera mode toggle-> at the beginning is false the orbit mode
        this.orbitMode = false; 

        // Configure orbit controls
        if (this.controls) {
            this.controls.enabled = false;
            this.controls.enableDamping = true; // used for smooth movement
            this.controls.dampingFactor = 0.05; // Damping factor for smooth movement
            this.controls.minDistance = 3; // Minimum zoom distance
            this.controls.maxDistance = 20; // Maximum zoom distance
            this.controls.maxPolarAngle = Math.PI / 1.5; // Limit looking down
        }
    }
    
    // function to toggle between orbit and third-person camera modes
    //called in the inpu Manager Class when the P key is pressed
    toggleCameraMode() {
        this.orbitMode = !this.orbitMode;
        
        if (this.controls) {
            this.controls.enabled = this.orbitMode;
            
            // Configure controls based on mode
            //placed to true because now camera not fixed on the player
            if (this.orbitMode) {
                this.controls.enableZoom = true;
                this.controls.enableRotate = true;
                this.controls.update();
            } 
            //placed to false because now camera fixed on the player
            else {
                this.controls.enableZoom = false;
                this.controls.enableRotate = false;
            }
        }
        
        // If switching to orbit mode, set the camera controls target to the player
        if (this.orbitMode && this.target && this.controls) {
            this.controls.target.copy(this.target.position);
            this.controls.target.y += 1; // Look at player's head level
        }
    }
    
    update() {
        // If no target or target position is not set, do nothing
        if (!this.target || !this.target.position) {
            return;
        }
        
        // In orbit mode, just update the controls target position
        if (this.orbitMode) {
            if (this.controls) {
                this.controls.target.copy(this.target.position);
                this.controls.target.y += 1; // Look at player's head level
                this.controls.update();
            }
            return;
        }
        
        // Standard third-person camera logic
        const playerAngle = this.target.rotation.y;
        
        // Smoothly interpolate camera angle to follow player rotation
        this.cameraAngle = THREE.MathUtils.lerp(
            this.cameraAngle, 
            playerAngle, 
            this.lerpFactor // to have smooth transition
        );
        
        // Calculate camera position based on spherical coordinates
        this.camera.position.set(
            this.target.position.x - Math.sin(this.cameraAngle) * this.distance,
            this.target.position.y + this.height,
            this.target.position.z - Math.cos(this.cameraAngle) * this.distance
        );
        
        // Always look at the player
        this.camera.lookAt(
            this.target.position.x,
            this.target.position.y + 1, // Look slightly above player center
            this.target.position.z
        );
    }
}