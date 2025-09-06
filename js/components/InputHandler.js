export class InputHandler {
    constructor(gameState, vitalSystems, eventManager, audioSystem) {
        this.gameState = gameState;
        this.vitalSystems = vitalSystems;
        this.eventManager = eventManager;
        this.audioSystem = audioSystem;
        
        this.keyBindings = {
            'KeyB': 'heartbeat',
            'KeyH': 'breathe', 
            'KeyE': 'blink',
            'KeyR': 'eyeContact',
            'KeyS': 'swallow',
            'KeyD': 'stepLeft',
            'KeyF': 'stepRight',
            'Space': 'jump',
            'Digit1': 'option1',
            'Digit2': 'option2',
            'Digit3': 'option3',
            'Digit4': 'option4'
        };

        this.isKeyPressed = new Set();
        this.keyRepeatDelay = 100; // Minimum time between key presses for same key
        this.lastKeyPress = new Map();
    }

    init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Prevent default behavior for game keys
        document.addEventListener('keydown', (e) => {
            if (this.keyBindings[e.code]) {
                e.preventDefault();
            }
        });

        console.log('🎮 Input handler initialized');
        this.showControls();
    }

    showControls() {
        console.log(`
┌─ CONTROLS ─────────────────────────────────────────┐
│                                                    │
│ VITAL FUNCTIONS:                                   │
│   [B] - Heartbeat      [H] - Breathe               │
│   [E] - Blink                                      │
│                                                    │
│ EVENT ACTIONS:                                     │
│   [R] - Eye Contact    [S] - Swallow               │
│   [D] - Step Left      [F] - Step Right            │
│   [SPACE] - Jump                                   │
│   [1-4] - Conversation Options                     │
│                                                    │
└────────────────────────────────────────────────────┘`);
    }

    handleKeyDown(event) {
        const action = this.keyBindings[event.code];
        if (!action) return;

        // Prevent key repeat spam
        const now = Date.now();
        const lastPress = this.lastKeyPress.get(event.code) || 0;
        
        if (now - lastPress < this.keyRepeatDelay) {
            return;
        }
        
        this.lastKeyPress.set(event.code, now);
        this.isKeyPressed.add(event.code);

        this.executeAction(action, event);
    }

    handleKeyUp(event) {
        this.isKeyPressed.delete(event.code);
    }

    executeAction(action, event) {
        switch(action) {
            case 'breathe':
                this.gameState.breathe();
                if (this.audioSystem) this.audioSystem.playBreathe();
                this.showActionFeedback('💨 INHALED');
                break;

            case 'heartbeat':
                this.gameState.heartbeat();
                if (this.audioSystem) this.audioSystem.playHeartbeat();
                this.showActionFeedback('💓 BEAT');
                break;

            case 'blink':
                this.gameState.blink();
                if (this.audioSystem) this.audioSystem.playBlink();
                this.showActionFeedback('👁️ BLINK');
                break;

            case 'eyeContact':
                if (this.eventManager.handleEyeContact) {
                    this.eventManager.handleEyeContact();
                    if (this.audioSystem) this.audioSystem.playEyeContact();
                    this.showActionFeedback('👀 EYE CONTACT');
                }
                break;

            case 'swallow':
                if (this.eventManager.handleSwallow) {
                    this.eventManager.handleSwallow();
                    if (this.audioSystem) this.audioSystem.playSwallow();
                    this.showActionFeedback('🫰 SWALLOW');
                }
                break;

            case 'stepLeft':
                if (this.eventManager.handleStep) {
                    this.eventManager.handleStep('left');
                    if (this.audioSystem) this.audioSystem.playStep();
                    this.showActionFeedback('🦵 STEP LEFT');
                }
                break;

            case 'stepRight':
                if (this.eventManager.handleStep) {
                    this.eventManager.handleStep('right');
                    if (this.audioSystem) this.audioSystem.playStep();
                    this.showActionFeedback('🦵 STEP RIGHT');
                }
                break;

            case 'jump':
                if (this.eventManager.handleJump) {
                    this.eventManager.handleJump();
                    if (this.audioSystem) this.audioSystem.playJump();
                    this.showActionFeedback('⬆️ JUMP');
                }
                break;

            case 'option1':
            case 'option2':
            case 'option3':
            case 'option4':
                const optionNumber = parseInt(action.slice(-1));
                if (this.eventManager.handleConversationOption) {
                    this.eventManager.handleConversationOption(optionNumber);
                    if (this.audioSystem) this.audioSystem.playConversationOption();
                    this.showActionFeedback(`💬 OPTION ${optionNumber}`);
                }
                break;
        }
    }

    showActionFeedback(message) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 10px;
            right: 20px;
            background: rgba(0, 255, 65, 0.2);
            color: #00ff41;
            padding: 5px 10px;
            border: 1px solid #00aa33;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            z-index: 2000;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(feedback);

        // Fade out and remove
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 800);
    }

    // Check if a key is currently pressed
    isPressed(keyCode) {
        return this.isKeyPressed.has(keyCode);
    }

    // Get current input state for complex actions
    getInputState() {
        return {
            breathe: this.isPressed('KeyH'),
            heartbeat: this.isPressed('KeyB'),
            blink: this.isPressed('KeyE'),
            eyeContact: this.isPressed('KeyR'),
            swallow: this.isPressed('KeyS'),
            stepLeft: this.isPressed('KeyD'),
            stepRight: this.isPressed('KeyF'),
            jump: this.isPressed('Space')
        };
    }
}