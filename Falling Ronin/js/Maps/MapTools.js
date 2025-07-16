
import * as THREE from 'three';
import { Shuriken } from '../modules/Shuriken.js';
import { RegularPlatform } from './platforms/RegularPlatform.js';
import { CheckpointPlatform } from './platforms/CheckpointPlatform.js';
import { GoalPlatform } from './platforms/GoalPlatform.js';
import { TimedPlatform } from './platforms/TimedPlatform.js';


export class MapTools {

    // ======================= PLATFORM CREATION & MANAGEMENT =======================

    // Add platform helper function - shared between both maps
    static addPlatform(scene, platforms, timedPlatforms, checkpointPlatforms, gameState, assetManager, x, y, z, width, depth, isCheckpoint = false, platformName = '', isGoal = false, isTimed = false) {
        const platformId = platforms.length;
        let platform;
        if (isTimed) {
            platform = TimedPlatform.create(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
            timedPlatforms.set(platformId, platform);
        } 
        else if (isCheckpoint) {
            platform = CheckpointPlatform.create(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
            checkpointPlatforms.set(platformId, platform);
        }
        else if (isGoal) {
            platform = GoalPlatform.create(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
        } 
        else {
            platform = RegularPlatform.create(scene, x, y, z, width, depth, platformName, platformId, gameState, assetManager);
        }
        platforms.push(platform);
        return platform;
    }

    // Method to get all platforms for collision detection
    static getAllPlatforms(platforms) {
        return platforms
            .filter(platform => 
                platform && 
                platform.mesh && 
                platform.mesh.visible && 
                platform.mesh.geometry && 
                platform.mesh.geometry.parameters
            )
            .map(platform => platform.mesh);
    }

    // ======================= TIMED PLATFORM LOGIC =======================

    // Method to check if player is on a timed platform and activate timer
    static checkTimedPlatformCollision(timedPlatforms, player) {
        if (!player || !player.model) return;
        for (const [platformId, platform] of timedPlatforms) {
            // Skip if platform has disappeared
            if (platform.timerState === 'disappeared' || !platform.mesh.visible) {
                continue;
            }
            const isOnPlatform = platform.checkPlayerOnTimedPlatform(player);
            if (isOnPlatform) {
                return platform;
            }
        }
        return null;
    }

    // Update timed platforms
    static updateTimedPlatforms(timedPlatforms, deltaTime, player) {
        for (const [platformId, platform] of timedPlatforms) {
            platform.update(deltaTime, player);
        }
    }

    // Reset a timed platform (for when player respawns)
    static resetTimedPlatform(timedPlatforms, platformId) {
        const platform = timedPlatforms.get(platformId);
        if (platform) {
            platform.reset();
        }
    }

    // Reset all timed platforms
    static resetAllTimedPlatforms(timedPlatforms) {
        for (const [platformId, platform] of timedPlatforms) {
            platform.reset();
        }
        return null; // Reset activeTimedPlatform
    }

    // ======================= SHURIKEN LOGIC =======================

    // Create shuriken helper function - shared between both maps
    static createShuriken(scene, platforms, shurikens, platformIndex) {
        // Check if platform exists
        if (platformIndex >= platforms.length) {
            console.error(`Platform ${platformIndex} does not exist!`);
            return;
        }
        const platform = platforms[platformIndex];
        const platformPosition = {
            x: platform.mesh.position.x,
            y: platform.mesh.position.y,
            z: platform.mesh.position.z
        };
        const platformSize = {
            width: platform.mesh.geometry.parameters.width,
            depth: platform.mesh.geometry.parameters.depth
        };
        console.log(`Creating shurikens for platform ${platformIndex}: ${platform.userData.platformName}`);
        
        // Create single shuriken
        const shuriken1 = new Shuriken(scene, platformPosition, platformSize, 0)
        shurikens.push(shuriken1);
    }

    // Common shuriken update logic
    static updateShurikens(shurikens, deltaTime, player) {
        for (let i = shurikens.length - 1; i >= 0; i--) {
            const shuriken = shurikens[i];
            shuriken.update(deltaTime, player);
        }
    }

    // Clear for shurikens
    static clearShurikens(shurikens) {
        for (const shuriken of shurikens) {
            shuriken.destroy();
        }
        shurikens.length = 0;
    }

    // ======================= BARREL LOGIC =======================

    // barrel update logic
    static updateBarrels(scene, barrels, deltaTime, player, platforms) {
        for (let i = barrels.length - 1; i >= 0; i--) {
            const barrel = barrels[i];
            // Apply physics with player collision and platform information
            barrel.update(deltaTime, player, MapTools.getAllPlatforms(platforms));
            // Remove barrels that have fallen into void or exceeded lifetime
            if (barrel.mesh.position.y < barrel.respawnThreshold || 
                barrel.lifetime > barrel.maxLifetime) {
                scene.remove(barrel.mesh);
                barrels.splice(i, 1); // Remove from array
            }
        }
    }

    // Clear logic for barrels
    static clearBarrels(scene, barrels) {
        for (const barrel of barrels) {
            scene.remove(barrel.mesh);
        }
        barrels.length = 0;
    }

    // ======================= CLEAR/RESET LOGIC =======================

    // Common clear logic for platforms
    static clearPlatforms(platforms) {
        for (const platform of platforms) {
            platform.removeFromScene();
        }
        platforms.length = 0;
    }

    // Common clear logic for checkpoint and timed platforms
    static clearSpecialPlatforms(checkpointPlatforms, timedPlatforms) {
        checkpointPlatforms.clear();
        timedPlatforms.clear();
        return { activeTimedPlatform: null, disappearedPlatforms: new Map() };
    }

    // Common game state reset
    static resetGameState(gameState) {
        if (gameState) {
            gameState.resetCheckpoints();
        }
    }
}
