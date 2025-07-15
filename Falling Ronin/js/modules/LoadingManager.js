import * as THREE from 'three';

export class LoadingManager {
    constructor() {
        this.isLoading = false;
        this.loadingProgress = 0;
        this.totalItems = 0;
        this.loadedItems = 0;

        // Callbacks for loading events
        // can be retrieved from the outside to understand the progress state of the loading process
        this.onProgressCallback = null;
        this.onCompleteCallback = null;
        this.onStartCallback = null;
        
        // Create Three.js LoadingManager
        // used to track the loading of assets in the scene and provide progress updates.
        // it checks the loading of assets like textures, models, etc. and tells when they are loaded.
        this.threeLoadingManager = new THREE.LoadingManager();
        
        // Set up Three.js loading manager callbacks
        // onStart is triggered when loading begins
        this.threeLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
            this.isLoading = true;
            this.totalItems = itemsTotal;
            this.loadedItems = itemsLoaded;
            this.loadingProgress = itemsLoaded / itemsTotal; // Calculate initial progress
            console.log(`Loading started: ${itemsLoaded}/${itemsTotal}`);
            
            if (this.onStartCallback) {
                this.onStartCallback();
            }
            
            this.showLoadingScreen();
            this.updateLoadingScreen(); // Update UI with current progress
        };

        // onProgress is triggered every time an asset finishes loading, providing the current count of loaded vs. total assets.
        this.threeLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.loadedItems = itemsLoaded;
            this.totalItems = itemsTotal;
            this.loadingProgress = itemsLoaded / itemsTotal;
            
            // reduce log spam 
            //console.log(`Loading progress: ${itemsLoaded}/${itemsTotal} (${Math.round(this.loadingProgress * 100)}%)`);
            
            if (this.onProgressCallback) {
                this.onProgressCallback(this.loadingProgress, itemsLoaded, itemsTotal);
            }
            
