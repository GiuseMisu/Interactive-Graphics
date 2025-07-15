export class UI {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.deathCount = 0;
        this.hasCheckpoint = false;
        this.checkpointName = '';
        this.startGameCallback = null;
        this.returnToMenuCallback = null; //  Callback for returning to menu
        this.autoReturnTimeout = null; // For level complete auto return
        this.createMapSelectionScreen();
        this.createCoordinatesDisplay();
        this.createDeathCounterDisplay();
        this.createCheckpointDisplay();
        this.createLevelCompleteScreen();
        this.createDeathMessageDisplay();
        this.createReturnToMenuButton();
    }

    //function that comes directly from the main file passing from the gameclass
    setStartGameCallback(callback) {
        this.startGameCallback = callback;
    }

    // Set callback for returning to menu, called from the game class
    setReturnToMenuCallback(callback) { // NEW: Method to set the callback
        this.returnToMenuCallback = callback;
    }

    createMapSelectionScreen() {
        // Create a container for the map selection UI
        const container = document.createElement('div');
        container.id = 'mapSelectionScreen';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.background = "url('assets/textures/possible_background_4.png') center center / cover no-repeat";
        //container.style.background = 'linear-gradient(to bottom, #2c3e50, #34495e)';
        container.style.zIndex = '10';
        container.style.fontFamily = '"Press Start 2P", cursive'; // Retro font

        // Add Google Font for retro look
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
        
        // Title
        const title = document.createElement('h1');
        title.innerText = 'FALLING RONIN';
        title.style.color = '#e74c3c';
        title.style.fontSize = '5rem';
        title.style.marginBottom = '50px';
        title.style.textShadow = '6px 6px 0px #000000';
        container.appendChild(title);
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '30px';
        container.appendChild(buttonContainer);
        
        // Map 1 Button
        const map1Button = document.createElement('button');
        map1Button.innerText = 'Map 1';
        this.styleButton(map1Button);
        map1Button.onclick = () => this.loadMap('Map1');
        buttonContainer.appendChild(map1Button);
        
        // Map 2 Button
        const map2Button = document.createElement('button');
        map2Button.innerText = 'Map 2';
        this.styleButton(map2Button);
        map2Button.onclick = () => this.loadMap('Map2');
        buttonContainer.appendChild(map2Button);
        
        // Shadow settings container
        const shadowContainer = document.createElement('div');
        shadowContainer.style.marginTop = '30px';
        shadowContainer.style.display = 'flex';
        shadowContainer.style.flexDirection = 'column';
        shadowContainer.style.alignItems = 'center';
        shadowContainer.style.gap = '15px';
        container.appendChild(shadowContainer);
        
        // Shadow settings label
        const shadowLabel = document.createElement('h3');
        shadowLabel.innerText = 'SHADOW QUALITY';
        shadowLabel.style.color = '#ffffff';
        shadowLabel.style.fontSize = '1.2rem';
        shadowLabel.style.margin = '0';
        shadowLabel.style.textShadow = '3px 3px 0px #000000';
        shadowContainer.appendChild(shadowLabel);
        
        //====================================================
        //                Shadow toggle button
        //====================================================
        const shadowButton = document.createElement('button');
        shadowButton.id = 'shadowToggleButton';
        shadowButton.innerText = this.mapManager.gameState ? this.mapManager.gameState.getShadowModeString() : 'Platforms Only';
        this.styleButton(shadowButton);
        shadowButton.style.fontSize = '1.2rem';
        shadowButton.style.padding = '15px 30px';

        // it takes the CurrentShadowMode FROM mapManager.gameState.getShadowMode() 
        // and then with setShadowMode(CurrentShadowMode+1) it sets the next mode
        // this last function is a GameState method that then call a shadowManager method to set the next mode
        // it will call the applyShadowMode(mode) and based on the mode passed IT MODIFES THE RENDER OF WEBGL [this.renderer.shadowMap]
        // activate it all or disable it all or activate it and anable only for platforms shadows
        shadowButton.onclick = () => this.toggleShadowMode(); 
        shadowContainer.appendChild(shadowButton);

        //====================================================
        //                Music toggle button
        //====================================================
        const musicButton = document.createElement('button');
        musicButton.id = 'musicToggleButton';
        musicButton.style.position = 'absolute';
        musicButton.style.top = '20px';
        musicButton.style.right = '20px';
        musicButton.style.padding = '15px 20px';
        musicButton.style.fontSize = '1.8rem';
        musicButton.style.backgroundColor = '#95a5a6'; // Start with disabled color
        musicButton.style.color = 'white';
        musicButton.style.border = '4px solid #7f8c8d'; // Start with disabled border
        musicButton.style.borderRadius = '15px';
        musicButton.style.cursor = 'pointer';
        musicButton.style.transition = 'all 0.2s ease';
        musicButton.style.textShadow = '3px 3px 0px #7f8c8d';
        musicButton.style.boxShadow = '0 8px 0 #7f8c8d'; // Start with disabled shadow
        musicButton.style.fontFamily = 'inherit';
        musicButton.style.zIndex = '15';
        musicButton.style.display = 'flex';
        musicButton.style.alignItems = 'center';
        musicButton.style.justifyContent = 'center';
        
        // Add only the muted speaker icon (music starts disabled)
        musicButton.innerHTML = '🔇';
        
        musicButton.onmouseover = () => {
            if (window.musicManager && window.musicManager.getMusicEnabled()) {
                musicButton.style.backgroundColor = '#ff6b5a';
                musicButton.style.transform = 'translateY(-3px)';
                musicButton.style.boxShadow = '0 11px 0 #c0392b';
            } else {
                musicButton.style.backgroundColor = '#bdc3c7';
                musicButton.style.transform = 'translateY(-3px)';
                musicButton.style.boxShadow = '0 11px 0 #7f8c8d';
            }
        };
        
        musicButton.onmouseout = () => {
            if (window.musicManager && window.musicManager.getMusicEnabled()) {
                musicButton.style.backgroundColor = '#e74c3c';
                musicButton.style.transform = 'translateY(0)';
                musicButton.style.boxShadow = '0 8px 0 #c0392b';
            } else {
                musicButton.style.backgroundColor = '#95a5a6';
                musicButton.style.transform = 'translateY(0)';
                musicButton.style.boxShadow = '0 8px 0 #7f8c8d';
            }
        };

        musicButton.onmousedown = () => {
            musicButton.style.transform = 'translateY(4px)';
            if (window.musicManager && window.musicManager.getMusicEnabled()) {
                musicButton.style.boxShadow = '0 4px 0 #c0392b';
            } else {
                musicButton.style.boxShadow = '0 4px 0 #7f8c8d';
            }
        };

        musicButton.onmouseup = () => {
            musicButton.style.transform = 'translateY(0)';
            if (window.musicManager && window.musicManager.getMusicEnabled()) {
                musicButton.style.boxShadow = '0 8px 0 #c0392b';
            } else {
                musicButton.style.boxShadow = '0 8px 0 #7f8c8d';
            }
        };
        
        musicButton.onclick = () => this.toggleMusic();
        container.appendChild(musicButton);

        // Instructions
        const instructions = document.createElement('div');
        instructions.style.marginTop = '60px';
        instructions.style.padding = '20px';
        instructions.style.background = 'rgba(0, 0, 0, 0.3)';
        instructions.style.borderRadius = '10px';
        instructions.style.border = '2px solid #e74c3c';
        instructions.innerHTML = `
            <h3 style="color: #ffffff; margin-top: 0; text-align: center; font-size: 1.5rem; text-transform: uppercase;">Controls</h3>
            <p style="color: #ecf0f1; text-align: left; line-height: 2; font-size: 1rem;">
                <span style="color: #e74c3c; font-weight: bold;">W/S</span>: Move Forward/Backward<br>
                <span style="color: #e74c3c; font-weight: bold;">A/D</span>: Rotate Left/Right<br>
                <span style="color: #e74c3c; font-weight: bold;">Space</span>: Jump (Double-Tap for Double Jump)<br>
                <span style="color: #e74c3c; font-weight: bold;">Double-Tap W</span>: Sprint<br>
                <span style="color: #e74c3c; font-weight: bold;">P</span>: Toggle Camera Mode<br>
            </p>
        `;
        container.appendChild(instructions);
        document.body.appendChild(container);
    }
    
    styleButton(button) {
        button.style.padding = '20px 40px';
        button.style.fontSize = '1.8rem';
        button.style.backgroundColor = '#e74c3c';
        button.style.color = 'white';
        button.style.border = '4px solid #c0392b';
        button.style.borderRadius = '15px';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s ease';
        button.style.textShadow = '3px 3px 0px #c0392b';
        button.style.boxShadow = '0 10px 0 #c0392b';
        button.style.fontFamily = 'inherit';

        button.onmouseover = () => {
            button.style.backgroundColor = '#ff6b5a';
            button.style.transform = 'translateY(-5px)';
            button.style.boxShadow = '0 15px 0 #c0392b';
        };
        
        button.onmouseout = () => {
            button.style.backgroundColor = '#e74c3c';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 10px 0 #c0392b';
        };

        button.onmousedown = () => {
            button.style.transform = 'translateY(5px)';
            button.style.boxShadow = '0 5px 0 #c0392b';
        };

        button.onmouseup = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 10px 0 #c0392b';
        };
    }


    // Method called once the ShadowButton is pressed 
    toggleShadowMode() {
        if (!this.mapManager.gameState) return;
        
        const currentMode = this.mapManager.gameState.getShadowMode();
        let nextMode = (currentMode + 1) % 3; // Cycle through 0, 1, 2
        this.mapManager.gameState.setShadowMode(nextMode); //set the next mode in the game state
        
        // Update button text
        const shadowButton = document.getElementById('shadowToggleButton');
        if (shadowButton) {
            shadowButton.innerText = this.mapManager.gameState.getShadowModeString();
        }
        console.log(`Shadow mode toggled to: ${this.mapManager.gameState.getShadowModeString()}`);
    }

    // Method called when the music button is pressed
    toggleMusic() {
        if (!window.musicManager) return;

        // Ensure user interaction is registered for autoplay policies
        window.musicManager.hasUserInteracted = true;

        const isEnabled = window.musicManager.toggle();
        const musicButton = document.getElementById('musicToggleButton');

        if (musicButton) {
            // Update button appearance and icon based on music state
            if (isEnabled) {
                musicButton.innerHTML = '🔊'; // Normal speaker icon
                musicButton.style.backgroundColor = '#e74c3c';
                musicButton.style.borderColor = '#c0392b';
                musicButton.style.boxShadow = '0 8px 0 #c0392b';
                musicButton.style.textShadow = '3px 3px 0px #c0392b';
            } else {
                musicButton.innerHTML = '🔇'; // Muted speaker icon
                musicButton.style.backgroundColor = '#95a5a6';
                musicButton.style.borderColor = '#7f8c8d';
                musicButton.style.boxShadow = '0 8px 0 #7f8c8d';
                musicButton.style.textShadow = '3px 3px 0px #7f8c8d';
            }
        }

        console.log(`Music ${isEnabled ? 'enabled' : 'disabled'}`);
    }
    
    loadMap(mapName) {
        // Start a fresh loading session
        if (window.loadingManager) {
            window.loadingManager.startFreshLoading();
        }
        
        // Small delay to ensure loading screen is visible with fresh state
        setTimeout(() => {
            // this is the load map method of the mapManager not the ui class
            this.mapManager.loadMap(mapName);
            
            // Hide map selection screen
            const selectionScreen = document.getElementById('mapSelectionScreen');
            if (selectionScreen) {
                selectionScreen.style.display = 'none';
            }

            // Hide music button when in game
            const musicButton = document.getElementById('musicToggleButton');
            if (musicButton) {
                musicButton.style.display = 'none';
            }

            // Reset death counter when starting a new game
            this.resetDeathCounter();

            if (this.startGameCallback) {
                this.startGameCallback();
            }
            
            // Show game UI elements
            this.showGameUI();
            
            // Show player coordinates if the game has a player
            if (window.game && window.game.player) {
                this.updateCoordinatesDisplay(window.game.player);
            }
            
            // Check if loading manager is stuck (all assets cached)
            setTimeout(() => {
                if (window.loadingManager && !window.loadingManager.getIsLoading()) {
                    console.log('Loading manager not triggered - forcing completion');
                    window.loadingManager.forceComplete();
                }
            }, 200); // Check after a short delay
        }, 50); // Small delay to ensure loading screen renders with fresh state
    }
    
    showMapSelection() {
        const selectionScreen = document.getElementById('mapSelectionScreen');
        if (selectionScreen) {
            selectionScreen.style.display = 'flex';
        }
        
        // Show music button when in main menu
        const musicButton = document.getElementById('musicToggleButton');
        if (musicButton) {
            musicButton.style.display = 'flex';
        }
        
        // Hide game UI when showing map selection
        this.hideGameUI();
    }
    
    createCoordinatesDisplay() {
        // Create container for coordinates display - placed under the menu button
        const coordsDisplay = document.createElement('div');
        coordsDisplay.id = 'playerCoordinates';
        coordsDisplay.style.position = 'absolute';
        coordsDisplay.style.top = '60px'; // Placed below the menu button (menu button is at top: 20px, height ~40px)
        coordsDisplay.style.left = '20px'; // Align with menu button
        coordsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        coordsDisplay.style.color = 'white';
        coordsDisplay.style.padding = '10px';
        coordsDisplay.style.borderRadius = '5px';
        coordsDisplay.style.fontFamily = '"Press Start 2P", monospace';
        coordsDisplay.style.fontSize = '8px';
        coordsDisplay.style.zIndex = '100';
        coordsDisplay.style.display = 'none'; // Hidden by default until game starts
        
        document.body.appendChild(coordsDisplay);
    }
    
    updateCoordinatesDisplay(player) {
        if (!player || !player.model) return;
        
        const coordsDisplay = document.getElementById('playerCoordinates');
        if (!coordsDisplay) return;

        // Show the coordinates sullo schermo
        //coordsDisplay.style.display = 'block';
        
        // Also ensure death counter is shown
        const deathCounterDisplay = document.getElementById('deathCounter');
        if (deathCounterDisplay) {
            deathCounterDisplay.style.display = 'block';
        }
        
        // Get head and feet positions
        const headPos = player.getPlayerHeadPosition();
        const feetPos = player.getPlayerFeetPosition();
        
        // Format the coordinates with 2 decimal places
        const formatPos = (pos) => {
            if (!pos) return 'N/A';
            return `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
        };
        
        // Update the display
        coordsDisplay.innerHTML = `
            <div><strong>Head:</strong> ${formatPos(headPos)}</div>
            <div><strong>Feet:</strong> ${formatPos(feetPos)}</div>
        `;
    }
    
    createDeathCounterDisplay() {
        // Create container for death counter display - positioned in top-right, matching main menu style
        const deathCounterDisplay = document.createElement('div');
        deathCounterDisplay.id = 'deathCounter';
        deathCounterDisplay.style.position = 'absolute';
        deathCounterDisplay.style.top = '20px';
        deathCounterDisplay.style.right = '20px';
        deathCounterDisplay.style.backgroundColor = '#e74c3c'; // Same red as menu buttons
        deathCounterDisplay.style.color = 'white';
        deathCounterDisplay.style.padding = '10px 15px';
        deathCounterDisplay.style.borderRadius = '8px';
        deathCounterDisplay.style.fontFamily = '"Press Start 2P", Arial, sans-serif';
        deathCounterDisplay.style.fontSize = '10px';
        deathCounterDisplay.style.fontWeight = 'normal';
        deathCounterDisplay.style.zIndex = '100';
        deathCounterDisplay.style.display = 'none'; // Hidden by default until game starts
        deathCounterDisplay.style.border = '2px solid #c0392b'; // Same border as menu buttons
        deathCounterDisplay.style.boxShadow = '0 4px 0 #c0392b'; // Same shadow as menu buttons
        deathCounterDisplay.style.textShadow = '1px 1px 0px #c0392b'; // Same text shadow as menu buttons
        deathCounterDisplay.style.textAlign = 'center';
        deathCounterDisplay.style.minWidth = '100px';
        deathCounterDisplay.style.transition = 'all 0.2s ease';
        
        // Add skull emoji and text
        deathCounterDisplay.innerHTML = `
            <div style="font-size: 14px; margin-bottom: 3px;">💀</div>
            <div style="font-size: 8px;">DEATHS</div>
            <div style="font-size: 16px; margin-top: 3px;">${this.deathCount}</div>
        `;
        
        document.body.appendChild(deathCounterDisplay);
    }
    
    createCheckpointDisplay() {
        // Create container for checkpoint status display - positioned below death counter
        const checkpointDisplay = document.createElement('div');
        checkpointDisplay.id = 'checkpointStatus';
        checkpointDisplay.style.position = 'absolute';
        checkpointDisplay.style.top = '120px'; // Further below death counter to avoid overlap
        checkpointDisplay.style.right = '20px';
        checkpointDisplay.style.backgroundColor = '#2c3e50'; // Dark blue-gray
        checkpointDisplay.style.color = 'white';
        checkpointDisplay.style.padding = '10px 15px';
        checkpointDisplay.style.borderRadius = '8px';
        checkpointDisplay.style.fontFamily = '"Press Start 2P", Arial, sans-serif';
        checkpointDisplay.style.fontSize = '8px';
        checkpointDisplay.style.fontWeight = 'normal';
        checkpointDisplay.style.zIndex = '100';
        checkpointDisplay.style.display = 'none'; // Hidden by default until game starts
        checkpointDisplay.style.border = '2px solid #34495e';
        checkpointDisplay.style.boxShadow = '0 4px 0 #34495e';
        checkpointDisplay.style.textShadow = '1px 1px 0px #34495e';
        checkpointDisplay.style.textAlign = 'center';
        checkpointDisplay.style.minWidth = '100px';
        checkpointDisplay.style.transition = 'all 0.2s ease';
        
        // Initial content (no checkpoint)
        checkpointDisplay.innerHTML = `
            <div style="font-size: 12px; margin-bottom: 3px;">🚩</div>
            <div style="font-size: 7px;">CHECKPOINT</div>
            <div style="font-size: 9px; margin-top: 3px;">NONE</div>
        `;
        
        document.body.appendChild(checkpointDisplay);
    }
    
    createLevelCompleteScreen() {
        // Create the level complete screen overlay
        const completeScreen = document.createElement('div');
        completeScreen.id = 'levelCompleteScreen';
        completeScreen.style.position = 'fixed';
        completeScreen.style.top = '0';
        completeScreen.style.left = '0';
        completeScreen.style.width = '100%';
        completeScreen.style.height = '100%';
        completeScreen.style.display = 'none'; // Hidden by default
        completeScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        completeScreen.style.zIndex = '1000';
        completeScreen.style.justifyContent = 'center';
        completeScreen.style.alignItems = 'center';
        completeScreen.style.flexDirection = 'column';
        completeScreen.style.fontFamily = '"Press Start 2P", Arial, sans-serif';
        completeScreen.style.textAlign = 'center';
        completeScreen.style.color = 'white';
        
        // Achievement container with golden animation
        const achievementContainer = document.createElement('div');
        achievementContainer.style.background = 'linear-gradient(45deg, #ffd700, #ffaa00, #ffd700)';
        achievementContainer.style.backgroundSize = '200% 200%';
        achievementContainer.style.animation = 'goldShimmer 2s ease-in-out infinite';
        achievementContainer.style.padding = '40px';
        achievementContainer.style.borderRadius = '20px';
        achievementContainer.style.border = '5px solid #ff8c00';
        achievementContainer.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8)';
        achievementContainer.style.transform = 'scale(0)';
        achievementContainer.style.animation = 'achievementPop 1s ease-out forwards, goldShimmer 2s ease-in-out infinite 1s';
        
        // Title
        const title = document.createElement('h1');
        title.innerHTML = '🏆 LEVEL COMPLETED! 🏆';
        title.style.color = '#8b4513';
        title.style.fontSize = '3rem';
        title.style.marginBottom = '20px';
        title.style.textShadow = '3px 3px 0px #000000';
        achievementContainer.appendChild(title);
        
        // Congratulations message
        const message = document.createElement('p');
        message.innerHTML = 'CONGRATULATIONS!<br>You have completed this level!';
        message.style.color = '#4a4a4a';
        message.style.fontSize = '1.2rem';
        message.style.marginBottom = '30px';
        message.style.lineHeight = '1.5';
        achievementContainer.appendChild(message);
        
        // Death count display
        const deathStats = document.createElement('div');
        deathStats.id = 'levelCompleteStats';
        deathStats.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        deathStats.style.padding = '15px';
        deathStats.style.borderRadius = '10px';
        deathStats.style.marginBottom = '30px';
        deathStats.innerHTML = `
            <div style="color: #ffffff; font-size: 1rem;">FINAL STATS</div>
            <div style="color: #ff6b6b; font-size: 1.5rem; margin-top: 10px;">💀 Deaths: ${this.deathCount}</div>
        `;
        achievementContainer.appendChild(deathStats);
        
        // Auto return countdown
        const countdown = document.createElement('div');
        countdown.id = 'autoReturnCountdown';
        countdown.style.color = '#ffffff';
        countdown.style.fontSize = '1rem';
        countdown.style.marginBottom = '20px';
        countdown.innerHTML = 'Returning to menu in 10 seconds...';
        achievementContainer.appendChild(countdown);
        
        // Return to menu button
        const returnButton = document.createElement('button');
        returnButton.innerHTML = 'RETURN TO MENU';
        returnButton.style.backgroundColor = '#e74c3c';
        returnButton.style.color = 'white';
        returnButton.style.border = '3px solid #c0392b';
        returnButton.style.padding = '15px 30px';
        returnButton.style.fontSize = '1rem';
        returnButton.style.fontFamily = '"Press Start 2P", Arial, sans-serif';
        returnButton.style.borderRadius = '10px';
        returnButton.style.cursor = 'pointer';
        returnButton.style.boxShadow = '0 6px 0 #c0392b';
        returnButton.style.transition = 'all 0.2s ease';
        
        returnButton.onmouseover = () => {
            returnButton.style.backgroundColor = '#ff4757';
            returnButton.style.transform = 'translateY(2px)';
            returnButton.style.boxShadow = '0 4px 0 #c0392b';
        };
        
        returnButton.onmouseout = () => {
            returnButton.style.backgroundColor = '#e74c3c';
            returnButton.style.transform = 'translateY(0)';
            returnButton.style.boxShadow = '0 6px 0 #c0392b';
        };
        
        returnButton.onclick = () => {
            this.hideLevelCompleteScreen();
            this.returnToMenu();
        };
        
        achievementContainer.appendChild(returnButton);
        completeScreen.appendChild(achievementContainer);
        document.body.appendChild(completeScreen);
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes achievementPop {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                50% { transform: scale(1.1) rotate(0deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            @keyframes goldShimmer {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    updateDeathCounter() {
        this.deathCount++;
        const deathCounterDisplay = document.getElementById('deathCounter');
        if (deathCounterDisplay) {
            // Show the death counter display if it's hidden
            deathCounterDisplay.style.display = 'block';
            
            // Update the counter with animation
            deathCounterDisplay.innerHTML = `
                <div style="font-size: 14px; margin-bottom: 3px;">💀</div>
                <div style="font-size: 8px;">DEATHS</div>
                <div style="font-size: 16px; margin-top: 3px;">${this.deathCount}</div>
            `;
            
            // Add a brief flash animation - brighter red flash
            deathCounterDisplay.style.transform = 'scale(1.1)';
            deathCounterDisplay.style.backgroundColor = '#ff4757'; // Brighter red flash
            
            setTimeout(() => {
                deathCounterDisplay.style.transform = 'scale(1)';
                deathCounterDisplay.style.backgroundColor = '#e74c3c'; // Back to normal red
            }, 200);
        }
    }
    
    updateCheckpointStatus(hasCheckpoint, checkpointName = '', animate = true) {
        this.hasCheckpoint = hasCheckpoint;
        this.checkpointName = checkpointName;

        const checkpointDisplay = document.getElementById('checkpointStatus');
        if (checkpointDisplay) {
            if (hasCheckpoint) {
                // Get checkpoint progress from GameState
                const totalCheckpoints = window.game.gameState.checkpoints.size;
                const unlockedCheckpoints = Array.from(window.game.gameState.checkpoints.values()).filter(cp => cp.reached).length;

                // Show active checkpoint with green styling
                checkpointDisplay.style.backgroundColor = '#27ae60'; // Green
                checkpointDisplay.style.border = '2px solid #2ecc71';
                checkpointDisplay.style.boxShadow = '0 4px 0 #2ecc71';
                checkpointDisplay.style.textShadow = '1px 1px 0px #2ecc71';

                checkpointDisplay.innerHTML = `
                    <div style="font-size: 12px; margin-bottom: 3px;">✅</div>
                    <div style="font-size: 7px;">CHECKPOINT</div>
                    <div style="font-size: 8px; margin-top: 3px;">${unlockedCheckpoints}/${totalCheckpoints}</div>
                `;

                if (animate) {
                    checkpointDisplay.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        checkpointDisplay.style.transform = 'scale(1)';
                    }, 200);
                } else {
                    // Ensure no scaling animation
                    checkpointDisplay.style.transform = 'scale(1)';
                }
            } else {
                // Show no checkpoint with default styling
                checkpointDisplay.style.backgroundColor = '#2c3e50'; // Dark blue-gray
                checkpointDisplay.style.border = '2px solid #34495e';
                checkpointDisplay.style.boxShadow = '0 4px 0 #34495e';
                checkpointDisplay.style.textShadow = '1px 1px 0px #34495e';

                checkpointDisplay.innerHTML = `
                    <div style="font-size: 12px; margin-bottom: 3px;">🚩</div>
                    <div style="font-size: 7px;">CHECKPOINT</div>
                    <div style="font-size: 9px; margin-top: 3px;">NONE</div>
                `;
            }
        }
    }
    
    showGameUI() {
        // Show coordinates, death counter, checkpoint status, and return to menu button when game starts
        // const coordsDisplay = document.getElementById('playerCoordinates');
        const deathCounterDisplay = document.getElementById('deathCounter');
        const checkpointDisplay = document.getElementById('checkpointStatus');
        const returnButton = document.getElementById('returnToMenuButton');
        
        // if (coordsDisplay) coordsDisplay.style.display = 'block';
        if (deathCounterDisplay) deathCounterDisplay.style.display = 'block';
        if (checkpointDisplay) checkpointDisplay.style.display = 'block';
        if (returnButton) returnButton.style.display = 'block';
    }
    
    hideGameUI() {
        // Hide all displays when returning to menu
        // const coordsDisplay = document.getElementById('playerCoordinates');
        const deathCounterDisplay = document.getElementById('deathCounter');
        const checkpointDisplay = document.getElementById('checkpointStatus');
        const returnButton = document.getElementById('returnToMenuButton');
        
        // if (coordsDisplay) coordsDisplay.style.display = 'none';
        if (deathCounterDisplay) deathCounterDisplay.style.display = 'none';
        if (checkpointDisplay) checkpointDisplay.style.display = 'none';
        if (returnButton) returnButton.style.display = 'none';
    }
    
    resetDeathCounter() {
        this.deathCount = 0;
        // Update the display without incrementing the counter
        const deathCounterDisplay = document.getElementById('deathCounter');
        if (deathCounterDisplay) {
            deathCounterDisplay.innerHTML = `
                <div style="font-size: 14px; margin-bottom: 3px;">💀</div>
                <div style="font-size: 8px;">DEATHS</div>
                <div style="font-size: 16px; margin-top: 3px;">${this.deathCount}</div>
            `;
        }
        
        // Also reset checkpoint status (without animation since it's a reset)
        this.updateCheckpointStatus(false, '', false);
    }
    
    showLevelCompleteScreen() {
        const completeScreen = document.getElementById('levelCompleteScreen');
        if (completeScreen) {
            // Update death count in the completion screen
            const statsDiv = document.getElementById('levelCompleteStats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    <div style="color: #ffffff; font-size: 1rem;">FINAL STATS</div>
                    <div style="color: #ff6b6b; font-size: 1.5rem; margin-top: 10px;">💀 Deaths: ${this.deathCount}</div>
                `;
            }
            // Show the screen
            completeScreen.style.display = 'flex';
            // Start 10-second countdown
            this.startAutoReturnCountdown();
            // Hide game UI
            this.hideGameUI();

            // Fix: Make sure the return to menu button on the level complete screen uses the correct callback
            const returnButton = document.getElementById('returnToMenuButton');
            if (returnButton) {
                returnButton.onclick = () => {
                    this.hideLevelCompleteScreen();
                    this.returnToMenu();
                };
            }
        }
    }
    
    hideLevelCompleteScreen() {
        const completeScreen = document.getElementById('levelCompleteScreen');
        if (completeScreen) {
            completeScreen.style.display = 'none';
        }
        
        // Clear countdown if running
        if (this.autoReturnTimeout) {
            clearTimeout(this.autoReturnTimeout);
            this.autoReturnTimeout = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    startAutoReturnCountdown() {
        let timeLeft = 10;
        const countdownDiv = document.getElementById('autoReturnCountdown');
        // Update countdown display every second
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            if (countdownDiv) {
                countdownDiv.innerHTML = `Returning to menu in ${timeLeft} seconds...`;
            }
            if (timeLeft <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        }, 1000);
        // Auto return after 10 seconds
        this.autoReturnTimeout = setTimeout(() => {
            this.hideLevelCompleteScreen();
            this.returnToMenu(); // Fix: Always use returnToMenu to trigger the callback and stop the game
        }, 10000);
    }
    
    createDeathMessageDisplay() {
        // Create container for death message display - centered on screen (smaller and more transparent)
        const deathMessageDisplay = document.createElement('div');
        deathMessageDisplay.id = 'deathMessage';
        deathMessageDisplay.style.position = 'absolute';
        deathMessageDisplay.style.top = '50%';
        deathMessageDisplay.style.left = '50%';
        deathMessageDisplay.style.transform = 'translate(-50%, -50%)';
        deathMessageDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // More transparent background
        deathMessageDisplay.style.color = '#ff4444';
        deathMessageDisplay.style.padding = '15px 25px'; // Reduced padding for smaller box
        deathMessageDisplay.style.borderRadius = '10px'; // Slightly smaller border radius
        deathMessageDisplay.style.fontFamily = '"Press Start 2P", Arial, sans-serif';
        deathMessageDisplay.style.fontSize = '16px'; // Reduced font size
        deathMessageDisplay.style.fontWeight = 'normal';
        deathMessageDisplay.style.zIndex = '1000';
        deathMessageDisplay.style.display = 'none';
        deathMessageDisplay.style.border = '2px solid #ff4444'; // Thinner border
        deathMessageDisplay.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.6)'; // Reduced glow
        deathMessageDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        deathMessageDisplay.style.textAlign = 'center';
        deathMessageDisplay.style.transition = 'all 0.3s ease';
        
        document.body.appendChild(deathMessageDisplay);
    }
    
    showDeathMessage(cause) {
        const deathMessageDisplay = document.getElementById('deathMessage');
        if (!deathMessageDisplay) return;
        
        // Determine the death message based on cause
        let message = '';
        let emoji = '';
        
        switch(cause) {
            case 'barrel collision':
                message = 'CRUSHED BY BARREL!';
                emoji = '🛢️💥';
                break;
            case 'falling into void':
                message = 'FELL INTO THE ABYSS!';
                emoji = '🕳️💀';
                break;
            case 'shuriken hit':
                message = 'SLICED BY SHURIKEN!';
                emoji = '🌟💥';
                break;
            default:
                message = 'YOU DIED!';
                emoji = '💀';
        }
        
        // Set the message content
        deathMessageDisplay.innerHTML = `
            <div style="font-size: 22px; margin-bottom: 8px;">${emoji}</div>
            <div>${message}</div>
        `;
        
        // Show the message with animation
        deathMessageDisplay.style.display = 'block';
        deathMessageDisplay.style.opacity = '0';
        deathMessageDisplay.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        // Animate in
        setTimeout(() => {
            deathMessageDisplay.style.opacity = '1';
            deathMessageDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);
        
        // Hide after 0.6 seconds (reduced from 1 second)
        setTimeout(() => {
            deathMessageDisplay.style.opacity = '0';
            deathMessageDisplay.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            // Completely hide after animation
            setTimeout(() => {
                deathMessageDisplay.style.display = 'none';
            }, 300);
        }, 600); // Reduced from 1000ms to 600ms
    }
    
    createReturnToMenuButton() {
        // Create the return to menu button
        const returnButton = document.createElement('button');
        returnButton.id = 'returnToMenuButton';
        returnButton.innerText = 'MENU';
        returnButton.style.position = 'absolute';
        returnButton.style.top = '20px';
        returnButton.style.left = '20px'; // Moved to top-left
        returnButton.style.padding = '10px 20px';
        returnButton.style.fontSize = '12px';
        returnButton.style.backgroundColor = '#e74c3c';
        returnButton.style.color = 'white';
        returnButton.style.border = '2px solid #c0392b';
        returnButton.style.borderRadius = '8px';
        returnButton.style.cursor = 'pointer';
        returnButton.style.fontFamily = '"Press Start 2P", Arial, sans-serif';
        returnButton.style.zIndex = '150';
        returnButton.style.display = 'none'; // Hidden by default
        returnButton.style.transition = 'all 0.2s ease';
        returnButton.style.textShadow = '1px 1px 0px #c0392b';
        returnButton.style.boxShadow = '0 4px 0 #c0392b';

        // Add hover effects
        returnButton.onmouseover = () => {
            returnButton.style.backgroundColor = '#ff6b5a';
            returnButton.style.transform = 'translateY(-2px)';
            returnButton.style.boxShadow = '0 6px 0 #c0392b';
        };
        
        returnButton.onmouseout = () => {
            returnButton.style.backgroundColor = '#e74c3c';
            returnButton.style.transform = 'translateY(0)';
            returnButton.style.boxShadow = '0 4px 0 #c0392b';
        };

        returnButton.onmousedown = () => {
            returnButton.style.transform = 'translateY(2px)';
            returnButton.style.boxShadow = '0 2px 0 #c0392b';
        };

        returnButton.onmouseup = () => {
            returnButton.style.transform = 'translateY(0)';
            returnButton.style.boxShadow = '0 4px 0 #c0392b';
        };

        // Add click event to return to menu
        returnButton.onclick = () => {
            this.returnToMenu();
        };
        
        document.body.appendChild(returnButton);
    }

    returnToMenu() {
        if (this.returnToMenuCallback) { // NEW: Execute the callback
            this.returnToMenuCallback();
        }

        this.mapManager.returnToMenu();
        this.hideGameUI(); // Hide in-game UI elements
        this.showMapSelection(); // Show the main menu
    }
}