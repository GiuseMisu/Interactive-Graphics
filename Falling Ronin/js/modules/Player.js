import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class Player {
    constructor(scene, assetManager = null) {
        this.scene = scene;
        this.assetManager = assetManager; // in order to load the player model

        //ANIMATION PROPERTIES
        this.onGround = true;
        this.isDoubleJumping = false;
        this.canDoubleJump = false;    
        this.sprinting = false; // Added for sprint state    
        this.animationState = 'idle';
        this.animationTime = 0;
        this.clock = new THREE.Clock();

        this.moveSpeed = 0.1;
        this.sprintSpeed = 0.25;
        this.jumpStrength = 0.22;
        this.currentSpeed = this.moveSpeed;
        this.sprintTimeout = null; // Added for sprint duration
        this.animationSpeedMultiplier = 1.1; // Default animation speed       
       
        // Physics properties
        this.velocityY = 0;
        this.gravity = -0.01; // low gravity to allow big jumps for the player

         
        this.platformManager = null; // Will be set by the game
        this.playerBoundingBox = new THREE.Box3();
        this.playerSize = { width: 0.5, height: 1.8, depth: 0.5 }; // Player dimensions
        this.playerFeetOffset = 1.75; // Reduced from 0.9 - adjust based on your model
        
        // Checkpoint system
        this.gameState = null; // Will be set by the game
        this.lastCheckpointCheck = 0; // Prevent spam checkpoint detection
        this.checkpointStayTimer = 0; // Time spent on checkpoint platform
        this.checkpointStayRequired = 0.01; // Seconds required to activate checkpoint (0.01 second)

        // Goal system
        this.goalStayTimer = 0; // Time spent on goal platform
        this.goalStayRequired = 0.2; // Seconds required to activate goal

        // Barrel collision properties
        this.lastBarrelCollisionTime = 0; // Prevent spam collision detection
        this.lastSpacePress = 0; // Already present, can be used for double tap if needed, though current jump logic handles it
        
        // Death tracking
        this.gameUI = null; // Will be set by the game to reference UI for death counter
        this.lastDeathTime = 0; // Prevent rapid death counting
        this.respawnThreshold = -10; // Y position below which player respawns
        
        // Double jump targets: right arm up from front, left leg forward and bent
        this.doubleJumpRightArmTargetZ = -Math.PI / 2.5; // Target Z rotation for right arm forward raise (more upward)
        this.doubleJumpLeftArmTargetZ = Math.PI / 6; // Target Z rotation for left arm (small backward movement)
        this.doubleJumpLeftLegTargetX = -Math.PI / 4; // Target X rotation for left upper leg forward
        this.doubleJumpLeftKneeTargetX = -Math.PI / 3; // Target X rotation for left knee bend (opposite direction)
        this.doubleJumpRightLegTargetX = Math.PI / 8; // Target X rotation for right upper leg (slight backward movement)
        
        // Normal jump targets: realistic leg movement without arm raising
        this.normalJumpLeftLegTargetX = -Math.PI / 6; // Target X rotation for left upper leg forward (less than double jump)
        this.normalJumpLeftKneeTargetX = -Math.PI / 4; // Target X rotation for left knee bend (less than double jump)
        this.normalJumpRightLegTargetX = Math.PI / 12; // Target X rotation for right upper leg (slight backward movement)
        this.normalJumpLeftArmTargetZ = Math.PI / 12; // Target Z rotation for left arm (small movement)
        this.normalJumpRightArmTargetZ = -Math.PI / 12; // Target Z rotation for right arm (small forward movement)

        this.model = null;
        this.bones = {};
        this.boneInitialRotations = {}; // Store initial bone rotations
        
        this.boneNames = {
            head: 'mixamorigHead',
            spine: 'mixamorigSpine',
            hips: 'mixamorigHips',
            leftArm: 'mixamorigLeftArm',
            leftForeArm: 'mixamorigLeftForeArm',
            rightArm: 'mixamorigRightArm',
            rightForeArm: 'mixamorigRightForeArm',
            leftUpLeg: 'mixamorigLeftUpLeg',
            leftLeg: 'mixamorigLeftLeg',
            rightUpLeg: 'mixamorigRightUpLeg',
            rightLeg: 'mixamorigRightLeg',
        };

        this.loadModel();
    }

    //====================== MODEL & BONES ======================
    loadModel() {
        const loadPlayerModel = (object) => {
            this.model = object;
            this.model.scale.set(0.02, 0.02, 0.02);
            // Shadow settings are handled by ShadowManager via AssetManager
            this.model.position.set(0, 0.25 + this.playerFeetOffset, 0); // Platform top (0.25) + feet offset
            // Ensure physics state is correct from the start
            this.velocityY = 0;
            this.onGround = true;
            this.scene.add(this.model);
            this.setupBones();

            //this.logAllBones(); // Commented out to reduce console spam
            
            if (window.cameraController) {
                window.cameraController.target = this.model;
            }
            // Model loaded successfully
            this.respawnPlayer();
            
        };
        
        if (this.assetManager) {
            this.assetManager.loadFBX(
                'assets/models/ninja.fbx',
                loadPlayerModel,
                undefined,
                (error) => { console.error('FBX loading error:', error); }
            );
        } 
        else { //if assetManager is not available
            console.warn("[PlayerModel] WARNING: AssetManager not available, using fallback FBXLoader.");
            const fbxLoader = new FBXLoader();
            fbxLoader.load(
                'assets/models/ninja.fbx',
                (object) => {
                    loadPlayerModel(object);
                },
                undefined,
                (error) => { console.error('FBX loading error:', error); }
            );
        }
    }

    logAllBones() {
        if (!this.model) return;
        let boneCount = 0;
        function traverseBone(bone, depth = 0) {     
            if (bone.isBone) {
                boneCount++;
                const indent = '  '.repeat(depth);
                console.log(`${indent}- ${bone.name}`); 
                if (bone.children && bone.children.length > 0) {
                    bone.children.forEach(child => traverseBone(child, depth + 1));
                }
            } else if (bone.children && bone.children.length > 0) {
                bone.children.forEach(child => traverseBone(child, depth));
            }
        }
        traverseBone(this.model, 0);
    }

    setupBones() {
        if (!this.model) return;
        this.model.traverse((child) => {
            for (const key in this.boneNames) {
                if (child.name === this.boneNames[key]) {
                    this.bones[key] = child;
                    // Store initial rotation as a clone
                    this.boneInitialRotations[key] = child.rotation.clone();
                }
            }
        });

        // "arms down" pose as the new initial state for arms and forearms
        const armsDownRotationX = Math.PI / 4; 

        if (this.boneInitialRotations.leftArm) {
            this.boneInitialRotations.leftArm.x = armsDownRotationX;
            this.boneInitialRotations.leftArm.y = -Math.PI / 25; 
            this.boneInitialRotations.leftArm.z = 0; 
        }
        if (this.boneInitialRotations.rightArm) {
            this.boneInitialRotations.rightArm.x = armsDownRotationX;
            this.boneInitialRotations.rightArm.y = Math.PI / 25;
            this.boneInitialRotations.rightArm.z = 0;
        }

        // Ensure forearms are straight relative to upper arms
        if (this.boneInitialRotations.leftForeArm) {
            this.boneInitialRotations.leftForeArm.x = 0.75; // Small bend
            this.boneInitialRotations.leftForeArm.y = 0;
            this.boneInitialRotations.leftForeArm.z = 0;
        }
        if (this.boneInitialRotations.rightForeArm) {
            this.boneInitialRotations.rightForeArm.x = 0.75; // Small bend
            this.boneInitialRotations.rightForeArm.y = 0;
            this.boneInitialRotations.rightForeArm.z = 0;
        }

        //console.log("Stored bones for animation (idle pose adjusted):", this.bones);
        if (!this.bones.hips) {
            console.warn("WARNING: 'mixamorigHips' bone not found. This could be the cause of leg issues.");
        }

        // Visualize axes for arm bones
        //keep might be usefull for other bones
       /*  const armBoneKeys = ['rightArm', 'rightForeArm'];
        armBoneKeys.forEach(key => {
            if (this.bones[key]) {
                // Remove previous helpers if any
                this.bones[key].children
                    .filter(child => child.type === 'AxesHelper')
                    .forEach(child => this.bones[key].remove(child));
                // Add new helper
                // color X red, Y green, Z blue
                const axesHelper = new THREE.AxesHelper(75); // Larger size for visibility
                axesHelper.name = 'AxesHelper_' + key;
                this.bones[key].add(axesHelper);
                // Optionally, add to scene for debugging (uncomment if needed)
                // this.scene.add(axesHelper);
            } else {
                console.warn(`Bone '${key}' not found for axes visualization.`);
            }
        }); */
    }

    resetBonesToInitial() {
        for (const boneKey in this.bones) {
            const bone = this.bones[boneKey];
            const initial = this.boneInitialRotations[boneKey];
            if (bone && initial) {
                bone.rotation.copy(initial);
            }
        }
    }
 

    //====================== MOVEMENT & PHYSICS ======================
    update(keys, deltaTime) {
        //keys are the array of keys pressed, so if a key is pressed it will be true
        //deltaTime is the time since the last frame

        if (!this.model) return;

        const animationDeltaTime = this.clock.getDelta(); //time since last frame
        
        //increasing value needed to regulat the animation (used as input of sin-cos for animation)
        this.animationTime += animationDeltaTime * 5 * this.animationSpeedMultiplier; //when sprinting animationSpeedMultiplier is increased

        // Store previous position for collision rollback
        const previousPosition = this.model.position.clone();

        // Handle rotation
        const rotateSpeed = 0.05;
        //if keys a or d are pressed (so place to True)
        if (keys.a) this.model.rotation.y += rotateSpeed; //increase rotation = to the left
        if (keys.d) this.model.rotation.y -= rotateSpeed; //decrease rotation = to the right

        // Handle movement with collision detection
        let moveDir = 0;
        // the direction is understood as forward/backward based on negative or positive moveDir value
        if (keys.w) moveDir += 1;
        if (keys.s) moveDir -= 1;

        if (moveDir !== 0) {
            const angle = this.model.rotation.y; // previously increased by rotateSpeed

            //sin and cos needed in order to move the player in the direction it is facing --> otherwise unnatural
            //current speed changes between moveSpeed (0.1) and sprintSpeed (0.25) based on sprinting_state
            const moveX = Math.sin(angle) * this.currentSpeed * moveDir;
            const moveZ = Math.cos(angle) * this.currentSpeed * moveDir;

            // Store current position before attempting movement
            const originalX = this.model.position.x;
            const originalZ = this.model.position.z;

            // Try X movement so update to the position it should go, if collision detected return to original
            this.model.position.x += moveX;
            if (this.checkWallCollision() || this.checkImportedModelCollision()) {
                this.model.position.x = originalX; // Rollback X movement for walls or imported models
            } 

            // Try Z movement
            this.model.position.z += moveZ;
            if (this.checkWallCollision() || this.checkImportedModelCollision()) {
                this.model.position.z = originalZ; // Rollback Z movement for walls or imported models
            }

            // Try Y movement (jumping)
            this.model.position.y += this.velocityY;

            // Y-axis collision resolution with imported models ---
            const yCorrection = this.checkImportedModelCollisionY(previousPosition.y);
            if (yCorrection !== null) {
                this.model.position.y = yCorrection;
                this.velocityY = 0;
            }
        }

        // Animation state logic
        if (!this.onGround) {
            this.animationState = 'jumping';
        } else if (keys.w || keys.s) {
            this.animationState = 'running';
        } else {
            this.animationState = 'idle';
        }
        this.applyCurrentAnimation(animationDeltaTime);

        // Physics: Apply gravity and handle vertical movement
        this.applyPhysics(deltaTime);

        // Check for checkpoint detection
        this.checkCheckpoints(deltaTime);

        // Check for goal detection
        this.checkGoal(deltaTime);
    }


    applyPhysics(deltaTime) {
        if (!this.model) return;

        // Store previous position for potential rollback
        const previousY = this.model.position.y;
        
        // Apply gravity
        this.velocityY += this.gravity; 
        
        // Apply vertical velocity, UPDATE Y position
        this.model.position.y += this.velocityY;

        //was called also iside the update function, but it moved
        const yCorrection = this.checkImportedModelCollisionY(previousY);
        if (yCorrection !== null) {
            this.model.position.y = yCorrection;
            this.velocityY = 0;
        }
        
        // Check if player is trying to fall through a platform from above
        if (this.velocityY < 0) { // Player is falling
            const wouldCollideFromAbove = this.checkVerticalCollisionFromAbove(previousY);
            if (wouldCollideFromAbove) {
                // Stop at the platform surface
                const platformTop = wouldCollideFromAbove;
                this.model.position.y = platformTop + this.playerFeetOffset;
                this.velocityY = 0;
                
                const justLanded = !this.onGround;
                this.onGround = true;
                this.canDoubleJump = false;

                // Handle double jump state reset after landing
                if (justLanded) {
                    this.isDoubleJumping = false;
                }
                return; // Early return to prevent further processing
            }
        }
        
        // Check if player is trying to jump through a platform from below
        if (this.velocityY > 0) { // Player is moving upward
            const wouldCollideFromBelow = this.checkVerticalCollisionFromBelow(previousY);
            if (wouldCollideFromBelow) {
                // Stop at the platform bottom and reverse velocity
                const platformBottom = wouldCollideFromBelow;
                // Calculate the full bounding box height
                const bboxHeight = this.playerBoundingBox.getSize(new THREE.Vector3()).y;
                // Place the player so the top of the bounding box is just below the platform
                this.model.position.y = platformBottom + this.playerFeetOffset - bboxHeight;
                this.velocityY = 0; // Stop upward movement
                return; // Early return to prevent further processing
            }
        }
        
        // Finds the highest platform the player is currently standing on (for gravity/landing).
        const platformHeight = this.getHighestStandingPlatformY();
        
        //===============================================
        //LAST CHECK FOR FALLING AND LANDING ON PLATFORM
        //check if player's feet are at or below the top of the highest platform they could be standing on 
        if (this.model.position.y - this.playerFeetOffset <= platformHeight + 0.01) { // Small tolerance 
            
            // Snaps the player's Y position to exactly on top of the platform
            const correctY = platformHeight + this.playerFeetOffset;
            
            // Only reposition if we're not already very close to the correct position
            if (Math.abs(this.model.position.y - correctY) > 0.02) {
                this.model.position.y = correctY;
            }
            
            // Only reset vertical velocity if moving downward
            if (this.velocityY <= 0) {
                this.velocityY = 0;
                const justLanded = !this.onGround;
                this.onGround = true;
                this.canDoubleJump = false;

                // Handle double jump state reset after landing
                if (justLanded) {
                    this.isDoubleJumping = false;
                }
            }
        } 
        else {
            // Player is falling or jumping - not on any platform
            this.onGround = false;
        }

        // Prevent player from falling through the world
        if (this.model.position.y < this.respawnThreshold) {
            this.playerDied('falling into void');
        }
    }

    //====================== CHECKPOINTS & GOALS ======================
    checkCheckpoints(deltaTime) {
        if (!this.gameState || !this.platformManager) return;
        
        const currentTime = Date.now();
        
        // Don't check too frequently
        if (currentTime - this.lastCheckpointCheck < 100) {
            return;
        }
        this.lastCheckpointCheck = currentTime;
        
        // Check if player is on any checkpoint platform
        let onCheckpointPlatform = false;
        const platforms = this.platformManager.getAllPlatforms();
        
        for (const platform of platforms) {
            //find the checkpoint platform
            if (platform.userData && platform.userData.isCheckpoint) {
                // More strict check: ensure player is ON the platform, not just horizontally aligned
                const platformTop = platform.position.y + (platform.geometry.parameters.height / 2);
                const playerFeet = this.getPlayerFeetPosition().y;

                if (this.checkPlayerPlatformCollision_X_Z(platform) && this.onGround && Math.abs(playerFeet - platformTop) < 0.1) {
                    onCheckpointPlatform = true;
                    this.checkpointStayTimer += deltaTime;
                    
                    // If player has stayed on checkpoint long enough, activate it
                    if (this.checkpointStayTimer >= this.checkpointStayRequired) {
                        const platformId = platform.userData.platformId;

                        // function to activate checkpoint in game state
                        const wasNewCheckpoint = this.gameState.activateCheckpoint(platformId);
                        
                        // Only update UI if this is a new checkpoint activation
                        if (wasNewCheckpoint && this.gameUI) {
                            // Update UI to show new checkpoint with animation
                            this.gameUI.updateCheckpointStatus(true, platform.userData.platformName);
                        }
                        this.checkpointStayTimer = 0; // Reset timer
                    } 
                    break; // Found the checkpoint platform player is on
                }
            }
        }
        // Reset timer if not on any checkpoint platform
        if (!onCheckpointPlatform) {
            this.checkpointStayTimer = 0;
        }
    }
    
    checkGoal(deltaTime) {
        if (!this.gameState || !this.platformManager || this.gameState.isLevelCompleted()) return;

        let onGoalPlatform = false;
        const platforms = this.platformManager.getAllPlatforms();

        for (const platform of platforms) {
            if (platform.userData && platform.userData.isGoal) {
                // More strict check: ensure player is ON the platform, not just horizontally aligned
                const platformTop = platform.position.y + (platform.geometry.parameters.height / 2);
                const playerFeet = this.getPlayerFeetPosition().y;

                if (this.checkPlayerPlatformCollision_X_Z(platform) && this.onGround && Math.abs(playerFeet - platformTop) < 0.1) {
                    onGoalPlatform = true;
                    this.goalStayTimer += deltaTime;

                    // If player has stayed on the goal long enough, complete the level
                    if (this.goalStayTimer >= this.goalStayRequired) {
                        this.gameState.completeLevel();

                        if (this.gameUI) {
                            this.gameUI.showLevelCompleteScreen(this.gameState.getDeathCount());
                        }

                        console.log(`LEVEL COMPLETED! Player reached: ${platform.userData.platformName}`);
                    }
                    break; // Exit loop once goal platform is found
                }
            }
        }

        // If player is not on the goal platform, reset the timer
        if (!onGoalPlatform) {
            this.goalStayTimer = 0;
        }
    }    
    
    //====================== RESPAWN FUNCTIONS ======================

    respawnPlayer() {
        if (!this.model) return;
        
        let spawnX, spawnZ, correctSpawnY;
        
        // Check if player has an active checkpoint
        if (this.gameState && this.gameState.hasCheckpoint) {
            // Get the active checkpoint position could be main platform or a specific checkpoint
            // getActiveCheckpointPosition method in GameState, returns the position of the LAST active checkpoint
            const checkpointPos = this.gameState.getActiveCheckpointPosition();
            if (checkpointPos) {
                spawnX = checkpointPos.x;
                spawnZ = checkpointPos.z;
                correctSpawnY = checkpointPos.y + this.playerFeetOffset; // checkpointPos.y is already platform surface
                
                // Force position change and reset all states
                this.model.position.set(spawnX, correctSpawnY, spawnZ);
                this.velocityY = 0;
                this.onGround = true;
                this.canDoubleJump = false;
                this.isDoubleJumping = false;
                this.animationState = 'idle';
                
                // Reset collision cooldowns to prevent immediate re-death
                this.lastBarrelCollisionTime = Date.now();
                this.lastDeathTime = Date.now();
                
                // Update UI to show checkpoint status without animation
                if (this.gameUI) {
                    const checkpointName = this.gameState.getActiveCheckpointName();
                    this.gameUI.updateCheckpointStatus(true, checkpointName, false);
                }
                // Reset camera to third-person mode if it's currently in orbit mode
                if (window.cameraController && window.cameraController.orbitMode) {
                    window.cameraController.toggleCameraMode();
                }

                // Reset timed platforms when respawning --> FUNCTION OF MAPTOOLS that calls reset() of TimedPlatform
                this.resetTimedPlatforms();
                return;
            }
        }
        // No checkpoint, respawn at main platform
        this.respawnAtMainPlatform();
    }
    
    respawnAtMainPlatform() {
        // Always respawn at the center of the main platform (0, 0) to avoid loops
        const spawnX = 0;
        const spawnZ = 0;
        
        // Find the main platform (should be at position 0,0,0)
        let mainPlatform = null;
        if (this.platformManager) {
            const platforms = this.platformManager.getAllPlatforms();
            for (const platform of platforms) {
                // Look for the main platform
                if (Math.abs(platform.position.x) < 1 && Math.abs(platform.position.z) < 1) {
                    mainPlatform = platform;
                    break;
                }
            }
        }
        
        let correctSpawnY;
        if (mainPlatform) {
            const platTop = mainPlatform.position.y + (mainPlatform.geometry.parameters.height / 2);
            correctSpawnY = platTop + this.playerFeetOffset;
        } 
        else {
            // Fallback to known main platform height
            correctSpawnY = 0.25 + this.playerFeetOffset;
        }
        
        // Force position change and reset all states
        this.model.position.set(spawnX, correctSpawnY, spawnZ);
        this.velocityY = 0;
        this.onGround = true;
        this.canDoubleJump = false;
        this.isDoubleJumping = false;
        this.animationState = 'idle';
        
        // Reset collision cooldowns to prevent immediate re-death
        this.lastBarrelCollisionTime = Date.now();
        this.lastDeathTime = Date.now();
        
        console.log(`Player respawned at main platform: (${spawnX.toFixed(2)}, ${correctSpawnY.toFixed(2)}, ${spawnZ.toFixed(2)})`);
        
        // Reset camera to third-person mode if it's currently in orbit mode
        if (window.cameraController && window.cameraController.orbitMode) {
            window.cameraController.toggleCameraMode();
        }
        // Reset timed platforms when respawning
        this.resetTimedPlatforms();
    }

    // Method to reset timed platforms when player respawns
    resetTimedPlatforms() {
        if (this.platformManager && this.platformManager.resetAllTimedPlatforms) {
            this.platformManager.resetAllTimedPlatforms();
        }
    }
    
    //====================== MANAGERS & STATE ======================

    //reference to the class MapManager initialized in Game.js so that you have access to the platforms and functionalities
    setPlatformManager(platformManager) {
        this.platformManager = platformManager;
    }
    
    setGameState(gameState) {
        this.gameState = gameState;
    }

    //====================== ANIMATION ======================
    applyCurrentAnimation(deltaTime) {
        if (Object.keys(this.bones).length === 0) return;
        switch (this.animationState) {
            case 'running':
                this.animateRun();
                break;
            case 'jumping':
                this.animateJump(deltaTime);
                break;
            case 'idle':
            default:
                this.animateIdle();
                break;
        }
    }

    animateRun() {
        this.resetBonesToInitial();
        const t = this.animationTime;
        const animSpeed = 1.55;

         // 1. ARM ANIMATION
         if (this.bones.rightArm) {
            //x angolo fra lat muscle e braccio
            this.bones.rightArm.rotation.x = 0.9 + Math.cos(t * animSpeed) * 0.1; // Swing between 0.9 and 1.0
            this.bones.rightArm.rotation.z = this.boneInitialRotations.rightArm.z; //1.05; 
            this.bones.rightArm.rotation.y = 1.25 + Math.cos(t * animSpeed) * 0.40;

            if (this.bones.rightForeArm && this.boneInitialRotations.rightForeArm) {
                // Increased base bend and amplitude for more elbow flex
                const animationBaseForeArmBend = 1.15 + Math.cos(t * animSpeed) * 1.0; // Increased from 1.05 and 0.75
                const foreArmDynamicBendAmplitude = 0.35; // Increased from 0.25

                const rightArmSwingFactor = Math.cos(t * animSpeed + Math.PI);

                // Only animate the bend (rotation.x), keep y and z at initial to avoid palm up
                this.bones.rightForeArm.rotation.x = animationBaseForeArmBend - rightArmSwingFactor * foreArmDynamicBendAmplitude;
                this.bones.rightForeArm.rotation.y = - 1.2 + Math.cos(t * animSpeed) * 0.2; //pal of the hand parallel to the body (inside)
                this.bones.rightForeArm.rotation.z = this.boneInitialRotations.rightForeArm.z;
            } 
        }  

        if (this.bones.leftArm) {
            // Phase offset of Math.PI makes left arm opposite to right arm
            this.bones.leftArm.rotation.x = 0.9 + Math.cos(t * animSpeed + Math.PI) * 0.1; // Opposite swing to right arm
            this.bones.leftArm.rotation.z = this.boneInitialRotations.leftArm.z;
            this.bones.leftArm.rotation.y = -1.25 + Math.cos(t * animSpeed + Math.PI) * 0.40; // Negative Y for left side

            if (this.bones.leftForeArm && this.boneInitialRotations.leftForeArm) {
                // Same animation parameters as right arm but with phase offset
                const animationBaseForeArmBend = 1.15 + Math.cos(t * animSpeed + Math.PI) * 1.0;
                const foreArmDynamicBendAmplitude = 0.35;

                const leftArmSwingFactor = Math.cos(t * animSpeed); // No additional phase here since we already offset the main animation

                // Left forearm animation
                this.bones.leftForeArm.rotation.x = animationBaseForeArmBend - leftArmSwingFactor * foreArmDynamicBendAmplitude;
                this.bones.leftForeArm.rotation.y = 1.2 + Math.cos(t * animSpeed + Math.PI) * 0.2; // Opposite direction from right arm
                this.bones.leftForeArm.rotation.z = this.boneInitialRotations.leftForeArm.z;
            }
        }
         
        // 2. LEG ANIMATION
        const legSwingAmplitude = 0.65;
        // swing for each leg
        const leftLegSwing = Math.sin(t * animSpeed) * legSwingAmplitude;
        const rightLegSwing = Math.sin(t * animSpeed + Math.PI) * legSwingAmplitude;

        // Parameters for leg animation
        const maxKneeBendAngle = Math.PI / 2.2; 
        const maxFootTiltAngle = Math.PI / 9;   

        // Left Leg Animation
        if (this.bones.leftUpLeg) {
            this.bones.leftUpLeg.rotation.x = leftLegSwing;

            if (this.bones.leftLeg) {
            // Knee bends more as thigh moves forward, straightens as it moves backward
            const normalizedThighForwardness = (leftLegSwing / legSwingAmplitude + 1) / 2;
            this.bones.leftLeg.rotation.x = -normalizedThighForwardness * maxKneeBendAngle;
            }

            if (this.bones.leftFoot) {
            // Foot tilts down when leg is back, up when leg is forward
            this.bones.leftFoot.rotation.x = -(leftLegSwing / legSwingAmplitude) * maxFootTiltAngle;
            }
        }

        // Right Leg Animation (mirrors the left leg)
        if (this.bones.rightUpLeg) {
            this.bones.rightUpLeg.rotation.x = rightLegSwing;

            if (this.bones.rightLeg) {
            const normalizedThighForwardness = (rightLegSwing / legSwingAmplitude + 1) / 2;
            this.bones.rightLeg.rotation.x = -normalizedThighForwardness * maxKneeBendAngle;
            }

            if (this.bones.rightFoot) {
            this.bones.rightFoot.rotation.x = -(rightLegSwing / legSwingAmplitude) * maxFootTiltAngle;
            }
        }

        // 3. BODY MOVEMENT
        if (this.bones.hips) {
            // Slight bounce
            this.bones.hips.position.y = Math.abs(Math.sin(t * animSpeed)) * 15;
            // Forward lean
            this.bones.hips.rotation.x = 0.1 + Math.sin(t * animSpeed) * 0.1;
            // Side to side sway
            this.bones.hips.rotation.z = Math.sin(t * animSpeed) * 0.1;
        }        // 4. SPINE ROTATION
        if (this.bones.spine) {
            this.bones.spine.rotation.y = Math.sin(t * animSpeed) * 0.1;
        }
    }

    animateJump(deltaTime) {
        const boneLerpFactor = 0.15; // For non-primary bones to return to initial
        const armLerpSpeed = 0.1; // How quickly the arms move for jump animations

        if (this.isDoubleJumping) {
            // --- Double Jump: (Right arm up from front, Left leg forward and knee bent) ---
            
            // Right arm up animation (from the front using Z rotation) 
            if (this.bones.rightArm) {
                const targetRightArmZ = this.doubleJumpRightArmTargetZ;
                this.bones.rightArm.rotation.z = THREE.MathUtils.lerp(this.bones.rightArm.rotation.z, targetRightArmZ, armLerpSpeed);
                // Keep X rotation at initial position
                const initialX = this.boneInitialRotations.rightArm ? this.boneInitialRotations.rightArm.x : 0;
                this.bones.rightArm.rotation.x = THREE.MathUtils.lerp(this.bones.rightArm.rotation.x, initialX, armLerpSpeed);
            }
            
            // Left arm subtle movement for balance
            if (this.bones.leftArm) {
                const targetLeftArmZ = this.doubleJumpLeftArmTargetZ;
                this.bones.leftArm.rotation.z = THREE.MathUtils.lerp(this.bones.leftArm.rotation.z, targetLeftArmZ, armLerpSpeed);
                // Keep X rotation at initial position
                const initialX = this.boneInitialRotations.leftArm ? this.boneInitialRotations.leftArm.x : 0;
                this.bones.leftArm.rotation.x = THREE.MathUtils.lerp(this.bones.leftArm.rotation.x, initialX, armLerpSpeed);
            }
            
            // Left leg forward and knee bent animation (main leg)
            if (this.bones.leftUpLeg) {
                const targetLeftLegX = this.doubleJumpLeftLegTargetX;
                this.bones.leftUpLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftUpLeg.rotation.x, targetLeftLegX, armLerpSpeed);
            }
            
            // Left knee bent (lower leg) - now bending in opposite direction for more natural look
            if (this.bones.leftLeg) {
                const targetLeftKneeX = this.doubleJumpLeftKneeTargetX;
                this.bones.leftLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftLeg.rotation.x, targetLeftKneeX, armLerpSpeed);
            }
            
            // Right leg slight backward movement for balance and less static look
            if (this.bones.rightUpLeg) {
                const targetRightLegX = this.doubleJumpRightLegTargetX;
                this.bones.rightUpLeg.rotation.x = THREE.MathUtils.lerp(this.bones.rightUpLeg.rotation.x, targetRightLegX, armLerpSpeed);
            }

            // ALL THE other bones smoothly return to their initial pose
            for (const boneKey in this.bones) {
                if (boneKey === 'rightArm' || boneKey === 'leftArm' || boneKey === 'leftUpLeg' || boneKey === 'leftLeg' || boneKey === 'rightUpLeg') continue; // Skip the animated bones
                const bone = this.bones[boneKey];
                const initialRotation = this.boneInitialRotations[boneKey];
                if (bone && initialRotation) {
                    bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initialRotation.x, boneLerpFactor);
                    bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initialRotation.y, boneLerpFactor);
                    bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, initialRotation.z, boneLerpFactor);
                }
            }
        } 
        
        else {
            // --- Single Jump: leg and arm movement
            
            // Left arm subtle movement (small backward swing)
            if (this.bones.leftArm) {
                const targetLeftArmZ = this.normalJumpLeftArmTargetZ;
                this.bones.leftArm.rotation.z = THREE.MathUtils.lerp(this.bones.leftArm.rotation.z, targetLeftArmZ, armLerpSpeed);
                // Keep X rotation at initial position
                const initialX = this.boneInitialRotations.leftArm ? this.boneInitialRotations.leftArm.x : 0;
                this.bones.leftArm.rotation.x = THREE.MathUtils.lerp(this.bones.leftArm.rotation.x, initialX, armLerpSpeed);
            }
            
            // Right arm subtle movement (small forward swing)
            if (this.bones.rightArm) {
                const targetRightArmZ = this.normalJumpRightArmTargetZ;
                this.bones.rightArm.rotation.z = THREE.MathUtils.lerp(this.bones.rightArm.rotation.z, targetRightArmZ, armLerpSpeed);
                // Keep X rotation at initial position
                const initialX = this.boneInitialRotations.rightArm ? this.boneInitialRotations.rightArm.x : 0;
                this.bones.rightArm.rotation.x = THREE.MathUtils.lerp(this.bones.rightArm.rotation.x, initialX, armLerpSpeed);
            }
            
            // Left leg forward movement (less than double jump)
            if (this.bones.leftUpLeg) {
                const targetLeftLegX = this.normalJumpLeftLegTargetX;
                this.bones.leftUpLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftUpLeg.rotation.x, targetLeftLegX, armLerpSpeed);
            }
            
            // Left knee bent (less than double jump)
            if (this.bones.leftLeg) {
                const targetLeftKneeX = this.normalJumpLeftKneeTargetX;
                this.bones.leftLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftLeg.rotation.x, targetLeftKneeX, armLerpSpeed);
            }
            
            // Right leg slight backward movement for balance
            if (this.bones.rightUpLeg) {
                const targetRightLegX = this.normalJumpRightLegTargetX;
                this.bones.rightUpLeg.rotation.x = THREE.MathUtils.lerp(this.bones.rightUpLeg.rotation.x, targetRightLegX, armLerpSpeed);
            }
            
            // Other bones smoothly return to their initial pose
            for (const boneKey in this.bones) {
                if (boneKey === 'leftArm' || boneKey === 'rightArm' || boneKey === 'leftUpLeg' || boneKey === 'leftLeg' || boneKey === 'rightUpLeg') continue; // Skip the animated bones

                const bone = this.bones[boneKey];
                const initialRotation = this.boneInitialRotations[boneKey];
                if (bone && initialRotation) {
                    bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initialRotation.x, boneLerpFactor);
                    bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initialRotation.y, boneLerpFactor);
                    bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, initialRotation.z, boneLerpFactor);
                }
            }
        }
    }

    // Looking around animation when he's standing still
    animateIdle() {
        const lerpFactor = 0.1;
        const t = this.animationTime;

        const bodyTurn = Math.sin(t * 0.25) * 0.55; 
        // Increase amplitude of headTurn for more looking around
        const headTurn = Math.sin(t * 0.45 + 1) * 0.85; 

        for (const boneKey in this.bones) {
            const bone = this.bones[boneKey];
            const initial = this.boneInitialRotations[boneKey];
            if (!bone || !initial) continue;

            // Hips: sway and turn
            if (boneKey === 'hips') {
                // not inserted any rotation x otherwise it's unrealistic
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initial.x, lerpFactor);
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initial.y + bodyTurn, lerpFactor);
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, initial.z, lerpFactor);
            }
            // Spine: follow body turn
            else if (boneKey === 'spine') {
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initial.y + bodyTurn * 0.80, lerpFactor); // previoulsy 0.7
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initial.x, lerpFactor);
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, initial.z, lerpFactor);
            }
            // Head: look around
            else if (boneKey === 'head') {
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initial.y + headTurn, lerpFactor);
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initial.x, lerpFactor);
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, initial.z, lerpFactor);
            }
            // Other bones: return to initial
            else {
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, initial.x, lerpFactor);
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, initial.y, lerpFactor);
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, initial.z, lerpFactor);
            }
        }
    } 

    jump() {
        if (!this.model) return false;
        let didJump = false;
        
        // Save current position for collision safety
        const currentPosition = this.model.position.clone();
        
        if (this.onGround) {
            this.velocityY = this.jumpStrength;
            this.onGround = false; 
            this.canDoubleJump = true; // from the ground you can double jump
            this.animationState = 'jumping';
            this.isDoubleJumping = false; // being on the ground means is not double jumping
            didJump = true;
        } 
        
        else if (this.canDoubleJump) {
            this.velocityY = this.jumpStrength; 
            this.canDoubleJump = false; // once you double jumped, you can't again until you land
            this.animationState = 'jumping'; 
            this.isDoubleJumping = true;
            didJump = true;
        }
        return didJump;
    }

    startSprint() {
        if (this.sprinting) return; // Already sprinting

        this.sprinting = true;
        this.currentSpeed = this.sprintSpeed;
        this.animationSpeedMultiplier = 1.35; 

        // Clear any existing sprint timeout
        if (this.sprintTimeout) {
            clearTimeout(this.sprintTimeout);
        }

        this.sprintTimeout = setTimeout(() => {
            this.sprinting = false;
            this.currentSpeed = this.moveSpeed;
            this.animationSpeedMultiplier = 1.1; // Reset animation speed
            this.sprintTimeout = null;
        }, 2500); // Sprint duration in milliseconds, 2.5 in seconds
    }

    //====================== COLLISION HELPERS ======================

    // Get the player's feet position for platform checks
    updatePlayerBoundingBox() {
        if (!this.model) return;
        const pos = this.model.position;
        const size = this.playerSize;
        // DOUBLE the height for the bounding box as requested
        const doubledHeight = size.height * 2;
        this.playerBoundingBox.min.set(
            pos.x - size.width / 2,
            pos.y - this.playerFeetOffset,
            pos.z - size.depth / 2
        );
        this.playerBoundingBox.max.set(
            pos.x + size.width / 2,
            pos.y - this.playerFeetOffset + doubledHeight,
            pos.z + size.depth / 2
        );
    }   
    
    getHighestStandingPlatformY() {
        if (!this.model || !this.platformManager) {
            return -50; // Much lower value to ensure respawn triggers
        }

        const platforms = this.platformManager.getAllPlatforms();
        if (!platforms || platforms.length === 0) {
            return -50; // Much lower value to ensure respawn triggers
        }

        const playerPos = this.model.position;
      
        this.updatePlayerBoundingBox();

        let highestPlatform = -50; // Much lower default to ensure respawn triggers
        for (const platform of platforms) {
            if (this.checkPlayerPlatformCollision_X_Z(platform)) { //se c'é overlap su x and z check also overlap sulle Y
                // Get the top of the platform                 
                const platformTop = platform.position.y + (platform.geometry.parameters.height / 2);
                
                // Player's feet must be above the platform or very close to it
                const playerFeetY = playerPos.y - this.playerFeetOffset;
                const tolerance = 1.0; // Allow player to be slightly above platform
                
                if (playerFeetY >= platformTop - tolerance && platformTop > highestPlatform) {
                    highestPlatform = platformTop;
                }
            }
        }       
        return highestPlatform;
    }    

    checkPlayerPlatformCollision_X_Z(platform) {
        if (!platform || !platform.geometry || !platform.geometry.parameters) return false;

        const platformPos = platform.position;
        const platformGeometry = platform.geometry.parameters;
               
        // Standard collision detection for non-rotated platforms
        const platformBounds = {
            minX: platformPos.x - platformGeometry.width / 2,
            maxX: platformPos.x + platformGeometry.width / 2,
            minZ: platformPos.z - platformGeometry.depth / 2,
            maxZ: platformPos.z + platformGeometry.depth / 2,
            minY: platformPos.y - platformGeometry.height / 2,
            maxY: platformPos.y + platformGeometry.height / 2
        };

        const playerPos = this.model.position;
        const playerBounds = {
            minX: playerPos.x - this.playerSize.width / 2,
            maxX: playerPos.x + this.playerSize.width / 2,
            minZ: playerPos.z - this.playerSize.depth / 2,
            maxZ: playerPos.z + this.playerSize.depth / 2
        };

        // Check if player is horizontally within platform bounds with some tolerance
        const tolerance = 0.1; // Small tolerance for edge cases
        const horizontalOverlap = (
            playerBounds.maxX > platformBounds.minX - tolerance &&
            playerBounds.minX < platformBounds.maxX + tolerance &&
            playerBounds.maxZ > platformBounds.minZ - tolerance &&
            playerBounds.minZ < platformBounds.maxZ + tolerance
        );
        //returns boolean
        return horizontalOverlap;
    }    

    // Check collision with imported FBX/OBJ models (decorative obstacles)
    checkImportedModelCollision() {
        if (!this.scene || !this.model) return false;
        this.updatePlayerBoundingBox();
        let collided = false;
        // Traverse all objects in the scene
        this.scene.traverse((object) => {
            if (object.userData && object.visible !== false) {
                // Composite bounding boxes (array)
                if (Array.isArray(object.userData.boundingBoxes)) {
                    object.userData.boundingBoxes.forEach(box => {
                        // Optionally update box if object moves (for static arch, not needed)
                        if (this.playerBoundingBox.intersectsBox(box)) {
                            collided = true;
                        }
                    });
                } else if (object.userData.boundingBox) {
                    // Update the bounding box in case the object has moved
                    object.userData.boundingBox.setFromObject(object);
                    if (this.playerBoundingBox.intersectsBox(object.userData.boundingBox)) {
                        collided = true;
                    }
                }
            }
        });
        return collided;
    }
    
    /**
     * Checks for Y-axis collisions with imported models and returns a corrected Y position if needed.
     * Returns null if no correction is needed.
     */
    checkImportedModelCollisionY(previousY) {
        if (!this.scene || !this.model) return null;
        this.updatePlayerBoundingBox();
        let correctionY = null;

        this.scene.traverse((object) => {
            if (object.userData && object.visible !== false) {
                let boxes = [];
                if (Array.isArray(object.userData.boundingBoxes)) {
                    boxes = object.userData.boundingBoxes;
                } else if (object.userData.boundingBox) {
                    object.userData.boundingBox.setFromObject(object);
                    boxes = [object.userData.boundingBox];
                }
                boxes.forEach(box => {
                    if (this.playerBoundingBox.intersectsBox(box)) {
                        // Determine if coming from above or below
                        const prevFeet = previousY - this.playerFeetOffset;
                        const currFeet = this.model.position.y - this.playerFeetOffset;
                        const boxTop = box.max.y;
                        const boxBottom = box.min.y;
                        const bboxHeight = this.playerBoundingBox.getSize(new THREE.Vector3()).y;

                        if (prevFeet >= boxTop && currFeet < boxTop) {
                            // ======= COLLISION DETECTED =======
                            // Falling onto the model: place player on top of the model
                            correctionY = boxTop + this.playerFeetOffset + 0.1;
                        } 
                        else if ((previousY - this.playerFeetOffset + bboxHeight) <= boxBottom && (currFeet + bboxHeight) > boxBottom) {
                            // ======= COLLISION DETECTED =======
                            // Jumping up into the model: place player just below the model
                            correctionY = boxBottom + this.playerFeetOffset - bboxHeight - 0.1;
                        }
                    }
                });
            }
        });
        return correctionY;
    }
        
    checkWallCollision() {
        if (!this.model || !this.platformManager) return false;

        const platforms = this.platformManager.getAllPlatforms();
        if (!platforms || platforms.length === 0) return false;

        this.updatePlayerBoundingBox();
        
        for (const platform of platforms) {
            // For regular platforms
            if (!platform.rotation || Math.abs(platform.rotation.z) < 0.01) {
                if (this.checkPlayerPlatformWallCollision(platform)) {
                    return true; // Wall collision detected 
                }
            } 
        }        
        return false;
    }

    // Check if player is colliding with the sides of a platform (not the top/bottom)
    checkPlayerPlatformWallCollision(platform) {
        if (!platform || !platform.geometry || !platform.geometry.parameters) return false;

        const platformPos = platform.position;
        const platformGeometry = platform.geometry.parameters;
        
        // Create platform bounding box
        const platformBounds = {
            minX: platformPos.x - platformGeometry.width / 2,
            maxX: platformPos.x + platformGeometry.width / 2,
            minZ: platformPos.z - platformGeometry.depth / 2,
            maxZ: platformPos.z + platformGeometry.depth / 2,
            minY: platformPos.y - platformGeometry.height / 2,
            maxY: platformPos.y + platformGeometry.height / 2
        };

        // Check horizontal intersection (X and Z)
        const intersectsX = this.playerBoundingBox.max.x > platformBounds.minX && 
                           this.playerBoundingBox.min.x < platformBounds.maxX;
        const intersectsZ = this.playerBoundingBox.max.z > platformBounds.minZ && 
                           this.playerBoundingBox.min.z < platformBounds.maxZ;

        // Only check for wall collision if horizontally intersecting
        if (intersectsX && intersectsZ) {
            // Check if player is at the same level as the platform (not above or below)
            const playerBottom = this.playerBoundingBox.min.y;
            const playerTop = this.playerBoundingBox.max.y;
            
            // Allow walking on top of platforms (player feet above platform top)
            if (playerBottom >= platformBounds.maxY - 0.1) {
                return false; // Standing on top, no wall collision
            }
            // Allow jumping over platforms (player completely above platform)
            if (playerBottom > platformBounds.maxY) {
                return false; // Above platform, no wall collision
            }
            // Allow moving under platforms (player completely below platform)
            if (playerTop < platformBounds.minY) {
                return false; // Below platform, no wall collision
            }
            // Player is at the same level as platform - this is a wall collision
            return true;
        }
        return false;
    }

    // Check if player would collide with any platform when falling from above
    checkVerticalCollisionFromAbove(previousY) {
        if (!this.model || !this.platformManager) {
            return false;
        }

        const platforms = this.platformManager.getAllPlatforms();
        if (!platforms || platforms.length === 0) {
            return false;
        }

        const currentY = this.model.position.y;
        const playerFeetY = currentY - this.playerFeetOffset;
        const previousFeetY = previousY - this.playerFeetOffset;
        
        // Only check if we're moving downward
        if (playerFeetY >= previousFeetY) {
            return false;
        }

        let highestPlatformTop = null;
        for (const platform of platforms) {
            if (this.checkPlayerPlatformCollision_X_Z(platform)) { //controlla che la x e z siano overlappate con platform
                
                const platformTop = platform.position.y + (platform.geometry.parameters.height / 2);
                // Check if we crossed through this platform from above
                if (previousFeetY >= platformTop && playerFeetY < platformTop) {
                    if (highestPlatformTop === null || platformTop > highestPlatformTop) {
                        highestPlatformTop = platformTop;
                    }
                }
            }
        }
        return highestPlatformTop;
    }   

    // Check if player would collide with any platform when jumping/moving upward
    checkVerticalCollisionFromBelow(previousY) {
        if (!this.model || !this.platformManager) {
            return false;
        }
        const platforms = this.platformManager.getAllPlatforms();
        if (!platforms || platforms.length === 0) {
            return false;
        }

        // Use the full bounding box for collision
        this.updatePlayerBoundingBox();
        for (const platform of platforms) {
            if (!platform.geometry || !platform.geometry.parameters) continue;
            // Build platform bounding box
            const platformPos = platform.position;
            const g = platform.geometry.parameters;
            const platformBox = new THREE.Box3(
                new THREE.Vector3( //bottom left back of the platform
                    platformPos.x - g.width / 2,
                    platformPos.y - g.height / 2,
                    platformPos.z - g.depth / 2
                ),
                new THREE.Vector3( //top right front of the platform
                    platformPos.x + g.width / 2,
                    platformPos.y + g.height / 2,
                    platformPos.z + g.depth / 2
                )
            );
            if (this.playerBoundingBox.intersectsBox(platformBox)) {
                // Only block if the player is moving up into the platform from below
                if (this.velocityY > 0 && this.playerBoundingBox.min.y < platformBox.min.y) {
                    return platformBox.min.y;
                }
            }
        }
        return null;
    }
    
    // Helper methods for consistent position calculations
    //====================== POSITION HELPERS ======================
    getPlayerFeetPosition() {
        if (!this.model) return null;
        return {
            x: this.model.position.x,
            y: this.model.position.y - this.playerFeetOffset,
            z: this.model.position.z
        };
    }   
    
    getPlayerHeadPosition() {
        if (!this.model) return null;
        return {
            x: this.model.position.x,
            y: this.model.position.y - this.playerFeetOffset + (this.playerSize.height * 2), // Double the height to match the green bounding box
            z: this.model.position.z
        };
    }

    getPlayerCenterPosition() {
        if (!this.model) return null;
        return {
            x: this.model.position.x,
            y: this.model.position.y - this.playerFeetOffset + (this.playerSize.height / 2),
            z: this.model.position.z
        };
    }
    
    // Method to handle player death
    //====================== DEATH & RESPAWN ========//
    playerDied(cause = 'unknown') {
        // Prevent rapid death counting
        const currentTime = Date.now();
        if (currentTime - this.lastDeathTime < 3000) { // Increased to 3 second cooldown
            return;
        }
        this.lastDeathTime = currentTime;
        
        console.log(`Player died from: ${cause}`);
        
        // Update death counter and show death message
        if (this.gameUI) {
            this.gameUI.updateDeathCounter();
            this.gameUI.showDeathMessage(cause);
        }
        
        // Force respawn with a small delay to ensure it happens
        setTimeout(() => {
            this.respawnPlayer();
        }, 100);
    }
    
    // Method to set UI reference
    setGameUI(ui) {
        this.gameUI = ui;
    }
}