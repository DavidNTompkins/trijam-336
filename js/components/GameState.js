export class GameState {
    constructor() {
        this.vitals = {
            oxygen: {
                current: 50, // Start in good range but disabled
                max: 100,
                min: 0,
                decayRate: 3, // per second
                status: 'normal',
                enabled: false // Start disabled
            },
            heartRate: {
                current: 50, // Simplified to 0-100 bar
                max: 100,
                min: 0,
                decayRate: 30, // per second
                lastBeat: Date.now(),
                status: 'normal',
                enabled: true // Start enabled
            },
            eyes: {
                moisture: 100,
                max: 100,
                min: 0,
                dryRate: 3, // slower decay initially
                lastBlink: Date.now(),
                status: 'normal',
                enabled: false // Start disabled
            }
        };

        this.suspicion = {
            current: 0,
            max: 100,
            decayRate: 0.8 // per second
        };

        this.currentEvent = null;
        this.gameTime = 0;
        this.difficulty = 1.0;
        this.isBlinking = false;
        this.audioSystem = null; // Will be set by main game
        this.gameStarted = false; // Track if actual gameplay has begun
        
        // Staged introduction timing
        this.vitalIntroduction = {
            breathingUnlockedAt: 20000, // 10 seconds after game starts
            blinkingUnlockedAt: 30000,  // 20 seconds after game starts
            breathingUnlocked: false,
            blinkingUnlocked: false
        };
    }

    update(deltaTime) {
        // Only count time and update systems if game has actually started
        if (this.gameStarted) {
            this.gameTime += deltaTime;
            
            // Handle staged vital introduction
            this.updateVitalIntroduction();
            
            // Increase difficulty over time (very gradually)
            this.difficulty = 1.0 + (this.gameTime / 120000) * 0.5; // +50% difficulty after 2 minutes
            
            this.updateVitals(deltaTime);
            this.updateSuspicion(deltaTime);
        }
        
        // Always update visual effects (for startup sequence effects)
        this.updateVisualEffects();
    }

    startGame() {
        this.gameStarted = true;
        this.gameTime = 0; // Reset timer to 0 when game actually starts
        console.log('🎮 Game timer started - vital systems will unlock over time');
    }

    updateVitalIntroduction() {
        // Debug: Log current game time every few seconds
        if (Math.floor(this.gameTime / 1000) % 5 === 0 && this.gameTime % 1000 < 100) {
            console.log(`⏰ Game time: ${Math.floor(this.gameTime / 1000)}s | Breathing: ${this.vitals.oxygen.enabled} | Eyes: ${this.vitals.eyes.enabled}`);
        }
        
        // Unlock breathing at 10 seconds
        if (!this.vitalIntroduction.breathingUnlocked && this.gameTime >= this.vitalIntroduction.breathingUnlockedAt) {
            this.vitalIntroduction.breathingUnlocked = true;
            this.vitals.oxygen.enabled = true;
            this.vitals.oxygen.current = 50; // Start at good level
            this.showVitalAlert("RESPIRATORY SYSTEM ONLINE - Press [H] to breathe!", 'info');
            if (this.audioSystem) this.audioSystem.playAlert();
            console.log('🫁 Breathing system unlocked at', Math.floor(this.gameTime / 1000), 'seconds!');
        }
        
        // Unlock blinking at 20 seconds
        if (!this.vitalIntroduction.blinkingUnlocked && this.gameTime >= this.vitalIntroduction.blinkingUnlockedAt) {
            this.vitalIntroduction.blinkingUnlocked = true;
            this.vitals.eyes.enabled = true;
            this.vitals.eyes.moisture = 100; // Start at full
            this.showVitalAlert("OCULAR SYSTEM ONLINE - Press [E] to blink!", 'info');
            if (this.audioSystem) this.audioSystem.playAlert();
            console.log('👁️ Blinking system unlocked at', Math.floor(this.gameTime / 1000), 'seconds!');
        }
    }

    updateVitals(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds

        // Oxygen decreases over time (only if enabled)
        if (this.vitals.oxygen.enabled) {
            this.vitals.oxygen.current -= this.vitals.oxygen.decayRate * dt * this.difficulty;
            this.vitals.oxygen.current = Math.max(0, Math.min(this.vitals.oxygen.max, this.vitals.oxygen.current));
        }

        // Eye moisture decreases over time (only if enabled)
        if (this.vitals.eyes.enabled) {
            this.vitals.eyes.moisture -= this.vitals.eyes.dryRate * dt * this.difficulty;
            this.vitals.eyes.moisture = Math.max(0, Math.min(this.vitals.eyes.max, this.vitals.eyes.moisture));
        }

        // Heart rate decreases over time (always enabled)
        if (this.vitals.heartRate.enabled) {
            this.vitals.heartRate.current -= this.vitals.heartRate.decayRate * dt * this.difficulty;
        }
        
        // Apply running effects if in running event
        if (this.currentEvent && this.currentEvent.type === 'runningWoods') {
            // Running drains oxygen faster
            this.vitals.oxygen.current -= 0.8 * dt * this.difficulty;
            // Running increases heart rate decay
            this.vitals.heartRate.current -= 3 * dt * this.difficulty;
        }
        
        this.vitals.heartRate.current = Math.max(0, Math.min(this.vitals.heartRate.max, this.vitals.heartRate.current));

        // Update vital statuses
        this.updateVitalStatuses();
    }

    updateVitalStatuses() {
        // Oxygen status (only if enabled)
        if (this.vitals.oxygen.enabled) {
            if (this.vitals.oxygen.current < 20) {
                this.vitals.oxygen.status = 'critical';
            } else if (this.vitals.oxygen.current < 40) {
                this.vitals.oxygen.status = 'low';
            } else if (this.vitals.oxygen.current > 80) {
                this.vitals.oxygen.status = 'high';
            } else {
                this.vitals.oxygen.status = 'normal';
            }
        } else {
            this.vitals.oxygen.status = 'offline';
        }

        // Heart rate status (only if enabled)
        if (this.vitals.heartRate.enabled) {
            if (this.vitals.heartRate.current < 20) {
                this.vitals.heartRate.status = 'low';
            } else if (this.vitals.heartRate.current > 80) {
                this.vitals.heartRate.status = 'high';
            } else {
                this.vitals.heartRate.status = 'normal';
            }
        } else {
            this.vitals.heartRate.status = 'offline';
        }

        // Eyes status (only if enabled)
        if (this.vitals.eyes.enabled) {
            if (this.vitals.eyes.moisture < 30) {
                this.vitals.eyes.status = 'dry';
            } else {
                this.vitals.eyes.status = 'normal';
            }
        } else {
            this.vitals.eyes.status = 'offline';
        }
    }

    updateSuspicion(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Suspicion decays over time
        this.suspicion.current -= this.suspicion.decayRate * dt;
        this.suspicion.current = Math.max(0, Math.min(this.suspicion.max, this.suspicion.current));
    }

    updateVisualEffects() {
        const body = document.body;
        
        // Remove all effects first
        body.classList.remove('oxygen-low', 'oxygen-high', 'blurred');

        // Build combined filter effects
        let filters = [];
        let hasOxygenEffect = false;
        
        // Apply gradual oxygen effects based on current level (only if enabled)
        if (this.vitals.oxygen.enabled) {
            const oxygenPercent = this.vitals.oxygen.current / this.vitals.oxygen.max;
            
            if (oxygenPercent < 0.4) {
                // Gradual darkening from 40% to 0% oxygen
                // At 40% oxygen: normal brightness (1.0)
                // At 0% oxygen: very dark brightness (0.15)
                const darknessIntensity = 1 - (oxygenPercent / 0.4); // 0 to 1
                const brightness = 1.0 - (darknessIntensity * 0.85); // 1.0 to 0.15
                const contrast = 1.0 + (darknessIntensity * 0.2); // 1.0 to 1.2
                filters.push(`brightness(${brightness.toFixed(2)})`, `contrast(${contrast.toFixed(2)})`);
                hasOxygenEffect = true;
            } else if (oxygenPercent > 0.8) {
                // Gradual brightening from 80% to 100% oxygen
                // At 80% oxygen: normal brightness (1.0)
                // At 100% oxygen: very bright (1.8)
                const brightnessIntensity = (oxygenPercent - 0.8) / 0.2; // 0 to 1
                const brightness = 1.0 + (brightnessIntensity * 0.8); // 1.0 to 1.8
                const contrast = 1.0 - (brightnessIntensity * 0.3); // 1.0 to 0.7
                filters.push(`brightness(${brightness.toFixed(2)})`, `contrast(${contrast.toFixed(2)})`);
                hasOxygenEffect = true;
            }
        }

        // Apply eye moisture effects (can combine with oxygen, only if enabled)
        if (this.vitals.eyes.enabled && this.vitals.eyes.status === 'dry') {
            filters.push('blur(2px)');
        }
        
        // Apply combined filter
        if (filters.length > 0) {
            body.style.filter = filters.join(' ');
            body.style.transition = 'filter 0.5s ease';
        } else {
            body.style.filter = 'none';
        }
        
        // Check for extreme levels and show alerts
        this.checkExtremeVitals();
    }

    checkExtremeVitals() {
        const now = Date.now();
        
        // Prevent spam by limiting alerts to once every 3 seconds for each type
        if (!this.lastAlertTimes) {
            this.lastAlertTimes = {};
        }
        
        // Check for extreme oxygen levels (only if enabled)
        if (this.vitals.oxygen.enabled) {
            if (this.vitals.oxygen.current <= 5 && (!this.lastAlertTimes.oxygen || now - this.lastAlertTimes.oxygen > 2000)) {
                this.showVitalAlert("You're turning blue! Press [H] to BREATHE!", 'danger');
                this.addSuspicion(3, 'Oxygen critically low');
                this.lastAlertTimes.oxygen = now;
            } else if (this.vitals.oxygen.current >= 90 && (!this.lastAlertTimes.hyperventilating || now - this.lastAlertTimes.hyperventilating > 2000)) {
                this.showVitalAlert("You're gasping! Stop pressing [H] - hyperventilating!", 'warning');
                this.addSuspicion(2, 'Hyperventilating');
                this.lastAlertTimes.hyperventilating = now;
            }
        }
        
        // Check for extreme heart rate (only if enabled)
        if (this.vitals.heartRate.enabled) {
            if (this.vitals.heartRate.current <= 5 && (!this.lastAlertTimes.heartLow || now - this.lastAlertTimes.heartLow > 2000)) {
                this.showVitalAlert("Heart rate critical! Press [B] to BEAT!", 'danger');
                this.addSuspicion(3, 'Heart rate too low');
                this.lastAlertTimes.heartLow = now;
            } else if (this.vitals.heartRate.current >= 95 && (!this.lastAlertTimes.heartHigh || now - this.lastAlertTimes.heartHigh > 2000)) {
                this.showVitalAlert("Heart racing! Stop pressing [B] so much!", 'warning');
                this.addSuspicion(2, 'Heart rate too high');
                this.lastAlertTimes.heartHigh = now;
            }
        }
        
        // Check for dry eyes (only if enabled)
        if (this.vitals.eyes.enabled && this.vitals.eyes.moisture <= 10 && (!this.lastAlertTimes.eyes || now - this.lastAlertTimes.eyes > 2000)) {
            this.showVitalAlert("Eyes extremely dry! Press [E] to BLINK!", 'warning');
            this.addSuspicion(2, 'Eyes too dry');
            this.lastAlertTimes.eyes = now;
        }
    }

    showVitalAlert(message, type = 'warning') {
        // Create or get the alert container that exists outside the filtered body
        let alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alert-container';
            alertContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                z-index: 10000;
                filter: none !important;
            `;
            document.documentElement.appendChild(alertContainer); // Add to html element, not body
        }
        
        // Count existing alerts to stack them vertically
        const existingAlerts = alertContainer.querySelectorAll('.vital-alert');
        const alertIndex = existingAlerts.length;
        const alertHeight = 60; // Height of each alert
        const alertSpacing = 10; // Space between alerts
        
        const alert = document.createElement('div');
        alert.className = `vital-alert ${type}`;
        alert.textContent = message;
        alert.style.cssText = `
            position: absolute;
            top: ${50 + (alertIndex * (alertHeight + alertSpacing))}px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'danger' ? 'rgba(255, 0, 0, 0.9)' : type === 'info' ? 'rgba(0, 165, 255, 0.9)' : 'rgba(255, 165, 0, 0.9)'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 1;
            filter: none !important;
            animation: alertPulse 0.5s ease-in-out;
            pointer-events: auto;
            max-width: 400px;
            text-align: center;
            box-sizing: border-box;
            min-height: ${alertHeight}px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 2000);
    }

    // Actions
    breathe() {
        if (!this.vitals.oxygen.enabled) return; // Can't breathe if not unlocked
        
        this.vitals.oxygen.current += 15;
        this.vitals.oxygen.current = Math.min(this.vitals.oxygen.max, this.vitals.oxygen.current);
        
        if (this.vitals.oxygen.current > 90) {
            this.addSuspicion(3, 'Hyperventilating');
        }
    }

    heartbeat() {
        // Simplified - add about half the bar
        this.vitals.heartRate.current += 30;
        this.vitals.heartRate.current = Math.min(this.vitals.heartRate.max, this.vitals.heartRate.current);
        
        this.vitals.heartRate.lastBeat = Date.now();
    }

    blink() {
        if (!this.vitals.eyes.enabled) return; // Can't blink if not unlocked
        
        this.isBlinking = true;
        this.vitals.eyes.moisture = this.vitals.eyes.max;
        this.vitals.eyes.lastBlink = Date.now();
        
        // Apply blink effect
        document.body.classList.add('blinking');
        
        setTimeout(() => {
            this.isBlinking = false;
            document.body.classList.remove('blinking');
        }, 300);
    }

    addSuspicion(amount, reason = '') {
        this.suspicion.current += amount;
        this.suspicion.current = Math.min(this.suspicion.max, this.suspicion.current);
        
        if (reason) {
            console.log(`⚠️ Suspicion +${amount}: ${reason}`);
        }
        
        // Game over if suspicion maxed out
        if (this.suspicion.current >= this.suspicion.max) {
            this.gameOver('Maximum suspicion reached');
        }
    }

    gameOver(reason) {
        console.log(`💀 Game Over: ${reason}`);
        // TODO: Implement game over screen
    }

    // Getters for UI
    getOxygenPercentage() {
        return (this.vitals.oxygen.current / this.vitals.oxygen.max) * 100;
    }

    getHeartRateDisplay() {
        return Math.round(this.vitals.heartRate.current);
    }
    
    getHeartRatePercentage() {
        return (this.vitals.heartRate.current / this.vitals.heartRate.max) * 100;
    }

    getEyesPercentage() {
        return (this.vitals.eyes.moisture / this.vitals.eyes.max) * 100;
    }

    getSuspicionPercentage() {
        return (this.suspicion.current / this.suspicion.max) * 100;
    }
}