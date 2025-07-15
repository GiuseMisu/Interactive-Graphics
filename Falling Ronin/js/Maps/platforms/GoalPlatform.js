import * as THREE from 'three';
import { BasePlatform } from './BasePlatform.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class GoalPlatform extends BasePlatform {
    constructor(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        super(scene, gameState, assetManager);
        
        this.platformName = platformName;
        this.platformId = platformId;
        
        // Create elegant white paved material with gold lines (no shine)
        const material = this.createElegantPavedMaterial(false);
        
        this.stoneLanterns = [];
        this.buddhistTemple = null; // Buddhist temple model reference
        this.platformEdges = [];
        
        // Create the mesh ->method is defined in BasePlatform
        this.createMesh(x, y, z, width, depth, material);

        // Add golden lines on each edge of the platform
        this.addGoldenEdges(x, y, z, width, depth);

        // Load two stone lanterns for the goal platform
        this.loadStoneLanterns(x, y, z, width, depth);

        // Place temple on the edge opposite the lanterns, with a small offset from the edge
        this.loadBuddhistTempleOnEdge(x, y, z, width, depth);

        // Set platform-specific user data -> method is defined in BasePlatform
        this.setUserData({
            isCheckpoint: false,
            isGoal: true,
            isTimedPlatform: false,
            platformName: platformName,
            platformId: platformId
        });
        
        // Add to scene -> method is defined in BasePlatform
        this.addToScene();
        
        // Register goal with game state
        if (this.gameState) {
            const goalPosition = { x: x, y: y + 0.25, z: z };
            this.gameState.setGoalPlatform(platformId, goalPosition, platformName);
            //console.log(`Registered goal platform - ID: ${platformId}, Name: ${platformName}, Position: x=${x}, y=${y + 0.25}, z=${z}`);
        }
        console.log(`Created Goal Platform - ID: ${platformId}, Name: ${platformName}, Position: x=${x}, y=${y}, z=${z}`);
    }

    static create(scene, x, y, z, width, depth, platformName = '', platformId = 0, gameState = null, assetManager = null) {
        return new GoalPlatform(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
    }    
    
    loadStoneLanterns(x, y, z, width, depth) {
        // Place lanterns on the long edge, perfectly symmetric with 6 units between them
        let positions;
        const lanternSpacing = 6; // Space between the two lanterns
        const offsetFromEdge = 0.7; // Distance from platform edge

        if (width >= depth) {
            // Long edge is along X axis - place lanterns symmetrically with 6 units between them
            const leftLanternX = x - lanternSpacing / 2;
            const rightLanternX = x + lanternSpacing / 2;
            positions = [
                { x: leftLanternX, z: z - depth / 2 + offsetFromEdge },
                { x: rightLanternX, z: z - depth / 2 + offsetFromEdge }
            ];
        } 
        else {
            // Long edge is along Z axis
            const topLanternZ = z - lanternSpacing / 2;
            const bottomLanternZ = z + lanternSpacing / 2;
            positions = [
                { x: x - width / 2 + offsetFromEdge, z: topLanternZ },
                { x: x - width / 2 + offsetFromEdge, z: bottomLanternZ }
            ];
        }
        
        positions.forEach((pos, idx) => {
            if (this.assetManager) {
                this.assetManager.loadOBJ(
                    'assets/models/Stone_Lantern_v2.obj',
                    (object) => {
                        object.scale.set(0.1, 0.1, 0.1);
                        // Align base to platform top (platform height is 0.5)
                        object.position.set(pos.x, y + 0.25, pos.z);
                        // Rotate to make lantern stand vertically 
                        object.rotation.x = THREE.MathUtils.degToRad(-90);
                        object.rotation.y = THREE.MathUtils.degToRad(0);
                        // Apply stone/rock material and shadow settings
                        const stoneMaterial = new THREE.MeshStandardMaterial({
                            color: 0x888888,
                            roughness: 0.85,
                            metalness: 0.15,
                            flatShading: true
                        });
                        object.traverse((child) => {
                            if (child.isMesh) {
                                child.material = stoneMaterial;
                                // Apply shadow settings based on current shadow mode
                                if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                                    const shadowMode = window.game.gameState.getShadowMode();
                                    if (shadowMode === 0) { // No shadows
                                        child.castShadow = false;
                                        child.receiveShadow = false;
                                    } else if (shadowMode === 1) { // All shadows
                                        child.castShadow = true;
                                        child.receiveShadow = true;
                                    } else { // Platforms only - lanterns are decorative objects, no shadows
                                        child.castShadow = false;
                                        child.receiveShadow = false;
                                    }
                                } else {
                                    // Default: lanterns don't cast shadows
                                    child.castShadow = false;
                                    child.receiveShadow = false;
                                }
                            }
                        });
                        // Add bounding box for collision
                        object.userData.boundingBox = new THREE.Box3().setFromObject(object);
                        this.scene.add(object);
                        this.stoneLanterns.push(object);
                        console.log(`Loaded Lantern ${idx + 1} for goal platform ${this.platformId}`);
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading Lantern_v2.obj:', error);
                    }
                );
            } 
            else {
                // Fallback to direct OBJ loader
                const objLoader = new OBJLoader();
                objLoader.load(
                    'assets/models/Stone_Lantern_v2.obj',
                    (object) => {
                        object.scale.set(0.1, 0.1, 0.1);
                        object.position.set(pos.x, y + 0.25, pos.z);
                        object.rotation.x = THREE.MathUtils.degToRad(-90);
                        object.rotation.y = THREE.MathUtils.degToRad(0);
                        // Apply stone/rock material and shadow settings
                        const stoneMaterial = new THREE.MeshStandardMaterial({
                            color: 0x888888,
                            roughness: 0.85,
                            metalness: 0.15,
                            flatShading: true
                        });
                        object.traverse((child) => {
                            if (child.isMesh) {
                                child.material = stoneMaterial;
                                // Apply shadow settings based on current shadow mode
                                if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                                    const shadowMode = window.game.gameState.getShadowMode();
                                    if (shadowMode === 0) { // No shadows
                                        child.castShadow = false;
                                        child.receiveShadow = false;
                                    } else if (shadowMode === 1) { // All shadows
                                        child.castShadow = true;
                                        child.receiveShadow = true;
                                    } else { // Platforms only - lanterns are decorative objects, no shadows
                                        child.castShadow = false;
                                        child.receiveShadow = false;
                                    }
                                } else {
                                    // Default: lanterns don't cast shadows
                                    child.castShadow = false;
                                    child.receiveShadow = false;
                                }
                            }
                        });
                        this.scene.add(object);
                        this.stoneLanterns.push(object);
                        console.log(`Loaded Lantern ${idx + 1} for goal platform ${this.platformId}`);
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading Lantern_v2.obj:', error);
                    }
                );
            }
        });
    }

    loadBuddhistTempleOnEdge(x, y, z, width, depth) {
        // temple on the edge opposite the lanterns, small offset from the edge
        const offset = 2; // Small offset from the edge
        let templeX = x;
        let templeZ = z;
        if (width >= depth) {
            templeZ = z + depth / 2 - offset;
        } else {
            templeX = x + width / 2 - offset;
        }
        const templePosition = {
            x: templeX,
            y: y + 0.25,
            z: templeZ
        };

        const loadTempleModel = (object) => {
            if (!object.children || object.children.length === 0) {
                console.error(`FBX object has no children for platform ${this.platformId}`);
                return;
            }
            const templeMesh = object.children[0];
            this.buddhistTemple = new THREE.Group();
            this.buddhistTemple.add(templeMesh.clone());
            this.buddhistTemple.scale.set(0.0085, 0.0085, 0.0085);
            const box = new THREE.Box3().setFromObject(this.buddhistTemple);
            const center = box.getCenter(new THREE.Vector3());
            // Place temple base directly on platform surface, aligned to edge
            this.buddhistTemple.position.set(
                templePosition.x - center.x,
                templePosition.y - box.min.y,
                templePosition.z - center.z
            );
            this.buddhistTemple.rotation.set(0, 0, 0);
            // Add bounding box for collision
            this.buddhistTemple.userData.boundingBox = new THREE.Box3().setFromObject(this.buddhistTemple);
            this.buddhistTemple.traverse((child) => {
                if (child.isMesh) {
                    // Apply shadow settings based on current shadow mode
                    if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                        const shadowMode = window.game.gameState.getShadowMode();
                        if (shadowMode === 0) { // No shadows
                            child.castShadow = false;
                            child.receiveShadow = false;
                        } else if (shadowMode === 1) { // All shadows
                            child.castShadow = true;
                            child.receiveShadow = true;
                        } else { // Platforms only - temple is decorative object, no shadows
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    } else {
                        // Default: temple doesn't cast shadows
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                    if (child.material) {
                        child.material.roughness = 0.7;
                        child.material.metalness = 0.1;
                    }
                }
            });
            this.scene.add(this.buddhistTemple);
            console.log(`Successfully loaded Buddhist Temple for goal platform ${this.platformId} at edge position`);
        };
        const fbxLoader = new FBXLoader();
        fbxLoader.load(
            'assets/models/jp_building.fbx',
            loadTempleModel,
            undefined,
            (error) => {
                console.error(`Error loading Buddhist Temple FBX for platform ${this.platformId}:`, error);
            }
        );
    }

    removeFromScene() {
        super.removeFromScene();
        // Remove lanterns
        this.stoneLanterns.forEach(lantern => {
            this.scene.remove(lantern);
        });
        this.stoneLanterns = [];

        // Remove Buddhist temple
        if (this.buddhistTemple) {
            this.scene.remove(this.buddhistTemple);
            this.buddhistTemple = null;
        }

        // Remove golden edge meshes if they exist
        if (this.platformEdges && Array.isArray(this.platformEdges)) {
            this.platformEdges.forEach(edge => {
                if (edge && edge.parent === this.scene) {
                    this.scene.remove(edge);
                }
            });
            this.platformEdges = [];
        }
    }

    createElegantPavedMaterial(shiny = false) {
        // Create a canvas for the texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        // tile properties 
        const tileSize = 48; // Bigger tiles
        const groutWidth = 2; // Gold lines
        const tilesPerRow = Math.floor(canvas.width / tileSize);
        const tilesPerCol = Math.floor(canvas.height / tileSize);
        // background with gold (color)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let row = 0; row < tilesPerCol; row++) {
            for (let col = 0; col < tilesPerRow; col++) {
                const x = col * tileSize + groutWidth;
                const y = row * tileSize + groutWidth;
                const width = tileSize - groutWidth * 2;
                const height = tileSize - groutWidth * 2;
                // Create pure white marble base with very subtle variations
                const variation = Math.random() * 0.02; // Reduced variation for whiter appearance
                const whiteValue = Math.floor(255 * (0.98 + variation)); // whiter
                ctx.fillStyle = `rgb(${whiteValue}, ${whiteValue}, ${whiteValue})`;
                ctx.fillRect(x, y, width, height);
                // no shine effect: no highlight
                ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
                ctx.fillRect(x + width - 1, y + 1, 1, height - 1);
                ctx.fillRect(x + 1, y + height - 1, width - 1, 1);
            }
        }
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); // Repeat the pattern 4 times in each direction
        // Create material with the custom texture - marble-like properties
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7, // High roughness, no shine
            metalness: 0.0, // No metallic reflection
            normalScale: new THREE.Vector2(0.3, 0.3)
        });
        return material;
    }

    addGoldenEdges(x, y, z, width, depth) {
        // Add golden planes with each lateral face of the platform
        const edgeThickness = 0.01; // Very thin
        const edgeHeight = 0.5; // Match platform height
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
        // Front (positive Z)
        const front = new THREE.Mesh(
            new THREE.PlaneGeometry(width, edgeHeight),
            edgeMaterial
        );
        front.position.set(x, y + edgeHeight / 2 - 0.22, z + depth / 2 + edgeThickness / 2);
        front.rotation.x = 0;
        front.rotation.y = 0;
        this.scene.add(front);
        this.platformEdges.push(front);
        // Back (negative Z)
        const back = new THREE.Mesh(
            new THREE.PlaneGeometry(width, edgeHeight),
            edgeMaterial
        );
        back.position.set(x, y + edgeHeight / 2 - 0.22, z - depth / 2 - edgeThickness / 2);
        back.rotation.y = Math.PI;
        this.scene.add(back);
        this.platformEdges.push(back);
        // Right (positive X)
        const right = new THREE.Mesh(
            new THREE.PlaneGeometry(depth, edgeHeight),
            edgeMaterial
        );
        right.position.set(x + width / 2 + edgeThickness / 2, y + edgeHeight / 2 - 0.22, z);
        right.rotation.y = -Math.PI / 2;
        this.scene.add(right);
        this.platformEdges.push(right);
        // Left (negative X)
        const left = new THREE.Mesh(
            new THREE.PlaneGeometry(depth, edgeHeight),
            edgeMaterial
        );
        left.position.set(x - width / 2 - edgeThickness / 2, y + edgeHeight / 2 - 0.22, z);
        left.rotation.y = Math.PI / 2;
        this.scene.add(left);
        this.platformEdges.push(left);
    }
}
