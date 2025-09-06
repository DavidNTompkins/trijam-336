export class VitalSystems {
    constructor(gameState) {
        this.gameState = gameState;
        this.vitalsDisplay = document.getElementById('vitals-display');
        this.statusDisplay = document.getElementById('status-display');
        
        this.updateInterval = 100; // Update UI every 100ms
        this.lastUpdate = 0;
    }

    init() {
        this.createVitalsUI();
        this.createStatusUI();
    }

    createVitalsUI() {
        this.vitalsDisplay.innerHTML = `
            <div class="vital-item">
                <div class="vital-label">OXYGEN LEVELS</div>
                <div class="vital-bar">
                    <div class="vital-bar-fill oxygen-bar" id="oxygen-bar"></div>
                    <div class="vital-value" id="oxygen-value">50%</div>
                </div>
                <div class="vital-controls">[H] - BREATHE</div>
            </div>

            <div class="vital-item">
                <div class="vital-label">HEART RATE</div>
                <div class="vital-bar">
                    <div class="vital-bar-fill heart-bar" id="heart-bar"></div>
                    <div class="vital-value" id="heart-value">50%</div>
                </div>
                <div class="vital-controls">[B] - BEAT</div>
            </div>

            <div class="vital-item">
                <div class="vital-label">EYE MOISTURE</div>
                <div class="vital-bar">
                    <div class="vital-bar-fill eyes-bar" id="eyes-bar"></div>
                    <div class="vital-value" id="eyes-value">100%</div>
                </div>
                <div class="vital-controls">[E] - BLINK</div>
            </div>

            <div class="vital-item" id="running-vital" style="display: none;">
                <div class="vital-label">DISTANCE COVERED</div>
                <div class="vital-bar">
                    <div class="vital-bar-fill heart-bar" id="distance-bar"></div>
                    <div class="vital-value" id="distance-value">0%</div>
                </div>
                <div class="vital-controls">[D] LEFT / [F] RIGHT</div>
            </div>

            <div class="vital-item" id="coffee-eye-contact" style="display: none;">
                <div class="vital-label">EYE CONTACT</div>
                <div class="vital-bar">
                    <div class="vital-bar-fill eyes-bar" id="eye-contact-bar"></div>
                    <div class="vital-value" id="eye-contact-value">50%</div>
                </div>
                <div class="vital-controls">[R] - TOGGLE CONTACT</div>
            </div>

            <div class="vital-item" id="coffee-swallow" style="display: none;">
                <div class="vital-label">SALIVA CONTROL</div>
                <div class="vital-bar">
                    <div class="vital-bar-fill oxygen-bar" id="swallow-bar"></div>
                    <div class="vital-value" id="swallow-value">OK</div>
                </div>
                <div class="vital-controls">[S] - SWALLOW</div>
            </div>
        `;
    }

    createStatusUI() {
        this.statusDisplay.innerHTML = `
            <div class="status-item">
                <div class="vital-label">MISSION STATUS</div>
                <div id="mission-status">ACTIVE - MAINTAIN COVER</div>
            </div>

            <div class="status-item">
                <div class="vital-label">CURRENT ACTIVITY</div>
                <div id="current-activity">IDLE - AWAITING ORDERS</div>
            </div>

            <div class="status-item">
                <div class="vital-label">SYSTEM ALERTS</div>
                <div id="system-alerts">
                    <div>• Respiratory monitoring: ON</div>
                    <div>• Cardiac regulation: ON</div>
                    <div>• Ocular maintenance: ON</div>
                </div>
            </div>

            <div class="vital-item">
                <div class="vital-label danger">SUSPICION LEVEL</div>
                <div class="suspicion-meter">
                    <div class="suspicion-fill" id="suspicion-fill"></div>
                    <div class="suspicion-label" id="suspicion-label">0%</div>
                </div>
                <div style="font-size: 10px; color: #ff8888; margin-top: 5px;">
                    Keep this low to avoid detection
                </div>
            </div>
        `;
    }

    update(deltaTime) {
        this.lastUpdate += deltaTime;
        
        if (this.lastUpdate >= this.updateInterval) {
            this.updateVitalsDisplay();
            this.updateStatusDisplay();
            this.lastUpdate = 0;
        }
    }

    updateVitalsDisplay() {
        // Show/hide vitals based on enabled status
        const vitalItems = document.querySelectorAll('.vital-item');
        vitalItems.forEach((item, index) => {
            if (index === 0) { // Oxygen
                item.style.opacity = this.gameState.vitals.oxygen.enabled ? '1' : '0.3';
                item.style.pointerEvents = this.gameState.vitals.oxygen.enabled ? 'auto' : 'none';
            } else if (index === 1) { // Heart rate
                item.style.opacity = this.gameState.vitals.heartRate.enabled ? '1' : '0.3';
                item.style.pointerEvents = this.gameState.vitals.heartRate.enabled ? 'auto' : 'none';
            } else if (index === 2) { // Eyes
                item.style.opacity = this.gameState.vitals.eyes.enabled ? '1' : '0.3';
                item.style.pointerEvents = this.gameState.vitals.eyes.enabled ? 'auto' : 'none';
            }
        });

        // Oxygen
        const oxygenBar = document.getElementById('oxygen-bar');
        const oxygenValue = document.getElementById('oxygen-value');
        const oxygenPercent = this.gameState.getOxygenPercentage();
        
        if (oxygenBar && oxygenValue) {
            oxygenBar.style.width = this.gameState.vitals.oxygen.enabled ? `${oxygenPercent}%` : '0%';
            oxygenValue.textContent = this.gameState.vitals.oxygen.enabled ? `${Math.round(oxygenPercent)}%` : 'OFFLINE';
            
            // Color coding based on status
            oxygenValue.className = 'vital-value';
            if (this.gameState.vitals.oxygen.enabled) {
                if (this.gameState.vitals.oxygen.status === 'critical') {
                    oxygenValue.classList.add('danger');
                } else if (this.gameState.vitals.oxygen.status === 'low') {
                    oxygenValue.classList.add('warning');
                } else if (this.gameState.vitals.oxygen.status === 'high') {
                    oxygenValue.classList.add('warning');
                }
            }
        }

        // Heart Rate
        const heartBar = document.getElementById('heart-bar');
        const heartValue = document.getElementById('heart-value');
        const heartPercent = this.gameState.getHeartRatePercentage();
        
        if (heartBar && heartValue) {
            heartBar.style.width = `${heartPercent}%`;
            heartValue.textContent = `${Math.round(heartPercent)}%`;
            
            heartValue.className = 'vital-value';
            if (this.gameState.vitals.heartRate.status === 'low') {
                heartValue.classList.add('danger');
            } else if (this.gameState.vitals.heartRate.status === 'high') {
                heartValue.classList.add('warning');
            }
        }

        // Eyes
        const eyesBar = document.getElementById('eyes-bar');
        const eyesValue = document.getElementById('eyes-value');
        const eyesPercent = this.gameState.getEyesPercentage();
        
        if (eyesBar && eyesValue) {
            eyesBar.style.width = this.gameState.vitals.eyes.enabled ? `${eyesPercent}%` : '0%';
            eyesValue.textContent = this.gameState.vitals.eyes.enabled ? `${Math.round(eyesPercent)}%` : 'OFFLINE';
            
            eyesValue.className = 'vital-value';
            if (this.gameState.vitals.eyes.enabled && this.gameState.vitals.eyes.status === 'dry') {
                eyesValue.classList.add('warning');
            }
        }

        // Running Distance (during running events)
        if (this.gameState.currentEvent && this.gameState.currentEvent.type === 'runningWoods') {
            const runningVital = document.getElementById('running-vital');
            const distanceBar = document.getElementById('distance-bar');
            const distanceValue = document.getElementById('distance-value');
            
            if (runningVital) runningVital.style.display = 'block';
            
            if (distanceBar && distanceValue) {
                // Access running state from event manager through game state
                const distance = this.gameState.currentEvent.runningState?.distance || 0;
                distanceBar.style.width = `${distance}%`;
                distanceValue.textContent = `${Math.round(distance)}%`;
                
                distanceValue.className = 'vital-value';
                if (distance < 30) {
                    distanceValue.classList.add('danger');
                } else if (distance < 60) {
                    distanceValue.classList.add('warning');
                } else {
                    distanceValue.classList.add('success');
                }
            }
        } else {
            // Hide running vital when not in running event
            const runningVital = document.getElementById('running-vital');
            if (runningVital) runningVital.style.display = 'none';
        }

        // Coffee Event Controls
        if (this.gameState.currentEvent && this.gameState.currentEvent.type === 'orderCoffee') {
            // Show coffee controls
            const eyeContactVital = document.getElementById('coffee-eye-contact');
            const swallowVital = document.getElementById('coffee-swallow');
            
            if (eyeContactVital) eyeContactVital.style.display = 'block';
            if (swallowVital) swallowVital.style.display = 'block';
            
            // Update eye contact bar using actual conversation state
            const eyeContactBar = document.getElementById('eye-contact-bar');
            const eyeContactValue = document.getElementById('eye-contact-value');
            
            if (eyeContactBar && eyeContactValue) {
                const conversationState = this.gameState.currentEvent.conversationState;
                const eyeContactLevel = conversationState ? conversationState.eyeContactLevel : 50;
                eyeContactBar.style.width = `${eyeContactLevel}%`;
                eyeContactValue.textContent = `${Math.round(eyeContactLevel)}%`;
                
                eyeContactValue.className = 'vital-value';
                if (eyeContactLevel < 30 || eyeContactLevel > 70) {
                    eyeContactValue.classList.add('warning');
                } else {
                    eyeContactValue.classList.add('success');
                }
            }
            
            // Update swallow bar using actual conversation state
            const swallowBar = document.getElementById('swallow-bar');
            const swallowValue = document.getElementById('swallow-value');
            
            if (swallowBar && swallowValue) {
                const conversationState = this.gameState.currentEvent.conversationState;
                const needsSwallow = conversationState ? conversationState.swallowPromptActive : false;
                if (needsSwallow) {
                    swallowBar.style.width = '100%';
                    swallowValue.textContent = 'SWALLOW!';
                    swallowValue.className = 'vital-value danger';
                } else {
                    swallowBar.style.width = '50%';
                    swallowValue.textContent = 'OK';
                    swallowValue.className = 'vital-value success';
                }
            }
        } else {
            // Hide coffee controls when not in coffee event
            const eyeContactVital = document.getElementById('coffee-eye-contact');
            const swallowVital = document.getElementById('coffee-swallow');
            if (eyeContactVital) eyeContactVital.style.display = 'none';
            if (swallowVital) swallowVital.style.display = 'none';
        }
    }

    updateStatusDisplay() {
        // Mission Status
        const missionStatus = document.getElementById('mission-status');
        if (missionStatus) {
            if (this.gameState.suspicion.current > 50) {
                missionStatus.textContent = 'COMPROMISED - REDUCE SUSPICION';
                missionStatus.className = 'danger';
            } else if (this.gameState.suspicion.current > 25) {
                missionStatus.textContent = 'CAUTION - BEING WATCHED';
                missionStatus.className = 'warning';
            } else {
                missionStatus.textContent = 'ACTIVE - MAINTAIN COVER';
                missionStatus.className = 'success';
            }
        }

        // Current Activity
        const currentActivity = document.getElementById('current-activity');
        if (currentActivity) {
            if (this.gameState.currentEvent) {
                currentActivity.textContent = `EVENT: ${this.gameState.currentEvent.name.toUpperCase()}`;
            } else {
                currentActivity.textContent = 'IDLE - AWAITING ORDERS';
            }
        }

        // Suspicion Meter
        const suspicionFill = document.getElementById('suspicion-fill');
        const suspicionLabel = document.getElementById('suspicion-label');
        const suspicionPercent = this.gameState.getSuspicionPercentage();
        
        if (suspicionFill && suspicionLabel) {
            suspicionFill.style.width = `${suspicionPercent}%`;
            suspicionLabel.textContent = `${Math.round(suspicionPercent)}%`;
        }

        // System Alerts
        this.updateSystemAlerts();
    }

    updateSystemAlerts() {
        const systemAlerts = document.getElementById('system-alerts');
        if (!systemAlerts) return;

        const alerts = [
            {
                condition: this.gameState.vitals.oxygen.status === 'normal',
                text: '• Respiratory monitoring: ON',
                class: 'success'
            },
            {
                condition: this.gameState.vitals.heartRate.status === 'normal',
                text: '• Cardiac regulation: ON',
                class: 'success'
            },
            {
                condition: this.gameState.vitals.eyes.status === 'normal',
                text: '• Ocular maintenance: ON',
                class: 'success'
            }
        ];

        // Add warning alerts
        if (this.gameState.vitals.oxygen.status !== 'normal') {
            alerts.push({
                condition: true,
                text: `• OXYGEN ${this.gameState.vitals.oxygen.status.toUpperCase()}`,
                class: 'danger'
            });
        }
        
        if (this.gameState.vitals.heartRate.status !== 'normal') {
            alerts.push({
                condition: true,
                text: '• CARDIAC IRREGULARITY',
                class: 'danger'
            });
        }
        
        if (this.gameState.vitals.eyes.status !== 'normal') {
            alerts.push({
                condition: true,
                text: '• OCULAR DRYNESS DETECTED',
                class: 'warning'
            });
        }

        systemAlerts.innerHTML = alerts.map(alert => 
            `<div class="${alert.class}">${alert.text}</div>`
        ).join('');
    }
}