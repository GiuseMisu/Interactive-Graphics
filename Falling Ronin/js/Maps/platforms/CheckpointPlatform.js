import * as THREE from 'three';
import { BasePlatform } from './BasePlatform.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class CheckpointPlatform extends BasePlatform {
    constructor(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        super(scene, gameState, assetManager);
        
        this.platformName = platformName;
        this.platformId = platformId;
        
        // Create material for checkpoint platform
        const pavingStonesTexture = this.assetManager ? 
            this.assetManager.loadTexture('assets/textures/paved.jpg') : 
            new THREE.TextureLoader().load('assets/textures/paved.jpg');
        
        if (pavingStonesTexture) {
            pavingStonesTexture.wrapS = THREE.RepeatWrapping;
            pavingStonesTexture.wrapT = THREE.RepeatWrapping;
            pavingStonesTexture.repeat.set(Math.max(1, width / 4), Math.max(1, depth / 4)); // Adjusted repeat values for smoother appearance
        }

        const material = new THREE.MeshStandardMaterial({ 
            map: pavingStonesTexture,
            color: 0xaaaaaa, // darker gray
            roughness: 0.8, // Increase roughness for less shine
            metalness: 0.2 // Slightly metallic for realism
        });
        
        this.archModel = null;

        // Create the mesh, method is defined in BasePlatform
        this.createMesh(x, y, z, width, depth, material);

        // Load the Japanese arch model for checkpoint platforms
        this.loadArchModel(x, y, z);

        // Set platform-specific user data -> method is defined in BasePlatform
        this.setUserData({
            isCheckpoint: true,
            isGoal: false,
            isTimedPlatform: false,
            platformName: platformName,
            platformId: platformId
        });
        
        this.addToScene(); 
        
        // Register checkpoint within game state
        if (this.gameState) {
            const checkpointPosition = { x: x, y: y + 0.25, z: z }; // Surface position
            this.gameState.addCheckpoint(platformId, checkpointPosition, platformName);
        }
        
        console.log(`Created Checkpoint Platform - ID: ${platformId}, Name: ${platformName}, Position: x=${x}, y=${y}, z=${z}`);
    }

    static create(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        return new CheckpointPlatform(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
    }

    loadArchModel(x, y, z) {
       const onLoad = (object) => {
            this.archModel = object;
            this.archModel.scale.set(0.013, 0.013, 0.013);
            // Place the base of the arch exactly on the platform surface
            // Platform height is 0.5, so y + 4 is the top
            this.archModel.position.set(x, y + 4, z);
            const archBox = new THREE.Box3().setFromObject(this.archModel);
            if (this.archModel.children) {
                this.archModel.children.forEach((child, idx) => {
                    const childBox = new THREE.Box3().setFromObject(child);
                 });
            }
            // Use child meshes for more accurate pillar/top collision
            // Child[1] = Columna_1 (left pillar), Child[2] = Columna_2 (right pillar), Child[3] = top 
            const boundingBoxes = [];
            const boxHelpers = [];
            if (this.archModel.children) {
                // Left pillar
                const leftPillar = this.archModel.children.find(child => child.name.includes('Columna_1'));
                if (leftPillar) {
                    const leftBox = new THREE.Box3().setFromObject(leftPillar);
                    boundingBoxes.push(leftBox);
                }
                // Right pillar
                const rightPillar = this.archModel.children.find(child => child.name.includes('Columna_2'));
                if (rightPillar) {
                    const rightBox = new THREE.Box3().setFromObject(rightPillar);
                    boundingBoxes.push(rightBox);
                }
                // Top beam
                const topBeam = this.archModel.children.find(child => child.name.includes('Techo'));
                if (topBeam) {
                    const topBox = new THREE.Box3().setFromObject(topBeam);
                    boundingBoxes.push(topBox);
                }
            }
            this.archModel.userData.boundingBoxes = boundingBoxes;
            this.archModel.userData.boxHelpers = boxHelpers;
            
            this.scene.add(this.archModel);
            //console.log(`Loaded Japanese Arch model for checkpoint platform ${this.platformId}`);
        };
        const onError = (error) => {
            console.error('Error loading Japanese Arch model:', error);
        };

        if (this.assetManager) { // Use asset manager if available
            this.assetManager.loadFBX('assets/models/Japanese_Arch_Low.FBX', onLoad, undefined, onError);
        } 
        else {
            console.warn("[CheckpointPlatform Japanese_Arch] WARNING: AssetManager not available, using fallback FBXLoader.");
            const loader = new FBXLoader();
            loader.load('assets/models/Japanese_Arch_Low.FBX', onLoad, undefined, onError);
        }
    }

    removeFromScene() {
        super.removeFromScene();
        if (this.archModel) {
            // Remove collision box helpers from scene
            if (this.archModel.userData.boxHelpers) {
                this.archModel.userData.boxHelpers.forEach(helper => {
                    this.scene.remove(helper);
                });
            }
            this.scene.remove(this.archModel);
        }
    }
}
