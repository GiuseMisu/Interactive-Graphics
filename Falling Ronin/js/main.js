import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from './modules/Player.js';
import { GameState } from './modules/GameState.js';
import { InputManager } from './modules/InputManager.js';
import { CameraController } from './modules/CameraController.js';
import { DayNightCycle } from './modules/DayNightCycle.js'; 
import { LoadingManager } from './modules/LoadingManager.js';
import { AssetManager } from './modules/AssetManager.js';
import { ShadowManager } from './modules/ShadowManager.js';
import { MusicManager } from './modules/MusicManager.js';
import { Game } from './game.js';

// Initialize loading system
const loadingManager = new LoadingManager();
const assetManager = new AssetManager(loadingManager.getThreeLoadingManager());

// Make asset manager and loading manager globally available
window.assetManager = assetManager;
window.loadingManager = loadingManager;

// Initialize scene, renderer, and camera
const scene = new THREE.Scene();
const player = new Player(scene, assetManager); // Pass asset manager to player

//============= RENDER SETUP =============

// Set up renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//============== CAMERA SETUP =============

//camera it is the perspective camera 3D scene from a specific viewpoint
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(0, 3, 8); // Initial camera position

// Orbit controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
//placed to false because at the beginning the camera is fixed to the player
controls.enablePan = false;
controls.enableZoom = false;
controls.enableRotate = false;
controls.update();

// Create camera controller with player reference
window.cameraController = new CameraController(camera, 
                                               controls,    //ORBIT CONTROLS
                                               player.model //TARGET
                                            );

// Initialize day-night cycle
const dayNightCycle = new DayNightCycle(scene, renderer);

// Initialize game components
const gameState = new GameState();

// Initialize shadow manager
const shadowManager = new ShadowManager(scene, renderer, dayNightCycle);
gameState.setShadowManager(shadowManager);

const inputManager = new InputManager(gameState);

// Create and initialize game
const game = new Game(scene, player, assetManager, gameState); // Pass gameState to game
window.game = game;

// Initialize music manager
const musicManager = new MusicManager();
window.musicManager = musicManager; // Make it globally available

// state to control when the game is running
let gameStarted = false;
window.gameStarted = gameStarted; // Expose to window for UI access

let gameActive = false; // Controls the game loop

// Set up loading callbacks
loadingManager.setOnCompleteCallback(() => {
    console.log('All assets loaded! Game ready to start.');
    
    // Automatically start the game once loading is complete
    if (window.pendingGameStart) {
        gameStarted = true;
        window.gameStarted = true;
        gameActive = true;
        window.pendingGameStart = false;
        console.log('- Game started after loading completion!');
    }
});

//===========================================

function startGame() {
    // Clear any existing pending game start flag
    window.pendingGameStart = false;
    
    // Always allow starting, but defer actual start until loading completes
    if (loadingManager.getIsLoading()) {
        console.log('Game start requested but loading in progress. Will start after loading.');
        window.pendingGameStart = true;
    } else {
        gameStarted = true;
        window.gameStarted = true;
        gameActive = true;
        console.log('Game started immediately (no loading needed)!');
    }
}

// Pass the startGame **function** to the game already defined
game.setStartGameCallback(startGame);

//===========================================

function stopGame() {
    gameStarted = false;
    window.gameStarted = false;
    gameActive = false; // Stop game logic
    
    // Reset the loading manager state
    if (loadingManager) {
        loadingManager.reset();
    }
    // Reset the game state
    if (game) {
        game.reset();
    }
}
// Pass the stopGame **function** to the game already defined
game.setReturnToMenuCallback(stopGame);

//===========================================

// Expose stopGame function to window for UI access
window.stopGame = stopGame;

// Setup event listeners
inputManager.setupEventListeners();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate); 

    // Update game state
    const deltaTime = 1/60; // time step -> 60 frames per second = each frame takes 1/60th of a second
    
    // Update day-night cycle
    dayNightCycle.update(deltaTime);
    
    // Only update the game if it's active AND not loading
    if (gameActive && gameStarted && window.gameStarted && !loadingManager.getIsLoading()) {
        if (player.model) {
            player.update(inputManager.keys, deltaTime);
            window.cameraController.update(); // in order to follow always the player
            
            // Update player coordinates display if game is loaded
            if (game && game.ui) {
                game.ui.updateCoordinatesDisplay(player);
            }
        }
        game.update(deltaTime);
    }
    renderer.render(scene, camera);
}

// Start the game loop
animate();