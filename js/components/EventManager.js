export class EventManager {
    constructor(gameState, asciiVideo) {
        this.gameState = gameState;
        this.asciiVideo = asciiVideo;
        this.eventPopup = document.getElementById('event-popup');
        this.eventContent = document.getElementById('event-content');
        this.eventDisplay = document.getElementById('event-display');

        this.currentEvent = null;
        this.eventTimer = 0;
        this.nextEventTime = 30000; // First event after 30 seconds of actual gameplay

        // NEW: ending / UI suppression flags
        this.isEnding = false;
        this.endOverlay = null;

        // Game progression sequence
        this.gameProgression = {
            currentStage: 0,
            stages: [
                { type: 'baseline',     duration: 20000, startTime: 30000 },   // 30s: baseline video
                { type: 'runningWoods', duration: 45000, startTime: 50000 },   // 50s: woods 1
                { type: 'orderCoffee',  duration: 30000, startTime: 100000 },  // 100s: barista
                { type: 'runningWoods', duration: 45000, startTime: 132000 },  // 135s: woods 2
                { type: 'finish',       duration: 8000,  startTime: 179000 }   // 185s: ending
            ],
            completed: false
        };

        // Event-specific states
        this.conversationState = {
            eyeContactLevel: 50,
            eyeContactTarget: 50,
            lastSwallowTime: 0,
            swallowPromptActive: false,
            conversationOptions: null,
            waitingForResponse: false,
            conversationStep: 0
        };

        this.runningState = {
            distance: 0,
            lastStepFoot: null,
            stepCount: 0,
            jumpPromptActive: false,
            obstacleTimer: 0,
            completed: false
        };

        this.availableEvents = [
            'orderCoffee',
            'runningWoods'
        ];
    }

    update(deltaTime) {
        // Only update event timing if the game has actually started
        if (this.gameState.gameStarted && !this.gameProgression.completed) {
            this.eventTimer += deltaTime;

            // Check for progression stages
            if (!this.currentEvent) {
                this.checkForNextStage();
            }

            // Update current event
            if (this.currentEvent) {
                this.updateCurrentEvent(deltaTime);
            }

            // Check for game over conditions
            this.checkGameOverConditions();
        }
    }

    // CHANGED: prevent double-start of finish; delegate finish to triggerGameOver
    checkForNextStage() {
        const currentStage = this.gameProgression.stages[this.gameProgression.currentStage];
        if (!currentStage) return;

        if (this.eventTimer >= currentStage.startTime) {
            if (currentStage.type === 'finish') {
                // Let triggerGameOver mark completed and start the finish event
                if (!this.gameProgression.completed) {
                    this.triggerGameOver('success');
                }
            } else {
                console.log(`🎭 Starting stage ${this.gameProgression.currentStage + 1}: ${currentStage.type}`);
                this.startEvent(currentStage.type);
            }
        }
    }

    checkGameOverConditions() {
        if (this.gameState.suspicion.current >= this.gameState.suspicion.max) {
            this.triggerGameOver('failure', 'Suspicion reached maximum');
      }
    }

    triggerGameOver(type, reason = '') {
        console.log(`🎬 Game Over: ${type}${reason ? ' — ' + reason : ''}`);
        this.gameProgression.completed = true;
        if (this.currentEvent) this.endCurrentEvent(true);
        this.startEvent('finish', { endingType: type, reason });
    }

    triggerRandomEvent() {
        const eventType = this.availableEvents[Math.floor(Math.random() * this.availableEvents.length)];
        this.startEvent(eventType);

        // Schedule next event (30-60 seconds later)
        this.nextEventTime = this.eventTimer + 30000 + Math.random() * 30000;
    }

    startEvent(eventType, options = {}) {
        console.log(`🎭 Starting event: ${eventType}`);

        // Get duration from progression stages or default
        let duration = this.getEventDuration(eventType);
        const currentStage = this.gameProgression.stages[this.gameProgression.currentStage];
        if (currentStage && currentStage.type === eventType) {
            duration = currentStage.duration;
        }

        this.currentEvent = {
            type: eventType,
            name: this.getEventName(eventType),
            startTime: this.eventTimer,
            duration: duration,
            runningState: eventType === 'runningWoods' ? this.runningState : null,
            conversationState: eventType === 'orderCoffee' ? this.conversationState : null,
            options: options
        };

        this.gameState.currentEvent = this.currentEvent;

        switch (eventType) {
            case 'baseline':
                this.startBaselineEvent();
                break;
            case 'orderCoffee':
                this.startOrderCoffeeEvent();
                break;
            case 'runningWoods':
                this.startRunningWoodsEvent();
                break;
            case 'finish':
                this.startFinishEvent(options.endingType,options.reason);
                break;
        }
    }

    getEventName(eventType) {
        const names = {
            'baseline': 'Baseline Recording',
            'orderCoffee': 'Order Coffee',
            'runningWoods': 'Running Through Woods',
            'finish': 'Mission Complete'
        };
        return names[eventType] || eventType;
    }

    getEventDuration(eventType) {
        const durations = {
            'baseline': 15000,
            'orderCoffee': 30000,
            'runningWoods': 45000,
            'finish': 8000
        };
        return durations[eventType] || 20000;
    }

    // BASELINE EVENT
    startBaselineEvent() {
        this.asciiVideo.playSequence('baseline');

        this.showEventPopup(`
            <div><strong>BASELINE RECORDING</strong></div>
            <div>SCENARIO: Calibration</div>
            <div>OBJECTIVE: Remain still and natural</div>
            <br>
            <div>Continue using vital controls as needed</div>
            <div>This data will be used for comparison</div>
            `);
    }

    // FINISH EVENT
    startFinishEvent(endingType = 'success', reason = '') {
        this.isEnding = true;
        this.muteUIForEnd();
        this.fadeOutColumns();

        const videoName = endingType === 'success' ? 'success' : 'failure';
        this.asciiVideo.playSequence(videoName);
        console.log(`🎬 Playing ${endingType} ending`);

        if (endingType === 'failure') {
            this.showFailureCaption(reason);
        }

        setTimeout(() => {
            // clear the caption when the overlay appears
            this.hideEventPopup();
            this.showEndScreen(endingType);
        }, this.getEventDuration('finish'));
    }

    // Replaces your previous end-screen method(s)
    showEndScreen(endingType) {
        const asciiThanks = `
      ███████╗██╗  ██╗ █████╗ ███╗   ██╗██╗  ██╗███████╗
     ╚══██╔══╝██║  ██║██╔══██╗████╗  ██║██║ ██╔╝██╔════╝
        ██║   ███████║███████║██╔██╗ ██║█████╔╝ ███████╗
        ██║   ██╔══██║██╔══██║██║╚██╗██║██╔═██╗ ╚════██║
        ██║   ██║  ██║██║  ██║██║ ╚████║██║  ██╗███████║
        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝

            ███████╗ ██████╗ ██████╗     ██████╗ ██╗      █████╗ ██╗   ██╗██╗███╗   ██╗ ██████╗ 
            ██╔════╝██╔═══██╗██╔══██╗    ██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝██║████╗  ██║██╔════╝ 
            █████╗  ██║   ██║██████╔╝    ██████╔╝██║     ███████║ ╚████╔╝ ██║██╔██╗ ██║██║  ███╗
            ██╔══╝  ██║   ██║██╔══██╗    ██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██║██║╚██╗██║██║   ██║
            ██║     ╚██████╔╝██║  ██║    ██║     ███████╗██║  ██║   ██║   ██║██║ ╚████║╚██████╔╝
            ╚═╝      ╚═════╝ ╚═╝  ╚═╝    ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
        `;

        if (!this.endOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'end-screen-overlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.padding = '24px';
            overlay.style.zIndex = '9999';
            overlay.style.textAlign = 'center';
            overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

            const pre = document.createElement('pre');
            pre.id = 'end-ascii';
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre';

            const title = document.createElement('div');
            title.id = 'end-title';
            title.style.fontSize = '28px';
            title.style.letterSpacing = '2px';
            title.style.marginTop = '8px';

            overlay.appendChild(pre);
            overlay.appendChild(title);
            document.body.appendChild(overlay);
            this.endOverlay = overlay;
        }

        const pre = this.endOverlay.querySelector('#end-ascii');
        const title = this.endOverlay.querySelector('#end-title');

        if (endingType === 'success') {
            this.endOverlay.style.background = 'black';
            this.endOverlay.style.color = 'white';
            pre.textContent = asciiThanks;          // ✅ keep the ASCII art
            title.textContent = 'Thanks for playing.';
        } else {
            this.endOverlay.style.background = '#1a0000';
            this.endOverlay.style.color = 'white';
            pre.textContent = '';                   // no ASCII on failure
            title.textContent = 'YOU HAVE BEEN DETECTED';
        }

        this.endOverlay.style.display = 'flex';
        }


    fadeOutColumns() {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');

        if (leftPanel) {
            leftPanel.style.transition = 'opacity 2s ease-out';
            leftPanel.style.opacity = '0';
        }

        if (rightPanel) {
            rightPanel.style.transition = 'opacity 2s ease-out';
            rightPanel.style.opacity = '0';
        }
    }

    // NEW: suppress UI and normalize local state during ending
    muteUIForEnd() {
        // Hide any existing popups
        this.hideEventPopup();

        // Normalize local event states ("set all state variables to 50" where meaningful)
        this.conversationState.eyeContactLevel = 50;
        this.conversationState.eyeContactTarget = 50;
        this.conversationState.swallowPromptActive = false;
        this.conversationState.waitingForResponse = false;
        this.runningState.jumpPromptActive = false;

        // Prevent future popups/updates from showing while ending (handled in show/update guards below)
    }

    // NEW: full-screen overlay "Thanks for playing" (no fictional APIs)
    showThanksMessage() {
        const asciiThanks = `
 ███████╗██╗  ██╗ █████╗ ███╗   ██╗██╗  ██╗███████╗
╚══██╔══╝██║  ██║██╔══██╗████╗  ██║██║ ██╔╝██╔════╝
   ██║   ███████║███████║██╔██╗ ██║█████╔╝ ███████╗
   ██║   ██╔══██║██╔══██║██║╚██╗██║██╔═██╗ ╚════██║
   ██║   ██║  ██║██║  ██║██║ ╚████║██║  ██╗███████║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝

    ███████╗ ██████╗ ██████╗     ██████╗ ██╗      █████╗ ██╗   ██╗██╗███╗   ██╗ ██████╗ 
    ██╔════╝██╔═══██╗██╔══██╗    ██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝██║████╗  ██║██╔════╝ 
    █████╗  ██║   ██║██████╔╝    ██████╔╝██║     ███████║ ╚████╔╝ ██║██╔██╗ ██║██║  ███╗
    ██╔══╝  ██║   ██║██╔══██╗    ██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██║██║╚██╗██║██║   ██║
    ██║     ╚██████╔╝██║  ██║    ██║     ███████╗██║  ██║   ██║   ██║██║ ╚████║╚██████╔╝
    ╚═╝      ╚═════╝ ╚═╝  ╚═╝    ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
        `;

        // Build overlay only once
        if (!this.endOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'end-screen-overlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'black';
            overlay.style.color = 'white';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.padding = '24px';
            overlay.style.zIndex = '9999';
            overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            overlay.style.textAlign = 'center';

            const pre = document.createElement('pre');
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre';
            pre.textContent = asciiThanks;

            const caption = document.createElement('div');
            caption.style.marginTop = '16px';
            caption.style.fontSize = '18px';
            caption.style.opacity = '0.9';
            caption.textContent = '';

            overlay.appendChild(pre);
            overlay.appendChild(caption);

            document.body.appendChild(overlay);
            this.endOverlay = overlay;
        } else {
            this.endOverlay.style.display = 'flex';
        }
    }

    // ORDER COFFEE EVENT
    startOrderCoffeeEvent() {
        this.asciiVideo.playSequence('coffee');
        this.conversationState.eyeContactLevel = 50;
        this.conversationState.eyeContactTarget = 40 + Math.random() * 20;

        this.showEventPopup(`
            <div><strong>INCOMING SOCIAL INTERACTION</strong></div>
            <div>SCENARIO: Coffee Shop</div>
            <div>OBJECTIVE: Order coffee without suspicion</div>
            <br>
            <div><strong>NEW CONTROLS ACTIVE:</strong></div>
            <div>[R] - Eye Contact Toggle</div>
            <div>[S] - Swallow (when needed)</div>
            <div>[1-4] - Conversation Options</div>
        `);

        setTimeout(() => this.promptEyeContact(), 3000);
        setTimeout(() => this.promptSwallow(), 8000);
        setTimeout(() => this.startConversation(), 12000);
    }

    promptEyeContact() {
        if (this.currentEvent && this.currentEvent.type === 'orderCoffee') {
            console.log('👀 Eye contact required - maintain appropriate level');
        }
    }

    promptSwallow() {
        if (this.currentEvent && this.currentEvent.type === 'orderCoffee') {
            this.conversationState.swallowPromptActive = true;
            this.conversationState.lastSwallowTime = Date.now();

            this.showEventPopup(`
                <div><strong>ACTION REQUIRED</strong></div>
                <div>MOUTH IS WET</div>
                <div><strong>SWALLOW [S]</strong></div>
                <div>Time: 3.0s</div>
            `, true);

            setTimeout(() => {
                if (this.conversationState.swallowPromptActive) {
                    this.conversationState.swallowPromptActive = false;
                    this.gameState.addSuspicion(8, 'Failed to swallow');
                    this.hideEventPopup();
                }
            }, 3000);
        }
    }

    startConversation() {
        if (this.currentEvent && this.currentEvent.type === 'orderCoffee') {
            this.conversationState.conversationStep = 1;
            this.showFirstConversation();
        }
    }

    showFirstConversation() {
        this.conversationState.conversationOptions = [
            { text: 'coffee', correct: true },
            { text: 'frog', correct: false },
            { text: 'revenge', correct: false },
            { text: 'sustenance', correct: false }
        ];

        this.conversationState.waitingForResponse = true;

        this.showEventPopup(`
            <div><strong>CONVERSATION (1/2)</strong></div>
            <div>"I'd like a _____"</div>
            <br>
            <div>[1] coffee</div>
            <div>[2] frog</div>
            <div>[3] revenge</div>
            <div>[4] sustenance</div>
        `);
    }

    showSecondConversation() {
        this.conversationState.conversationStep = 2;
        this.conversationState.conversationOptions = [
            { text: 'credits', correct: false },
            { text: 'human dollars', correct: true },
            { text: 'frogs', correct: false }
        ];

        this.conversationState.waitingForResponse = true;

        this.showEventPopup(`
            <div><strong>CONVERSATION (2/2)</strong></div>
            <div>"How will you pay?"</div>
            <br>
            <div>[1] credits</div>
            <div>[2] human dollars</div>
            <div>[3] frogs</div>
        `);
    }

    // RUNNING WOODS EVENT
    startRunningWoodsEvent() {
        this.asciiVideo.playSequence('walking');

        this.runningState.distance = 0;
        this.runningState.lastStepFoot = null;
        this.runningState.stepCount = 0;
        this.runningState.completed = false;

        this.showEventPopup(`
            <div><strong>TRAVEL THROUGH WOODS</strong></div>
            <div>SCENARIO: Forest</div>
            <div>OBJECTIVE: TRAVERSE</div>
            <br>
            <div><strong>CONTROLS:</strong></div>
            <div>[D] - Step Left</div>
            <div>[F] - Step Right</div>
            <br>
            <div>Alternate feet to maintain speed</div>
        `);

        this.scheduleJumpPrompt();
    }

    scheduleJumpPrompt() {
        if (this.currentEvent && this.currentEvent.type === 'runningWoods') {
            const delay = 5000 + Math.random() * 8000;
            setTimeout(() => {
                this.promptJump();
                this.scheduleJumpPrompt();
            }, delay);
        }
    }

    promptJump() {
        if (this.currentEvent && this.currentEvent.type === 'runningWoods') {
            this.runningState.jumpPromptActive = true;

            const obstacles = ['LOG AHEAD', 'ROCK OBSTACLE', 'FALLEN TREE', 'DEEP PUDDLE'];
            const obstacle = obstacles[Math.floor(Math.random() * obstacles.length)];

            this.showEventPopup(`
                <div><strong>OBSTACLE!</strong></div>
                <div>${obstacle}</div>
                <div><strong>JUMP [SPACE]</strong></div>
                <div>Time: 2.0s</div>
            `, true);

            setTimeout(() => {
                if (this.runningState.jumpPromptActive) {
                    this.runningState.jumpPromptActive = false;
                    this.gameState.addSuspicion(10, 'Failed to jump obstacle');
                    this.runningState.distance = Math.max(0, this.runningState.distance - 10);
                    console.log(`💥 Hit obstacle! Distance reduced to ${this.runningState.distance}%`);
                    this.hideEventPopup();
                }
            }, 2000);
        }
    }

    updateCurrentEvent(deltaTime) {
        const eventAge = this.eventTimer - this.currentEvent.startTime;

        // Check if event should end
        if (eventAge >= this.currentEvent.duration) {
            this.endCurrentEvent();
            return;
        }

        // Update event-specific logic
        switch (this.currentEvent.type) {
            case 'orderCoffee':
                this.updateOrderCoffeeEvent(deltaTime);
                break;
            case 'runningWoods':
                this.updateRunningWoodsEvent(deltaTime);
                break;
        }
    }

    updateOrderCoffeeEvent(deltaTime) {
        const targetDiff = Math.abs(this.conversationState.eyeContactLevel - this.conversationState.eyeContactTarget);
        if (targetDiff > 15) {
            this.gameState.addSuspicion(0.5 * (deltaTime / 1000), 'Poor eye contact');
        }

        if (this.conversationState.swallowPromptActive) {
            const timeLeft = 3000 - (Date.now() - this.conversationState.lastSwallowTime);
            if (timeLeft > 0) {
                this.updateEventPopup(`
                    <div><strong>ACTION REQUIRED</strong></div>
                    <div>MOUTH IS WET</div>
                    <div><strong>SWALLOW [S]</strong></div>
                    <div>Time: ${(timeLeft / 1000).toFixed(1)}s</div>
                `);
            }
        }
    }

    updateRunningWoodsEvent(deltaTime) {
        if (this.runningState.distance >= 100 && !this.runningState.completed) {
            this.runningState.completed = true;
            console.log('✅ Successfully escaped through the woods!');
            this.showEventDisplay('<div><strong>SUCCESS!</strong></div><div>You have traversed the woods.</div>', false);

            setTimeout(() => {
                this.endCurrentEvent();
            }, 2000);
        }
    }

    // INPUT HANDLERS (NEW: ignore inputs during end screen)
    handleEyeContact() {
        if (this.isEnding) return;
        if (this.currentEvent && this.currentEvent.type === 'orderCoffee') {
            this.conversationState.eyeContactLevel = this.conversationState.eyeContactLevel < 50 ? 70 : 30;
            console.log(`👀 Eye contact: ${this.conversationState.eyeContactLevel}%`);
        }
    }

    handleSwallow() {
        if (this.isEnding) return;
        if (this.currentEvent && this.currentEvent.type === 'orderCoffee' && this.conversationState.swallowPromptActive) {
            this.conversationState.swallowPromptActive = false;
            console.log('✅ Swallowed successfully');
            this.hideEventPopup();
        }
    }

    handleStep(foot) {
        if (this.isEnding) return;
        if (this.currentEvent && this.currentEvent.type === 'runningWoods') {
            if (this.runningState.lastStepFoot === foot) {
                this.runningState.distance = Math.max(0, this.runningState.distance - 5);
                this.gameState.addSuspicion(4, 'Stumbled while running');
                console.log(`🦵 Misstep! Distance reduced to ${this.runningState.distance}%`);
            } else {
                this.runningState.distance = Math.min(100, this.runningState.distance + 2.5);
                this.runningState.lastStepFoot = foot;
                this.runningState.stepCount++;
                console.log(`🦵 Good step! Distance: ${this.runningState.distance}%`);
            }
        }
    }

    handleJump() {
        if (this.isEnding) return;
        if (this.currentEvent && this.currentEvent.type === 'runningWoods' && this.runningState.jumpPromptActive) {
            this.runningState.jumpPromptActive = false;
            console.log('✅ Jumped obstacle successfully');
            this.hideEventPopup();
        }
    }

        // Replace your handleConversationOption with this
    handleConversationOption(option) {
    if (this.isEnding) return;
    if (this.currentEvent && this.currentEvent.type === 'orderCoffee' && this.conversationState.waitingForResponse) {
        this.conversationState.waitingForResponse = false;

        const selectedOption = this.conversationState.conversationOptions[option - 1];
        const step = this.conversationState.conversationStep || 1;
        const correct = !!(selectedOption && selectedOption.correct);

        if (!correct) {
        // show awkward, add suspicion
        this.gameState.addSuspicion(15, 'Weird conversation choice');
        this.showEventPopup(`
            <div><strong>AWKWARD...</strong></div>
            <div>The barista stares at you weirdly</div>
        `);
        } else {
        // quick hide to keep UI snappy
        this.hideEventPopup();
        }

        // ✅ ALWAYS move to step 2 after step 1, regardless of correctness
        if (step === 1) {
        const delay = correct ? 400 : 3000; // wait for awkward popup if needed
        setTimeout(() => {
            this.hideEventPopup();
            this.showSecondConversation();
        }, delay);
        }
    }
    }


    // CHANGED: remove delayed trigger of finish here; let checkForNextStage/triggerGameOver handle it
    endCurrentEvent(/*suppressFinishAuto = false*/) {
        console.log(`🎭 Event ended: ${this.currentEvent ? this.currentEvent.name : '(none)'}`);

        const eventType = this.currentEvent ? this.currentEvent.type : null;

        if (this.gameProgression.currentStage < this.gameProgression.stages.length - 1) {
            this.gameProgression.currentStage++;
            console.log(`📈 Advanced to stage ${this.gameProgression.currentStage + 1}`);
        }

        this.currentEvent = null;
        this.gameState.currentEvent = null;

        // Only hide event UI if we are not in the final ending overlay
        if (!this.isEnding) {
            this.hideEventPopup();
        }

        // Reset states
        this.conversationState = {
            eyeContactLevel: 50,
            eyeContactTarget: 50,
            lastSwallowTime: 0,
            swallowPromptActive: false,
            conversationOptions: null,
            waitingForResponse: false,
            conversationStep: 0
        };

        this.runningState = {
            distance: 0,
            lastStepFoot: null,
            stepCount: 0,
            jumpPromptActive: false,
            obstacleTimer: 0,
            completed: false
        };

        // Return to idle video (unless it's the finish event)
        if (eventType !== 'finish') {
            this.asciiVideo.playSequence('idle');
        }
    }

    // UI helpers — now respect isEnding
    showEventPopup(content, urgent = false) {
        this.showEventDisplay(content, urgent);
    }

    showEventDisplay(content, urgent = false, force = false) {
        if (this.isEnding && !force) return;
        if (this.eventDisplay) {
            this.eventDisplay.innerHTML = content;
            this.eventDisplay.classList.remove('hidden');
            if (urgent) this.eventDisplay.classList.add('urgent'); else this.eventDisplay.classList.remove('urgent');
        }
    }
    showFailureCaption(reason) {
        const msg = `YOU HAVE BEEN DETECTED${reason ? ' — ' + reason : ''}`;
        const content = `
            <div style="padding:8px 12px;border:2px solid #a00;border-radius:6px;background:rgba(160,0,0,0.15);">
            <div style="font-weight:700;letter-spacing:1px;">${msg}</div>
            <div style="opacity:0.9;font-size:12px;margin-top:4px;">Ending playback…</div>
            </div>
        `;
        // force=true so it shows even when isEnding is set
        this.showEventDisplay(content, true, true);
    }

    updateEventPopup(content) {
        if (this.isEnding) return; // suppress during end screen
        if (this.eventDisplay && !this.eventDisplay.classList.contains('hidden')) {
            this.eventDisplay.innerHTML = content;
        }
    }

    hideEventPopup() {
        if (this.eventDisplay) {
            this.eventDisplay.classList.add('hidden');
            this.eventDisplay.classList.remove('urgent');
        }
    }
}
