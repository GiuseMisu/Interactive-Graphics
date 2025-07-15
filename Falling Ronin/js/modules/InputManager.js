export class InputManager {
    constructor(gameState) {
        //CONSTRUCTOR TAKES A GAME STATE OBJECT
        // This allows the InputManager to interact with the game state informations
        // such as reference to player object, death count, checkpoints, goal etc..

        this.gameState = gameState;
        this.keys = { w: false, a: false, s: false, d: false };

        // For double-tap detection
        this.lastWPress = 0; //sprint detection
        this.lastSpacePress = 0; //jump detection
    }
    
    setupEventListeners() {
        // Set up event listeners for keydown and keyup events
        // WINDOW IS USED TO CATCH ALL THE EVENTS
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleKeyDown(event) {
        // Don't process any input if the game is in loading MODE
        // method of the LoadingManager Class that checks if the game is loading-> if so deactivate all the input
        if (window.loadingManager && window.loadingManager.getIsLoading()) {
            return;
        }
        
        // Prevent input if level is completed
        if (this.gameState && this.gameState.isLevelCompleted()) {
            //set all keys to false
            this.keys = { w: false, a: false, s: false, d: false };
            return;
        }

        const key = event.key.toLowerCase();
        
        // Movement keys
        if (['w', 'a', 's', 'd'].includes(key)) {
            // if the key is pressed, set it to true
            this.keys[key] = true;
        }
        
        // Double-tap W detection
        if (key === 'w') {
            // Get current time in milliseconds when first W is pressed
            const now = performance.now(); 
            // If W is pressed again within 300ms, start sprinting
            if (now - this.lastWPress < 300) {
                this.gameState.player?.startSprint();
            }
            // Update last W press time
            this.lastWPress = now;
        }
        
        // Jump and double jump, if space key is pressed
        // is different from the double-tap detection for sprinting
        // you can only double jump if you haven't already used it since last touching the ground.
        // This is to prevent double jumping from the air, so the check is done inside the player class not here because is not about the timingof the last press
        if (key === ' ') {
            const now = performance.now();
            this.gameState.player?.jump();
            this.lastSpacePress = now;
        }

        // Toggle camera mode with P key
        if (key === 'p') {
            if (window.cameraController) {
                window.cameraController.toggleCameraMode();
            }
        }
    }

    handleKeyUp(event) {
        // Don't process any input if loading
        if (window.loadingManager && window.loadingManager.getIsLoading()) {
            return;
        }
        // Prevent input if level is completed
        if (this.gameState && this.gameState.isLevelCompleted()) {
            //set all keys to false
            this.keys = { w: false, a: false, s: false, d: false };
            return;
        }
        const key = event.key.toLowerCase();
        
        // if keys are released, set them to false
        if (['w', 'a', 's', 'd'].includes(key)) {
            this.keys[key] = false;
        }
    }
}