            this.updateLoadingScreen();
        };

        // onLoad is triggered when all assets are loaded
        this.threeLoadingManager.onLoad = () => {
            this.isLoading = false;
            this.loadingProgress = 1;
            console.log('All assets loaded successfully!');
            
            // Update loading screen to show 100% completion
            this.updateLoadingScreen();
            
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.innerText = 'FINALIZING...';
                loadingText.style.animation = 'loadingPulse 0.8s ease-in-out infinite';
            }
            
            // 3-second delay to ensure everything is really loaded and prevent lag
            setTimeout(() => {
                this.hideLoadingScreen();
                if (this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            }, 3000); // 3000ms (3 seconds)
        };
        
        this.threeLoadingManager.onError = (url) => {
            // Handle specific known missing textures gracefully
            if (url.includes('Bark for tree.jpg')) {
                console.warn(`!! Known missing texture: ${url} - This is expected and handled gracefully`);
            } else {
                console.error(`!! Error loading asset: ${url}`);
            }
        }; 
        
        this.createLoadingScreen();
    }
    
    // ======================== LOADING SCREEN MANAGEMENT =========================
    // ------------------> the UI is at the bottom of the file <------------------

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            
            // Ensure progress bar starts at 0% when showing
            const progressBar = document.getElementById('loadingProgressBar');
            const percentageText = document.getElementById('loadingPercentage');
            const assetsCounter = document.getElementById('assetsCounter');
            
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            if (percentageText) {
                percentageText.innerText = '0%';
            }
            if (assetsCounter) {
                assetsCounter.innerText = '0 / 0 assets';
            }
            // Hide map selection screen if visible
            const mapSelectionScreen = document.getElementById('mapSelectionScreen');
            if (mapSelectionScreen) {
                mapSelectionScreen.style.display = 'none';
            }
            
            // Disable keyboard input
            this.disableKeyboardInput();
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            
            // Reset loading text for next loading session
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.innerText = 'LOADING...';
                loadingText.style.animation = 'loadingPulse 1.5s ease-in-out infinite';
            }
            
            // Re-enable keyboard input
            this.enableKeyboardInput();
        }
    }
    
    updateLoadingScreen() {
        const progressBar = document.getElementById('loadingProgressBar');
        const percentageText = document.getElementById('loadingPercentage');
        const assetsCounter = document.getElementById('assetsCounter');
        
        const percentage = Math.round(this.loadingProgress * 100);
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        if (percentageText) {
            percentageText.innerText = `${percentage}%`;
        }
        if (assetsCounter) {
            assetsCounter.innerText = `${this.loadedItems} / ${this.totalItems} assets`;
        }
    }
    
    disableKeyboardInput() {
        // Store original keyboard event handlers
        this.originalKeydownHandler = window.onkeydown;
        this.originalKeyupHandler = window.onkeyup;
        
        // Disable all keyboard input
        window.onkeydown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        
        window.onkeyup = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        
        // Also disable document event listeners
        document.addEventListener('keydown', this.preventKeyboardInput, true);
        document.addEventListener('keyup', this.preventKeyboardInput, true);
    }
    
    enableKeyboardInput() {
        // Restore original keyboard event handlers
        window.onkeydown = this.originalKeydownHandler;
        window.onkeyup = this.originalKeyupHandler;
        
        // Remove document event listeners
        document.removeEventListener('keydown', this.preventKeyboardInput, true);
        document.removeEventListener('keyup', this.preventKeyboardInput, true);
    }
    
    preventKeyboardInput(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    
    // Callback setters
    setOnStartCallback(callback) {
        this.onStartCallback = callback;
    }
    
    setOnProgressCallback(callback) {
        this.onProgressCallback = callback;
    }
    
    setOnCompleteCallback(callback) {
        this.onCompleteCallback = callback;
    }
    
    // Getter for the Three.js LoadingManager
    getThreeLoadingManager() {
        return this.threeLoadingManager;
    }
    
    // Check if currently loading
    getIsLoading() {
        // this method is called inside the inputmanager to prevent input during loading
        //if it returns true the keys are not processed
        return this.isLoading;
    }
    
    // Get current progress (0-1)
    getProgress() {
        return this.loadingProgress;
    }
    
    // Reset the loading manager state
    reset() {
        this.isLoading = false;
        this.loadingProgress = 0;
        this.totalItems = 0;
        this.loadedItems = 0;
        
        // Reset any pending game start flag
        if (window.pendingGameStart) {
            window.pendingGameStart = false;
        }
        
        // Reset the UI elements to show 0% progress
        this.updateLoadingScreen();
        
        // Hide loading screen if visible
        this.hideLoadingScreen();
        
        console.log('Loading manager reset successfully');
    }
    
    // Force completion of loading (for when all assets are cached)
    forceComplete() {
        if (!this.isLoading) {
            console.log('--> Forcing loading completion - all assets cached -');
            this.isLoading = true; // Set to true temporarily
            this.loadingProgress = 1;
            this.totalItems = 1;
            this.loadedItems = 1;
            
            // Show loading screen briefly and update to 100%
            this.showLoadingScreen();
            this.updateLoadingScreen();
            
            // Show "Finalizing..." message
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.innerText = 'FINALIZING...';
                loadingText.style.animation = 'loadingPulse 0.8s ease-in-out infinite';
            }
            
            // 3-second delay to ensure everything is really loaded
            setTimeout(() => {
                this.isLoading = false;
                this.hideLoadingScreen();
                
                if (this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            }, 3000); // 3 seconds delay
        }
    }
    
    // Start a fresh loading session
    startFreshLoading() {
        // Reset all state
        this.reset();
        
        // Show loading screen with fresh 0% progress
        this.showLoadingScreen();
        console.log('Fresh loading session started');
    }

    
    createLoadingScreen() {
        // Create loading screen container
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loadingScreen';
        loadingScreen.style.position = 'fixed';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.width = '100%';
        loadingScreen.style.height = '100%';
        loadingScreen.style.background = 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)';
        loadingScreen.style.display = 'none';
        loadingScreen.style.flexDirection = 'column';
        loadingScreen.style.alignItems = 'center';
        loadingScreen.style.justifyContent = 'center';
        loadingScreen.style.zIndex = '9999';
        loadingScreen.style.fontFamily = '"Press Start 2P", cursive';
        loadingScreen.style.color = '#ffffff';
        
        // Add subtle animated background pattern
        const backgroundPattern = document.createElement('div');
        backgroundPattern.style.position = 'absolute';
        backgroundPattern.style.top = '0';
        backgroundPattern.style.left = '0';
        backgroundPattern.style.width = '100%';
        backgroundPattern.style.height = '100%';
        backgroundPattern.style.background = `
            radial-gradient(circle at 20% 20%, rgba(231, 76, 60, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(52, 152, 219, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 70%, rgba(155, 89, 182, 0.1) 0%, transparent 50%)
        `;
        backgroundPattern.style.animation = 'backgroundPulse 4s ease-in-out infinite alternate';
        loadingScreen.appendChild(backgroundPattern);
        
        // Create title
        const title = document.createElement('h1');
        title.innerText = 'FALLING RONIN';
        title.style.fontSize = '4rem';
        title.style.color = '#e74c3c';
        title.style.textShadow = '4px 4px 0px #000000';
        title.style.marginBottom = '20px';
        title.style.zIndex = '10';
        title.style.position = 'relative';
        title.style.animation = 'titleGlow 2s ease-in-out infinite alternate';
        loadingScreen.appendChild(title);
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.id = 'loadingText';
        loadingText.innerText = 'LOADING...';
        loadingText.style.fontSize = '1.5rem';
        loadingText.style.color = '#ffffff';
        loadingText.style.marginBottom = '40px';
        loadingText.style.zIndex = '10';
        loadingText.style.position = 'relative';
        loadingText.style.animation = 'loadingPulse 1.5s ease-in-out infinite';
        loadingScreen.appendChild(loadingText);
        
        // Create progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '400px';
        progressContainer.style.height = '20px';
        progressContainer.style.backgroundColor = '#2c3e50';
        progressContainer.style.border = '3px solid #34495e';
        progressContainer.style.borderRadius = '10px';
        progressContainer.style.position = 'relative';
        progressContainer.style.overflow = 'hidden';
        progressContainer.style.zIndex = '10';
        progressContainer.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.5)';
        
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'loadingProgressBar';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.background = 'linear-gradient(90deg, #e74c3c 0%, #f39c12 50%, #e74c3c 100%)';
        progressBar.style.borderRadius = '7px';
        progressBar.style.transition = 'width 0.3s ease';
        progressBar.style.position = 'relative';
        progressBar.style.overflow = 'hidden';
        
        // Add animated shine effect to progress bar
        const shine = document.createElement('div');
        shine.style.position = 'absolute';
        shine.style.top = '0';
        shine.style.left = '-100%';
        shine.style.width = '100%';
        shine.style.height = '100%';
        shine.style.background = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)';
        shine.style.animation = 'shine 2s ease-in-out infinite';
        progressBar.appendChild(shine);
        
        progressContainer.appendChild(progressBar);
        loadingScreen.appendChild(progressContainer);
        
        // Create percentage text
        const percentageText = document.createElement('div');
        percentageText.id = 'loadingPercentage';
        percentageText.innerText = '0%';
        percentageText.style.fontSize = '1.2rem';
        percentageText.style.color = '#ffffff';
        percentageText.style.marginTop = '20px';
        percentageText.style.zIndex = '10';
        percentageText.style.position = 'relative';
        loadingScreen.appendChild(percentageText);
        
        // Create assets counter
        const assetsCounter = document.createElement('div');
        assetsCounter.id = 'assetsCounter';
        assetsCounter.innerText = '0 / 0 assets';
        assetsCounter.style.fontSize = '1rem';
        assetsCounter.style.color = '#bdc3c7';
        assetsCounter.style.marginTop = '10px';
        assetsCounter.style.zIndex = '10';
        assetsCounter.style.position = 'relative';
        loadingScreen.appendChild(assetsCounter);
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes titleGlow {
                0% { text-shadow: 4px 4px 0px #000000, 0 0 20px #e74c3c; }
                100% { text-shadow: 4px 4px 0px #000000, 0 0 40px #e74c3c, 0 0 60px #e74c3c; }
            }
            
            @keyframes loadingPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            @keyframes shine {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            
            @keyframes backgroundPulse {
                0% { opacity: 0.3; }
                100% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(loadingScreen);
    }
    

}
