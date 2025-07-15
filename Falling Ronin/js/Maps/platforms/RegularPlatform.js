import * as THREE from 'three';

import { BasePlatform } from './BasePlatform.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class RegularPlatform extends BasePlatform {
    constructor(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        super(scene, gameState, assetManager);
        
        this.platformName = platformName;
        this.platformId = platformId;
        this.archModel = null;
        
        const enlargedWidth = width * 1.3;
        const enlargedDepth = depth * 1.2;

        // Load bamboo texture for the platform
        // Load bamboo texture using assetManager if available, otherwise use THREE.TextureLoader
        let bambooTexture;
        if (this.assetManager) {
            bambooTexture = this.assetManager.loadTexture('assets/textures/detailed_bamboo.jpg');
        } else {
            bambooTexture = new THREE.TextureLoader().load('assets/textures/detailed_bamboo.jpg');
        }
        if (bambooTexture) {
            bambooTexture.wrapS = THREE.RepeatWrapping;
            bambooTexture.wrapT = THREE.RepeatWrapping;
            bambooTexture.repeat.set(
                Math.max(1, (enlargedWidth / 6)), 
                Math.max(1, (enlargedDepth / 6))
            );
        }

        // Create material with bamboo texture
        const material = new THREE.MeshStandardMaterial({
            map: bambooTexture,
            color: 0xffffff,
            roughness: 0.7, // roughness for less shine
            metalness: 0.2 // Slightly metallic for realism
        });

        // Create the mesh with enlarged size
        this.createMesh(x, y, z, enlargedWidth, enlargedDepth, material);
        
        // Set platform-specific user data
        this.setUserData({
            isCheckpoint: false,
            isGoal: false,
            isTimedPlatform: false,
            platformName: platformName,
            platformId: platformId
        });
        
        // Add to scene
        this.addToScene();

        // Place lamps and Japanese tree if this is the main starting platform
        if (platformName === 'Main Platform') {
            this.lampModels = [];
            this.japaneseTreeModel = null;
            this.loadLamps(x, y, z, enlargedWidth, enlargedDepth);
            this.loadJapaneseTree(x, y, z, enlargedWidth, enlargedDepth);
        }
        
    }

    // Override removeFromScene to also remove the arch model
    removeFromScene() {
        super.removeFromScene();
        if (this.archModel) {
            this.scene.remove(this.archModel);
        }
        if (this.lampModels) {
            this.lampModels.forEach(lamp => this.scene.remove(lamp));
            this.lampModels = [];
        }
        if (this.japaneseTreeModel) {
            this.scene.remove(this.japaneseTreeModel);
            this.japaneseTreeModel = null;
        }
    }

    loadLamps(x, y, z, width, depth) {
        // Place both lamps on the short side closest to Platform 1
        let positions;
        const offsetFromCorner = 0.5; // Distance from corner

        if (width >= depth) {
            // Both lamps on the +X side
            positions = [
                { x: x + width / 2 - offsetFromCorner, z: z - depth / 2 + offsetFromCorner },
                { x: x + width / 2 - offsetFromCorner, z: z + depth / 2 - offsetFromCorner }
            ];
        } else {
            positions = [
                { x: x + width / 2 - offsetFromCorner, z: z - depth / 2 + offsetFromCorner },
                { x: x + width / 2 - offsetFromCorner, z: z + depth / 2 - offsetFromCorner }
            ];
        }
        positions.forEach((pos, idx) => {
            const loadLampModel = (object) => {
                // Completely remove all lights and their effects
                const lightsToRemove = [];
                object.traverse(child => {
                    if (child.isLight || child.type.includes('Light')) {
                        lightsToRemove.push(child);
                    }
                    if (child.isMesh && child.material) {
                        // Keep original material but remove any emissive properties
                        if (child.material.emissive) {
                            child.material.emissive.setHex(0x000000);
                        }
                        if (child.material.emissiveIntensity !== undefined) {
                            child.material.emissiveIntensity = 0;
                        }
                        // Apply shadow settings based on current shadow mode
                        if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                            const shadowMode = window.game.gameState.getShadowMode();
                            if (shadowMode === 0) { // No shadows
                                child.castShadow = false;
                                child.receiveShadow = false;
                            } else if (shadowMode === 1) { // All shadows
                                child.castShadow = true;
                                child.receiveShadow = true;
                            } else { // Platforms only - lamps are decorative objects, no shadows
                                child.castShadow = false;
                                child.receiveShadow = false;
                            }
                        } else {
                            // Default: lamps don't cast shadows
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    }
                });
                
                // Remove lights after traversal
                lightsToRemove.forEach(light => {
                    if (light.parent) {
                        light.parent.remove(light);
                    }
                });
                
                // Scale and orient lamp
                object.scale.set(0.0035, 0.0035, 0.0035);
                object.position.set(pos.x, y + 3.0, pos.z);
                object.rotation.y = THREE.MathUtils.degToRad(0);
                // Add bounding box for collision
                object.userData.boundingBox = new THREE.Box3().setFromObject(object);
                this.scene.add(object);
                this.lampModels.push(object);
                console.log(`Loaded Lamp ${idx + 1} for main platform`);
            };
            
            if (this.assetManager) {
                this.assetManager.loadFBX(
                    'assets/models/lamp.fbx',
                    loadLampModel,
                    undefined,
                    (error) => {
                        console.error('Error loading lamp.fbx:', error);
                    }
                );
            } 
            else { //if assetManager is not available
                const fbxLoader = new FBXLoader();
                fbxLoader.load(
                    'assets/models/lamp.fbx',
                    loadLampModel,
                    undefined,
                    (error) => {
                        console.error('Error loading lamp.fbx:', error);
                    }
                );
            }
        });
    }

    loadJapaneseTree(x, y, z, width, depth) {
        // Place Japanese tree on the opposite side of the lamps
        const edgeOffset = 1.0; // Distance from the platform edge
        const treePosition = {
            x: x - width / 2 + edgeOffset, // Just inside the -X edge
            y: y + 0.25, // Platform surface
            z: z // Center of platform in Z direction
        };
        
        const loadTreeModel = (object) => {
            // Remove all lights and their effects (same as lamp logic)
            const lightsToRemove = [];
            object.traverse(child => {
                if (child.isLight || child.type.includes('Light')) {
                    lightsToRemove.push(child);
                }
                if (child.isMesh && child.material) {
                    // Keep original material but remove any emissive properties
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                    }
                    if (child.material.emissiveIntensity !== undefined) {
                        child.material.emissiveIntensity = 0;
                    }
                    // Apply shadow settings based on current shadow mode
                    if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                        const shadowMode = window.game.gameState.getShadowMode();
                        if (shadowMode === 0) { // No shadows
                            child.castShadow = false;
                            child.receiveShadow = false;
                        } else if (shadowMode === 1) { // All shadows
                            child.castShadow = true;
                            child.receiveShadow = true;
                        } else { // Platforms only - lamps are decorative objects, no shadows
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    } else {
                        // Default: lamps don't cast shadows
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                }
            });
            
            // Remove lights after traversal
            lightsToRemove.forEach(light => {
                if (light.parent) {
                    light.parent.remove(light);
                }
            });
            
            // Scale down and position the tree
            object.scale.set(0.009, 0.009, 0.009); 
            object.position.set(treePosition.x, treePosition.y, treePosition.z);
            object.rotation.y = THREE.MathUtils.degToRad(0);
            
            // Add bounding box for collision
            object.userData.boundingBox = new THREE.Box3().setFromObject(object);
            this.scene.add(object);
            this.japaneseTreeModel = object;
            console.log(`Loaded Japanese Tree for main platform`);
        };
        
        if (this.assetManager) {
            this.assetManager.loadFBX(
                'assets/models/Japanese_Tree.fbx',
                loadTreeModel,
                undefined,
                (error) => {
                    if (error.message.includes('Bark for tree.jpg')) {
                        console.warn('Warning: Bark for tree.jpg texture not found. Skipping texture application.');
                    } else {
                        console.error('Error loading Japanese_Tree.fbx:', error);
                    }
                }
            );
        } else { //if assetManager is not available
            const fbxLoader = new FBXLoader();
            fbxLoader.load(
                'assets/models/Japanese_Tree.fbx',
                loadTreeModel,
                undefined,
                (error) => {
                    if (error.message.includes('Bark for tree.jpg')) {
                        console.warn('Warning: Bark for tree.jpg texture not found. Skipping texture application.');
                    } else {
                        console.error('Error loading Japanese_Tree.fbx:', error);
                    }
                }
            );
        }
    }

    static create(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        return new RegularPlatform(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
    }
}
