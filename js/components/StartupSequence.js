export class StartupSequence {
    constructor() {
        this.startupText = document.getElementById('startup-text');
        this.lines = [
            'Initializing Biological Control Interface...',
            '',
            '╔═════════════════════════════════════════════════════════╗',
            '║                    BODY-CTRL v2.1.7                     ║',
            '║              Humanoid Integration Package               ║',
            '║                                                         ║',
            '║    ██████╗  ██████╗ ██████╗ ██╗   ██╗                   ║',
            '║    ██╔══██╗██╔═══██╗██╔══██╗╚██╗ ██╔╝                   ║',
            '║    ██████╔╝██║   ██║██║  ██║ ╚████╔╝                    ║',
            '║    ██╔══██╗██║   ██║██║  ██║  ╚██╔╝                     ║',
            '║    ██████╔╝╚██████╔╝██████╔╝   ██║                      ║',
            '║    ╚═════╝  ╚═════╝ ╚═════╝    ╚═╝                      ║',
            '║                                                         ║',
            '║     ██████╗ ██████╗ ███╗   ██╗████████╗                 ║',
            '║    ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝                 ║',
            '║    ██║     ██║   ██║██╔██╗ ██║   ██║                    ║',
            '║    ██║     ██║   ██║██║╚██╗██║   ██║                    ║',
            '║    ╚██████╗╚██████╔╝██║ ╚████║   ██║                    ║',
            '║     ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝  ██║               ║',
            '╚═════════════════════════════════════════════════════════╝',
            '',
            'Calibrating biological sensors...',
            '[████████████████████████████████████████] 100%',
            '',
            'Establishing cortex connection...',
            'Connection established ✓',
            '',
            'Running system diagnostics...',
            '• Cardiovascular system: ONLINE',
            '• Respiratory system: ONLINE',
            '• Ocular system: ONLINE',
            '• Nervous system: ONLINE',
            '• Threat detection: ACTIVE',
            '',
            'All systems operational.',
            '',
            'Basic Controls Available:',
            '• [B] - Heartbeat (regulate pulse)',
            '• [H] - Breathe (maintain oxygen)', 
            '• [E] - Blink (keep eyes moist)',
            '',
            'MISSION: Acquire Human Coffee.',
            '',
            'Press any key to begin mission...'
        ];
        
        this.currentLine = 0;
        this.currentChar = 0;
        this.typeSpeed = 1; // milliseconds per character (much faster)
        this.lineDelay = 1; // delay between lines (much faster)
    }

    async run() {
        return new Promise((resolve) => {
            this.typeNextCharacter(resolve);
        });
    }

    typeNextCharacter(resolve) {
        if (this.currentLine >= this.lines.length) {
            this.waitForInput(resolve);
            return;
        }

        const currentLineText = this.lines[this.currentLine];
        
        if (this.currentChar >= currentLineText.length) {
            // Line finished, move to next line
            this.startupText.textContent += '\n';
            this.currentLine++;
            this.currentChar = 0;
            
            setTimeout(() => {
                this.typeNextCharacter(resolve);
            }, this.lineDelay);
        } else {
            // Type next character
            const char = currentLineText[this.currentChar];
            this.startupText.textContent += char;
            this.currentChar++;
            
            // Vary typing speed slightly for more realistic feel
            const variation = Math.random() * 20 - 10;
            const speed = Math.max(10, this.typeSpeed);
            
            setTimeout(() => {
                this.typeNextCharacter(resolve);
            }, 1);
        }
    }

    waitForInput(resolve) {
        const handleKeyPress = (event) => {
            document.removeEventListener('keydown', handleKeyPress);
            resolve();
        };
        
        document.addEventListener('keydown', handleKeyPress);
        
        // Also auto-resolve after 3 seconds if no input
        setTimeout(() => {
            document.removeEventListener('keydown', handleKeyPress);
            resolve();
        }, 3000);
    }
}