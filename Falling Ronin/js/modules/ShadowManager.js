

export class ShadowManager {
    constructor(scene, renderer, dayNightCycle) {
        this.scene = scene;
        this.renderer = renderer; // Reference to the WEBGL Renderer, initialized in main.js
        this.dayNightCycle = dayNightCycle; // Reference to the DayNightCycle instance, initialized in main.js
        
        // Shadow modes: 0 = no shadows (default), 1 = all shadows, 2 = platforms only
        this.shadowMode = 0;
        
        // Store original shadow settings
        this.originalShadowMapEnabled = this.renderer.shadowMap.enabled;
        this.originalShadowMapType = this.renderer.shadowMap.type;
        this.originalSunLightCastShadow = this.dayNightCycle.sunLight.castShadow;
        this.originalMoonLightCastShadow = this.dayNightCycle.moonLight.castShadow;
        
        // Apply default shadow mode
        this.applyShadowMode(this.shadowMode);
    }
    
    //CALLED WHEN PRESSED THE BUTTON TO CHANGE SHADOW MODE
    setShadowMode(mode) {
        this.shadowMode = mode;
        this.applyShadowMode(mode);
        console.log(`Shadow mode changed to: ${this.getShadowModeString(mode)}`);
    }
    
    getShadowMode() {
        return this.shadowMode;
    }
    
    getShadowModeString(mode = this.shadowMode) {
        switch(mode) {
            case 0: return 'No Shadows';
            case 1: return 'All Shadows';
            case 2: return 'Platforms Only';
            default: return 'Unknown';
        }
    }
    
    applyShadowMode(mode) {
        switch(mode) {
            case 0: // No shadows
                this.disableAllShadows();
                break;
            case 1: // All shadows
                this.enableAllShadows();
                break;
            case 2: // Platforms only
                this.enablePlatformShadowsOnly();
                break;
        }
    }
    
    disableAllShadows() {
        // Disable the WEBGL renderer FOR shadow mapping
        this.renderer.shadowMap.enabled = false;

        // Disable light shadows, meaning no light will cast shadows at all
        this.dayNightCycle.sunLight.castShadow = false;
        this.dayNightCycle.moonLight.castShadow = false;
        
        // Disable shadows on ALL scene objects
        this.scene.traverse((child) => {
            if (child.isMesh) {
                // Never disable shadows for celestial bodies - they should stay off
                if (child === this.dayNightCycle.sun || child === this.dayNightCycle.moon) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                } 
                else {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            }
        });
    }
    
    enableAllShadows() {
        // Enable renderer shadow mapping
        this.renderer.shadowMap.enabled = true;
        // Restore original shadow map type
        this.renderer.shadowMap.type = this.originalShadowMapType;
        
        // Enable light shadows
        this.dayNightCycle.sunLight.castShadow = true;
        this.dayNightCycle.moonLight.castShadow = true;
        
        // Enable shadows on all scene objects
        this.scene.traverse((child) => {
            if (child.isMesh) {
                // Never enable shadows for celestial bodies - they should stay off
                if (child === this.dayNightCycle.sun || child === this.dayNightCycle.moon) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            }
        });
    }
    
    enablePlatformShadowsOnly() {
        // Enable renderer shadow mapping
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = this.originalShadowMapType;
        
        // Enable light shadows
        this.dayNightCycle.sunLight.castShadow = true;
        this.dayNightCycle.moonLight.castShadow = true;
        
        // Enable shadows selectively based on object type
        this.scene.traverse((child) => {
            if (child.isMesh) {
                // Never enable shadows for celestial bodies - they should stay off
                if (child === this.dayNightCycle.sun || child === this.dayNightCycle.moon) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    return;
                }
                
                // Check if this is a platform (has platform-related userData)
                const userData = child.userData || {};
                const isPlatform = userData.isCheckpoint !== undefined || 
                                  userData.isGoal !== undefined || 
                                  userData.isTimedPlatform !== undefined ||
                                  userData.isPlatform === true;
                
                // Also check if the parent has platform data (for composite objects)
                let parentIsPlatform = false;
                if (child.parent) {
                    const parentUserData = child.parent.userData || {};
                    parentIsPlatform = parentUserData.isCheckpoint !== undefined || 
                                      parentUserData.isGoal !== undefined || 
                                      parentUserData.isTimedPlatform !== undefined ||
                                      parentUserData.isPlatform === true;
                }
                
                // Check if this is a platform based on geometry (BoxGeometry with height 0.5)
                let isBoxPlatform = false;
                if (child.geometry && child.geometry.type === 'BoxGeometry') {
                    const params = child.geometry.parameters;
                    if (params && params.height === 0.5) {
                        isBoxPlatform = true;
                    }
                }
                
                if (isPlatform || parentIsPlatform || isBoxPlatform) {
                    // Enable shadows for platforms
                    child.castShadow = true;
                    child.receiveShadow = true;
                } 
                else {
                    // Disable shadows for 3D models (.fbx, .obj files)
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            }
        });
    }

    // Method to update shadow settings for objects
    //this method is called on the mesh. loaded file do not call directly this beacuse first you have to obtain the mesh so is called first processLoadedObject
    /// (barrel, shuriken, trapdoor are not loaded model so  call this function directly
    updateObjectShadows(object) {
        if (!object.isMesh) return;
        
        // Never apply shadows to celestial bodies (sun/moon)
        if (object === this.dayNightCycle.sun || object === this.dayNightCycle.moon) {
            object.castShadow = false;
            object.receiveShadow = false;
            return;
        }
        
        const userData = object.userData || {};
        const isPlatform = userData.isCheckpoint !== undefined || 
                          userData.isGoal !== undefined || 
                          userData.isTimedPlatform !== undefined ||
                          userData.isPlatform === true;
        
        // Also check if the parent has platform data
        let parentIsPlatform = false;
        if (object.parent) {
            const parentUserData = object.parent.userData || {};
            parentIsPlatform = parentUserData.isCheckpoint !== undefined || 
                              parentUserData.isGoal !== undefined || 
                              parentUserData.isTimedPlatform !== undefined ||
                              parentUserData.isPlatform === true;
        }
        
        // Check if this is a platform based on geometry (BoxGeometry with height 0.5)
        let isBoxPlatform = false;
        if (object.geometry && object.geometry.type === 'BoxGeometry') {
            const params = object.geometry.parameters;
            if (params && params.height === 0.5) {
                isBoxPlatform = true;
            }
        }
        
        switch(this.shadowMode) {
            case 0: // No shadows
                object.castShadow = false;
                object.receiveShadow = false;
                break;
            case 1: // All shadows
                object.castShadow = true;
                object.receiveShadow = true;
                break;
            case 2: // Platforms only
                if (isPlatform || parentIsPlatform || isBoxPlatform) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                } else {
                    object.castShadow = false;
                    object.receiveShadow = false;
                }
                break;
        }
    }
    
    // Method to be called when loading new objects (fbx obj etc..)
    //it's a double check to ensure that the shadow settings are applied to the meshes of the loaded objects
    // in case the function called by the button [setShadowMode] is not called
    processLoadedObject(object) {
        object.traverse((child) => {
            if (child.isMesh) { //of course the shadow projected is the one of the mesh of the object
                this.updateObjectShadows(child);
            }
        });
    }
}
