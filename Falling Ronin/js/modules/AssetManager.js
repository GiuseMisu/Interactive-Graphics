import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class AssetManager {
    constructor(loadingManager) {
        this.loadingManager = loadingManager;

        // Initialize loaders with the provided loading manager
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.objLoader = new OBJLoader(this.loadingManager);
        this.fbxLoader = new FBXLoader(this.loadingManager);
        
        // Create a separate FBX loader that doesn't use the LoadingManager
        // This is useful for models that may have texture loading issues
        this.standaloneFBXLoader = new FBXLoader();
        
        // Cache for loaded assets
        // the Map() are struct like dictionaries, allowing for fast access
        this.textureCache = new Map();
        this.modelCache = new Map();
    }
    
    // Load texture with caching
    loadTexture(url, onLoad, onProgress, onError) {
        // Check cache first
        if (this.textureCache.has(url)) {
            // If the texture is already cached, return it immediately
            const cachedTexture = this.textureCache.get(url);
            // Use setTimeout to ensure cached assets are handled asynchronously
            // This prevents the loading manager from getting stuck
            setTimeout(() => {
                if (onLoad) onLoad(cachedTexture);
            }, 0);
            return cachedTexture;
        }
        
        // Handle known missing textures preemptively
        if (url.includes('Bark for tree.jpg')) {
            console.warn(`⚠️ Known missing texture: ${url}, using fallback texture`);
            const fallbackTexture = this.createFallbackTexture();
            this.textureCache.set(url, fallbackTexture);
            setTimeout(() => {
                if (onLoad) onLoad(fallbackTexture);
            }, 0);
            return fallbackTexture;
        }
        
        // Load texture if not cached
        const texture = this.textureLoader.load(
            url,
            (loadedTexture) => {
                // insert in the cache
                this.textureCache.set(url, loadedTexture);
                if (onLoad) onLoad(loadedTexture);
            },
            onProgress,
            (error) => {
                // Create a fallback texture for missing textures
                console.warn(`--> Texture not found: ${url}, creating fallback texture`);
                const fallbackTexture = this.createFallbackTexture();
                this.textureCache.set(url, fallbackTexture);
                if (onLoad) onLoad(fallbackTexture);
                // Don't call onError to prevent loading manager from failing
            }
        );
        
        return texture;
    }
    
    // Create a simple fallback texture
    createFallbackTexture() {
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
    
    // Load OBJ model
    loadOBJ(url, onLoad, onProgress, onError) {
        // Check cache first
        if (this.modelCache.has(url)) {
            const cachedModel = this.modelCache.get(url);
            // Use setTimeout to ensure cached models are handled asynchronously
            // This prevents the loading manager from getting stuck
            setTimeout(() => {
                if (onLoad) onLoad(cachedModel.clone());
            }, 0);
            return;
        }
        
        this.objLoader.load(
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
    
    // Load FBX model
    loadFBX(url, onLoad, onProgress, onError) {
        // Check cache first
        if (this.modelCache.has(url)) {
            const cachedModel = this.modelCache.get(url);
            // Use setTimeout to ensure cached models are handled asynchronously
            // This prevents the loading manager from getting stuck
            setTimeout(() => {
                if (onLoad) onLoad(cachedModel.clone());
            }, 0);
            return;
        }
        
        // Use standalone loader for models known to have texture issues
        const loaderToUse = url.includes('Japanese_Tree.fbx') ? this.standaloneFBXLoader : this.fbxLoader;
        
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
                // Handle specific errors gracefully
                if (error.message && error.message.includes('Bark for tree.jpg')) {
                    console.warn('Warning: Bark for tree.jpg texture not found. Skipping texture application.');
                    // Don't call onError to prevent loading manager from failing
                } else if (onError) {
                    onError(error);
                }
            }
        );
    }
    
    // Get loaders (for direct use if needed)
    getTextureLoader() {
        return this.textureLoader;
    }
    
    getOBJLoader() {
        return this.objLoader;
    }
    
    getFBXLoader() {
        return this.fbxLoader;
    }
    
    // Clear cache
    clearCache() {
        this.textureCache.clear();
        this.modelCache.clear();
    }
}
