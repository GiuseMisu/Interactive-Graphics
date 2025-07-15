import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class AssetManager {
    //classe chimata nel main.js file, loadingManager passato tramite 
    //const loadingManager = new LoadingManager();
    //const assetManager = new AssetManager(loadingManager.getThreeLoadingManager());
    
    constructor(loadingManager) {
        this.loadingManager = loadingManager;

        // Initialize loaders with the provided loading manager
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.objLoader = new OBJLoader(this.loadingManager);
        this.fbxLoader = new FBXLoader(this.loadingManager);
        
        // Create a separate FBX loader that doesn't use the LoadingManager
        // for the three model that has texture issues
        this.standaloneFBXLoader = new FBXLoader();
        
        // Cache for loaded assets
        // the Map() -> dictionaries
        this.textureCache = new Map();
        this.modelCache = new Map();
    }
    
    // Load texture with caching 
    // function called for the only two textures present in the game: bambu for RegularPlatform and for paved in CheckPoint
    loadTexture(url, onLoad, onProgress, onError) {
        // Check cache first
        if (this.textureCache.has(url)) {
            // If the texture is already cached, return it immediately
            const cachedTexture = this.textureCache.get(url);
            // Use setTimeout to ensure cached assets are handled asynchronously --> Three.js LoadingManager wants like that (avoid race conditions)
            // prevents the loading manager from getting stuck because you have to wait until is completed the loading
            setTimeout(() => {
                if (onLoad) onLoad(cachedTexture);
            }, 0);
            return cachedTexture;
        }
        
        // Handle known missing textures
        // never displayed in the console
        /* if (url.includes('Bark for tree.jpg')) {
            console.warn(`⚠️ Known missing texture: ${url}, using fallback texture`);
            const fallbackTexture = this.createFallbackTexture();
            this.textureCache.set(url, fallbackTexture);
            setTimeout(() => {
                if (onLoad) onLoad(fallbackTexture);
            }, 0);
            return fallbackTexture;
        } */
        
        // Load texture if NOT cached
        const texture = this.textureLoader.load( //function of the THREE.TextureLoader
            url,
            (loadedTexture) => {
                // insert in the cache
                this.textureCache.set(url, loadedTexture);
                if (onLoad) onLoad(loadedTexture);
            },
            onProgress,
            (error) => {
                // Create a fallback texture for missing textures
                console.warn(`--> Texture not found: ${url}, in loadTexture of Assetmanager.js`);
                /* const fallbackTexture = this.createFallbackTexture();
                this.textureCache.set(url, fallbackTexture);
                if (onLoad) onLoad(fallbackTexture); */
                // Don't call onError to prevent loading manager from failing
            }
        );
        
        return texture;
    }
    
    // Create a simple fallback texture
/*     createFallbackTexture() {
        console.log(`===============================`);
        console.log(`===Creating fallback texture===`);
        console.log(`===============================`);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Create a simple brown bark-like texture
        context.fillStyle = '#8B4513'; // Brown color
        context.fillRect(0, 0, 256, 256);
        
        // Add some texture lines
        context.strokeStyle = '#654321';
        context.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
            context.beginPath();
            context.moveTo(0, i * 25);
            context.lineTo(256, i * 25 + Math.random() * 10);
            context.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
     */

    // Load OBJ model --> called in the specific class that needs the model (es goalPlatform and Player)
    loadOBJ(url, onLoad, onProgress, onError) {
        // Check cache first
        if (this.modelCache.has(url)) {
            const cachedModel = this.modelCache.get(url);
            // Use setTimeout to ensure cached models are handled asynchronously --> Three.js LoadingManager wants like that (avoid race conditions)
            // prevents the loading manager from getting stuck because you have to wait until is completed the loading
            setTimeout(() => {
                if (onLoad) onLoad(cachedModel.clone());
            }, 0);
            return;
        }
        
        // Load texture if NOT cached
        this.objLoader.load( // function of the THREE.OBJLoader
            url,
            (object) => {
                // insert in the cache
                this.modelCache.set(url, object);
                // Apply shadow settings to newly loaded object
                if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                    window.game.gameState.getShadowManager().processLoadedObject(object);
                }
                if (onLoad) onLoad(object);
            },
            onProgress,
            onError
        );
    }

    // Load FBX model --> called in the specific class that needs the model (es checkpointPlatform, RegularPlatform and Player)
    loadFBX(url, onLoad, onProgress, onError) {
        // Check cache first
        if (this.modelCache.has(url)) {
            const cachedModel = this.modelCache.get(url);
            // Use setTimeout to ensure cached models are handled asynchronously --> Three.js LoadingManager wants like that (avoid race conditions)
            // prevents the loading manager from getting stuck because you have to wait until is completed the loading
            setTimeout(() => {
                if (onLoad) onLoad(cachedModel.clone());
            }, 0);
            return;
        }
        
        // Use standalone loader for models known to have texture issues
        // the difference is that theCreate a separate FBX loader that doesn't use the LoadingManager --> it caused many problem idk why
        const loaderToUse = url.includes('Japanese_Tree.fbx') ? this.standaloneFBXLoader : this.fbxLoader;
        // Load texture if NOT cached
        loaderToUse.load(
            url,
            (object) => {
                this.modelCache.set(url, object);
                // Apply shadow settings to newly loaded object
                if (window.game && window.game.gameState && window.game.gameState.getShadowManager()) {
                    window.game.gameState.getShadowManager().processLoadedObject(object);
                }
                if (onLoad) onLoad(object);
            },
            onProgress,
            (error) => {
                //know error
                if (error.message && error.message.includes('Bark for tree.jpg')) {
                    console.warn('Warning: Bark for tree.jpg texture not found. Skipping texture application.');
                } 
                else if (onError) {
                    //other possible errors
                    onError(error);
                }
            }
        );
    }
    
    // Get loaders (for direct use if needed)
/*     getTextureLoader() {
        return this.textureLoader;
    }
    
    getOBJLoader() {
        return this.objLoader;
    }
    
    getFBXLoader() {
        return this.fbxLoader;
    } */
    
    // Clear cache
    //method called in the MapManager when the map is changed
    clearCache() {
        this.textureCache.clear();
        this.modelCache.clear();
    }
}
