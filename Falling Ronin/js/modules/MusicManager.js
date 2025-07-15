export class MusicManager {
    constructor() {
        this.isEnabled = false; // Start disabled by default
        this.currentTrackIndex = 0;
        this.volume = 0.99; // Default volume
        this.tracks = [
            'assets/sounds/Flute_Music.mp3',
            'assets/sounds/Japanese.mp3'
        ];
        this.audioElements = [];
        this.isPlaying = false;
        this.hasUserInteracted = false;
        
        this.initializeAudio();
        this.setupUserInteractionDetection();
    }

    setupUserInteractionDetection() {
        // Listen for any user interaction to enable audio capability
        const enableAudio = () => {
            this.hasUserInteracted = true;
            // Remove listeners after first interaction
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        };
        
        document.addEventListener('click', enableAudio);
        document.addEventListener('keydown', enableAudio);
    }

    initializeAudio() {
        // Create audio elements for each track
        this.tracks.forEach((trackPath, index) => {
            const audio = new Audio(trackPath);
            audio.volume = this.volume;
            audio.preload = 'auto';
            
            // Set up event listener for when track ends
            audio.addEventListener('ended', () => {
                if (this.isEnabled && this.isPlaying) {
                    this.playNextTrack();
                }
            });
            
            // Error handling
            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load audio track: ${trackPath}`, e);
            });
            this.audioElements.push(audio);
        });
    }

    start() {
        if (!this.isEnabled) return;
        
        this.isPlaying = true;
        this.currentTrackIndex = 0;
        
        // Only actually play if user has interacted with the page
        if (this.hasUserInteracted) {
            this.playCurrentTrack();
        }
    }

    stop() {
        // Don't reset isPlaying state, just pause the audio
        this.audioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    fullStop() {
        // Complete stop that resets playing state
        this.isPlaying = false;
        this.audioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    toggle() {
        if (!this.hasUserInteracted) {
            // Wait for user interaction first
            return this.isEnabled;
        }
        
        this.isEnabled = !this.isEnabled;
        
        if (this.isEnabled) {
            // If music was playing before, advance to next track
            if (this.isPlaying) {
                this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
                this.playCurrentTrack();
            } else {
                // Start playing music from the beginning
                this.start();
            }
        } else {
            // Stop playing music but keep track of the state
            this.stop();
        }
        
        return this.isEnabled;
    }

    playCurrentTrack() {
        if (!this.isEnabled || !this.hasUserInteracted || this.currentTrackIndex >= this.audioElements.length) return;
        
        // Stop all other tracks
        this.audioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        // Play current track
        const currentAudio = this.audioElements[this.currentTrackIndex];
        if (currentAudio) {
            currentAudio.play().catch(error => {
                console.warn(`Failed to play audio track ${this.currentTrackIndex}:`, error);
            });
        }
    }

    playNextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.playCurrentTrack();
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audioElements.forEach(audio => {
            audio.volume = this.volume;
        });
    }

    getVolume() {
        return this.volume;
    }

    getMusicEnabled() {
        return this.isEnabled;
    }

    getCurrentTrackName() {
        if (this.currentTrackIndex < this.tracks.length) {
            const trackPath = this.tracks[this.currentTrackIndex];
            return trackPath.split('/').pop().replace('.mp3', '');
        }
        return 'Unknown';
    }
}
