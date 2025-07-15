import * as THREE from 'three';

export class DayNightCycle {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Time management
        this.time = 0; // Current time in the cycle (0-1)
        this.cycleDuration = 120; // 120 (default) Duration in seconds for full cycle
        this.timeSpeed = 1; // Speed multiplier
        
        // Lighting
        this.sunLight = null;
        this.moonLight = null;
        this.ambientLight = null;
        
        // Celestial bodies
        this.sun = null;
        this.moon = null;
        
        // Particle systems for atmospheric effects
        this.stars = null;
        // Sky colors 
        this.skyColors = {
                day: {
                    top: new THREE.Color(0x5DADE2),    // Lighter blue at top
                    horizon: new THREE.Color(0xAED6F1), // Pale blue at horizon
                    sun: new THREE.Color(0xFEF9E7)     // Warm near sun
                },
                sunset: {
                    top: new THREE.Color(0x5D6D7E),    // Lighter blue-gray 
                    horizon: new THREE.Color(0xE67E22), // Softer orange
                    sun: new THREE.Color(0xF39C12)     // Golden orange
                },
                night: {
                    top: new THREE.Color(0x2C3E50),    // Less dark blue at top
                    horizon: new THREE.Color(0x34495E), // Lighter at horizon
                    moon: new THREE.Color(0x7F8C8D),   // Lighter gray near moon
                    sun: new THREE.Color(0x5D6D7E)     // Lighter fallback color
                },
                sunrise: {
                    top: new THREE.Color(0x5D6D7E),    // Lighter gray-blue
                    horizon: new THREE.Color(0xF7DC6F), // Golden yellow
                    sun: new THREE.Color(0xF1948A)     // Soft pink-orange
                }
            };
        
