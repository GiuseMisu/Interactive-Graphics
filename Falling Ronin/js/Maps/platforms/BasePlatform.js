import * as THREE from 'three';

export class BasePlatform {
    constructor(scene, gameState = null, assetManager = null) {
        this.scene = scene;
        this.gameState = gameState;
        this.assetManager = assetManager;
        this.mesh = null;
        this.userData = {};
    }

    createMesh(x, y, z, width, depth, material) {
        const geometry = new THREE.BoxGeometry(width, 0.5, depth);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        
        // Mark as platform for shadow management
        this.mesh.userData.isPlatform = true;
        
        // Apply shadow settings based on current shadow mode
        if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
            window.game.gameState.getShadowManager().updateObjectShadows(this.mesh);
        } else {
            // Default shadow settings for platforms
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
        }
        return this.mesh;
    }

    addToScene() {
        if (this.mesh) {
            this.scene.add(this.mesh);
        }
    }

    removeFromScene() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }

    setUserData(data) {
        this.userData = { ...this.userData, ...data };
        if (this.mesh) {
            this.mesh.userData = this.userData;
        }
    }

    getPosition() {
        return this.mesh ? this.mesh.position : null;
    }

    getSize() {
        if (!this.mesh) return null;
        return {
            width: this.mesh.geometry.parameters.width,
            depth: this.mesh.geometry.parameters.depth,
            height: this.mesh.geometry.parameters.height
        };
    }

    // Virtual method for per-frame updates. Overridden by Platform-Subclasses.
    update(deltaTime, player) {
        // Override in subclasses
    }

    onPlayerEnter(player) {
        // Override in subclasses
    }

    onPlayerExit(player) {
        // Override in subclasses
    }
}