        this.initializeLighting();
        this.createCelestialBodies();
        this.createSkyGradient();
        this.createAtmosphericEffects();
        this.setupShadows();
    }
      
    initializeLighting() {
        // Sun light (directional)
        this.sunLight = new THREE.DirectionalLight(0xFFFFE0, 1.2);  // Increased intensity
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.1;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -20;
        this.sunLight.shadow.camera.right = 20;
        this.sunLight.shadow.camera.top = 20;
        this.sunLight.shadow.camera.bottom = -20;
        this.scene.add(this.sunLight);
        
        // Moon light (directional, brighter for better night visibility)
        this.moonLight = new THREE.DirectionalLight(0xB0C4DE, 0.8); // Increased intensity
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 1024;
        this.moonLight.shadow.mapSize.height = 1024;
        this.scene.add(this.moonLight);
        
        // Ambient light (even brighter for night)
        this.ambientLight = new THREE.AmbientLight(0x606060, 0.75); // Increased intensity and lightness
        this.scene.add(this.ambientLight);
    }
    
    createCelestialBodies() {
        // Create realistic Sun with animated surface
        this.createRealisticSun();
        
        // Create realistic Moon with crater texture
        this.createRealisticMoon();
    }


    
    createSkyGradient() {
        // Create a large sphere for sky gradient background
        const skyGeometry = new THREE.SphereGeometry(165, 32, 32); // originally 80, increased for better coverage on map2
        
        // Create vertex colors for gradient effect
        const vertexColors = [];
        const positionAttribute = skyGeometry.attributes.position;
        
        for (let i = 0; i < positionAttribute.count; i++) {
            const y = positionAttribute.getY(i);
            const normalizedY = (y + 80) / 160; // Normalize to 0-1
            
            // Default day colors
            const color = new THREE.Color();
            color.lerpColors(this.skyColors.day.horizon, this.skyColors.day.top, normalizedY);
            
            vertexColors.push(color.r, color.g, color.b);
        }
        
        skyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        
        const skyMaterial = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.BackSide,
            fog: false
        });
        
        this.skyGradientMesh = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skyGradientMesh);
        
        // Set initial background color to prevent white screen
        this.scene.background = this.skyColors.day.horizon;
        
        // Force initial sky gradient update
        setTimeout(() => {
            this.updateSkyGradient();
        }, 100);
    }
    
    createAtmosphericEffects() {
        // Create stars for night time
        this.createStars();
    }

    createRealisticSun() {
        // Create simple sphere - keep surface deformation for shape variety
        const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        
        // Keep subtle deformation for non-perfect sphere
        const positions = sunGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Light surface irregularities
            const noise = (Math.random() - 0.5) * 0.02;
            const length = Math.sqrt(x * x + y * y + z * z);
            positions[i] = x * (1 + noise);
            positions[i + 1] = y * (1 + noise);
            positions[i + 2] = z * (1 + noise);
        }
        
        sunGeometry.attributes.position.needsUpdate = true;
        sunGeometry.computeVertexNormals();
        
        // Simple yellow/orange material
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,  // Golden yellow
            transparent: false
        });
        
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        // Sun should never cast shadows - it's a light source!
        this.sun.castShadow = false;
        this.sun.receiveShadow = false;
        this.scene.add(this.sun);
    }

    
    createRealisticMoon() {
        // Create simple sphere - keep surface deformation for shape variety
        const moonGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        
        // Keep subtle deformation for non-perfect sphere
        const positions = moonGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Light surface irregularities
            const noise = (Math.random() - 0.5) * 0.015;
            const length = Math.sqrt(x * x + y * y + z * z);
            positions[i] = x * (1 + noise);
            positions[i + 1] = y * (1 + noise);
            positions[i + 2] = z * (1 + noise);
        }
        
        moonGeometry.attributes.position.needsUpdate = true;
        moonGeometry.computeVertexNormals();
        
        // Simple gray material
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xC0C0C0,  // Light gray
            transparent: false
        });
        
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        // Moon should never cast shadows - it's a light source!
        this.moon.castShadow = false;
        this.moon.receiveShadow = false;
        this.scene.add(this.moon);
    }

    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // Create stars in a sphere around the scene
            const radius = 130 + Math.random() * 10; //previously 70, increased due to map2 being 
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            // Variable star sizes
            sizes[i] = 0.8 + Math.random() * 0.8; // Range from 0.8 to 1.6
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.8,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: false
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.stars.visible = false;
        this.scene.add(this.stars);
    }
    
    setupShadows() {
        if (this.renderer) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
    }
    
    update(deltaTime) {
        // Update time
        this.time += (deltaTime * this.timeSpeed) / this.cycleDuration;
        if (this.time > 1) this.time -= 1;
        
        this.updateCelestialPositions();
        this.updateVisibility();
        this.updateAtmosphericEffects(deltaTime);
        this.updateLighting();
        this.updateSkyGradient();
    }

    updateVisibility() {
        const sunHeight = this.sun.position.y;
        const moonHeight = this.moon.position.y;
        
        this.sun.visible = sunHeight > 0;
        this.moon.visible = moonHeight > 0;
    }
    
    updateAtmosphericEffects(deltaTime) {
        const sunHeight = this.sun.position.y / 30;
        
        // Stars visibility and twinkling
        if (sunHeight < -0.1) {
            this.stars.visible = true;
            this.stars.material.opacity = 0.7 + Math.sin(this.time * 8) * 0.2;
            this.stars.rotation.y += deltaTime * 0.01;
        } else {
            this.stars.visible = false;
        }
    }
    
    updateCelestialPositions() {
        const radius = 50; // Increased radius to move trajectory further
        const xOffset = -10; // Adjusted offset for better positioning
        const yOffset = 15; 

        // Basic sun movement - simple arc across sky
        const sunAngle = this.time * Math.PI * 2 - Math.PI/2;
        this.sun.position.set(
            Math.cos(sunAngle) * radius + xOffset,
            Math.sin(sunAngle) * radius * 0.7 + yOffset, // Flatten arc slightly
            Math.sin(sunAngle * 0.2) * 3 // Small depth variation
        );

        // Moon follows opposite path with small offset
        const moonAngle = sunAngle + Math.PI;
        this.moon.position.set(
            Math.cos(moonAngle) * radius + xOffset,
            Math.sin(moonAngle) * radius * 0.7 + yOffset,
            Math.sin(moonAngle * 0.3) * 2 // Different depth pattern
        );
                
        // Update light positions
        this.sunLight.position.copy(this.sun.position);
        this.moonLight.position.copy(this.moon.position);
        
        this.sunLight.target.position.set(0, 0, 0);
        this.moonLight.target.position.set(0, 0, 0);
    }    
    
    updateLighting() {
        const sunHeight = Math.max(0, this.sun.position.y / 60);
        const moonHeight = Math.max(0, this.moon.position.y / 60);
        
        // Significantly improve transition between day and night with higher minimum intensities
        const minBaseIntensity = 0.6; // Increased minimum intensity for better visibility during transitions
        
        // Always ensure some light is present by having a minimum intensity
        if (this.sun.visible && sunHeight > 0) {
            this.sunLight.intensity = Math.max(minBaseIntensity, sunHeight * 1.5); // Further increased brightness
        } else {
            this.sunLight.intensity = minBaseIntensity * 0.5; // Keep some minimal sun light even when "off"
        }
        
        if (this.moon.visible && moonHeight > 0) {
            this.moonLight.intensity = Math.max(minBaseIntensity, moonHeight * 1.5); // Further increased brightness
        } else {
            this.moonLight.intensity = minBaseIntensity * 0.5; // Keep some minimal moon light even when "off"
        }
        
        // Significantly improved ambient light calculation with higher base values
        let ambientIntensity;
        if (this.sun.visible && sunHeight > 0) {
            ambientIntensity = 0.7 + sunHeight * 0.3; // Much higher base for daylight
        } else if (this.moon.visible && moonHeight > 0) {
            ambientIntensity = 0.65 + moonHeight * 0.2; // Much higher base for night
        } else {
            // Ensure HIGHER minimum intensity during transitions
            ambientIntensity = 0.6; // Significantly increased for better visibility
        }
        
        this.ambientLight.intensity = ambientIntensity;
        
        // Enhanced colors for better visibility with brighter tones
        if (this.sun.visible && sunHeight > 0.1) {
            this.sunLight.color.setHex(0xFFFFF0); // Slightly warmer daylight
            this.ambientLight.color.setHex(0xB0E0FF); // Brighter sky blue
        } else if (this.sun.visible && sunHeight > 0) {
            this.sunLight.color.setHex(0xFFAA77); // Brighter, warmer orange for sunset
            this.ambientLight.color.setHex(0xFFBB99); // Brighter salmon for sunset
        } else if (this.moon.visible) {
            this.moonLight.color.setHex(0xE0F0FF); // Brighter, more visible moonlight
            this.ambientLight.color.setHex(0xAAC8E0); // Brighter blue for night
        } else {
            this.ambientLight.color.setHex(0x9CB0C8); // Much brighter gray-blue for transitions
        }

        // Apply improved shadow settings for better visibility
        if (this.sunLight.shadow) {
            this.sunLight.shadow.bias = -0.0005; // Reduce shadow acne
            this.sunLight.shadow.darkness = 0.1; // Make shadows less dark
        }
        if (this.moonLight.shadow) {
            this.moonLight.shadow.bias = -0.0005;
            this.moonLight.shadow.darkness = 0.1;
        }
    }
    
        
    updateSkyGradient() {
        const sunHeight = this.sun.position.y / 60; // Updated from 30 to 60
        const colorAttribute = this.skyGradientMesh.geometry.attributes.color;
        const positionAttribute = this.skyGradientMesh.geometry.attributes.position;
        
        // ...rest of the method stays the same...
        let currentColors;
        
        // More realistic transition phases with smoother color blending
        if (sunHeight > 0.2) {
            // Full day
            currentColors = this.skyColors.day;
        } else if (sunHeight > 0.05) {
            // Late afternoon / early sunset
            const factor = (sunHeight - 0.05) / 0.15;
            currentColors = {
                top: new THREE.Color().lerpColors(this.skyColors.sunset.top, this.skyColors.day.top, factor),
                horizon: new THREE.Color().lerpColors(this.skyColors.sunset.horizon, this.skyColors.day.horizon, factor),
                sun: new THREE.Color().lerpColors(this.skyColors.sunset.sun, this.skyColors.day.sun, factor)
            };
        } else if (sunHeight > -0.05) {
            // Sunset/sunrise period
            const factor = (sunHeight + 0.05) / 0.1;
            
            const mutedSunset = {
                top: new THREE.Color(0x34495E),
                horizon: new THREE.Color(0xE67E22),
                sun: new THREE.Color(0xF39C12)
            };
            
            currentColors = {
                top: new THREE.Color().lerpColors(this.skyColors.night.top, mutedSunset.top, factor),
                horizon: new THREE.Color().lerpColors(this.skyColors.night.horizon, mutedSunset.horizon, factor),
                sun: new THREE.Color().lerpColors(this.skyColors.night.moon, mutedSunset.sun, factor)
            };
        } else if (sunHeight > -0.2) {
            // Early twilight
            const factor = (sunHeight + 0.2) / 0.15;
            
            const twilightColors = {
                top: new THREE.Color(0x2C3E50),
                horizon: new THREE.Color(0x34495E),
                sun: new THREE.Color(0x5D6D7E)
            };
            
            currentColors = {
                top: new THREE.Color().lerpColors(this.skyColors.night.top, twilightColors.top, factor),
                horizon: new THREE.Color().lerpColors(this.skyColors.night.horizon, twilightColors.horizon, factor),
                sun: new THREE.Color().lerpColors(this.skyColors.night.moon, twilightColors.sun, factor)
            };
        } else {
            // Full night
            currentColors = this.skyColors.night;
        }
        
        // Update vertex colors with adjusted distance calculations
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);
            const z = positionAttribute.getZ(i);
            
            const normalizedY = (y + 80) / 160;
            
            let celestialInfluence = 0;
            let celestialColor;
            
            if (this.sun.visible && sunHeight > 0.05) {
                const distToSun = Math.sqrt(
                    Math.pow(x - this.sun.position.x * 1.3, 2) + // Adjusted multiplier for new distance
                    Math.pow(y - this.sun.position.y * 1.3, 2) +
                    Math.pow(z - this.sun.position.z * 1.3, 2)
                );
                celestialInfluence = Math.max(0, 1 - distToSun / 80) * 0.25; // Adjusted for new distance
                celestialColor = currentColors.sun;
            } else if (this.moon.visible && sunHeight < -0.1) {
                const distToMoon = Math.sqrt(
                    Math.pow(x - this.moon.position.x * 1.3, 2) +
                    Math.pow(y - this.moon.position.y * 1.3, 2) +
                    Math.pow(z - this.moon.position.z * 1.3, 2)
                );
                celestialInfluence = Math.max(0, 1 - distToMoon / 60) * 0.1; // Adjusted for new distance
                celestialColor = currentColors.moon || currentColors.sun;
            }
            
            const baseColor = new THREE.Color();
            baseColor.lerpColors(currentColors.horizon, currentColors.top, normalizedY);
            
            if (celestialInfluence > 0 && celestialColor) {
                baseColor.lerp(celestialColor, celestialInfluence);
            }
            
            colorAttribute.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
        }
        
        colorAttribute.needsUpdate = true;
}


    // Utility methods
    setTimeOfDay(timeValue) {
        this.time = Math.max(0, Math.min(1, timeValue));
    }
    
    setTimeSpeed(speed) {
        this.timeSpeed = speed;
    }
    
    getCurrentTimeOfDay() {
        if (this.time < 0.25 || this.time > 0.75) return 'night';
        if (this.time > 0.4 && this.time < 0.6) return 'day';
        return 'twilight';
    }
}