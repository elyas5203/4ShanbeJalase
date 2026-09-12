// Cyber Loading Animation with Decryption Effect
class CyberLoader {
    constructor() {
        this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
        this.targetText = 'ACCESS GRANTED';
        this.currentText = '';
        this.isDecrypting = false;
        this.decryptionSpeed = 50;
        this.randomizeSpeed = 30;
    }

    createLoadingScreen() {
        const loadingHTML = `
            <div id="cyber-loading" class="cyber-loading-container">
                <div class="loading-content">
                    <div class="loading-title">Connecting to Secure Terminal</div>
                    <div class="decryption-display">
                        <div id="decryption-text" class="decryption-text">Decrypting...</div>
                    </div>
                    <div class="loading-bar-container">
                        <div class="loading-bar">
                            <div id="loading-progress" class="loading-progress"></div>
                        </div>
                        <div id="loading-percentage" class="loading-percentage">0%</div>
                    </div>
                    <div class="system-status">
                        <div class="status-line">ESTABLISHING SECURE TUNNEL...</div>
                        <div class="status-line">VERIFYING CREDENTIALS...</div>
                        <div class="status-line">LOADING NEURAL INTERFACE...</div>
                    </div>
                </div>
                <div class="loading-particles" id="loading-particles"></div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        this.addLoadingStyles();
        this.createLoadingParticles();
    }

    addLoadingStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cyber-loading-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--cyber-darker);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 1;
                transition: opacity 0.8s ease;
            }

            .cyber-loading-container.fade-out {
                opacity: 0;
                pointer-events: none;
            }

            .loading-content {
                text-align: center;
                max-width: 600px;
                padding: 40px;
            }

            .loading-title {
                font-family: 'Orbitron', monospace;
                font-size: 24px;
                color: var(--cyber-primary);
                margin-bottom: 40px;
                text-transform: uppercase;
                letter-spacing: 3px;
                text-shadow: 0 0 10px currentColor;
                animation: title-pulse 2s infinite alternate;
            }

            @keyframes title-pulse {
                0% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            .decryption-display {
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid var(--cyber-glass-border);
                border-radius: 12px;
                padding: 30px;
                margin-bottom: 40px;
                backdrop-filter: blur(8px);
                position: relative;
                overflow: hidden;
            }

            .decryption-display::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(0, 255, 255, 0.1) 50%, 
                    transparent 100%);
                animation: scan-line 2s infinite;
            }

            @keyframes scan-line {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .decryption-text {
                font-family: 'Share Tech Mono', monospace;
                font-size: 32px;
                color: var(--cyber-primary);
                min-height: 40px;
                text-shadow: 0 0 15px currentColor;
                letter-spacing: 4px;
                font-weight: bold;
            }

            .loading-bar-container {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 40px;
            }

            .loading-bar {
                flex: 1;
                height: 6px;
                background: rgba(0, 255, 255, 0.2);
                border-radius: 3px;
                overflow: hidden;
                position: relative;
            }

            .loading-progress {
                height: 100%;
                background: linear-gradient(90deg, 
                    var(--cyber-primary) 0%, 
                    var(--cyber-accent) 50%, 
                    var(--cyber-primary) 100%);
                width: 0%;
                transition: width 0.3s ease;
                box-shadow: 0 0 15px var(--cyber-primary);
                position: relative;
            }

            .loading-progress::after {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 20px;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.8) 100%);
                animation: progress-shine 1s infinite;
            }

            @keyframes progress-shine {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }

            .loading-percentage {
                font-family: 'Share Tech Mono', monospace;
                color: var(--cyber-accent);
                font-size: 18px;
                font-weight: bold;
                min-width: 50px;
                text-shadow: 0 0 8px currentColor;
            }

            .system-status {
                text-align: left;
            }

            .status-line {
                font-family: 'Share Tech Mono', monospace;
                color: var(--cyber-primary);
                font-size: 14px;
                margin-bottom: 8px;
                opacity: 0.7;
                position: relative;
                padding-left: 20px;
            }

            .status-line::before {
                content: '>';
                position: absolute;
                left: 0;
                color: var(--cyber-accent);
                animation: blink 1s infinite;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }

            .loading-particles {
                position: absolute;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }

            .loading-particle {
                position: absolute;
                width: 3px;
                height: 3px;
                background: var(--cyber-primary);
                border-radius: 50%;
                animation: float-particle 8s infinite linear;
                box-shadow: 0 0 6px currentColor;
            }

            @keyframes float-particle {
                0% {
                    opacity: 0;
                    transform: translateY(100vh) rotate(0deg);
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                    transform: translateY(-10vh) rotate(360deg);
                }
            }
        `;
        document.head.appendChild(style);
    }

    createLoadingParticles() {
        const container = document.getElementById('loading-particles');
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'loading-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (8 + Math.random() * 4) + 's';
            
            // Random colors
            const colors = ['var(--cyber-primary)', 'var(--cyber-accent)', 'var(--cyber-secondary)'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            container.appendChild(particle);
        }
    }

    startDecryption() {
        this.isDecrypting = true;
        this.currentText = this.generateRandomText(this.targetText.length);
        this.decryptStep();
    }

    generateRandomText(length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
        }
        return result;
    }

    decryptStep() {
        if (!this.isDecrypting) return;

        const textElement = document.getElementById('decryption-text');
        let newText = '';
        let allCorrect = true;

        for (let i = 0; i < this.targetText.length; i++) {
            if (Math.random() < 0.1 || this.currentText[i] === this.targetText[i]) {
                newText += this.targetText[i];
            } else {
                newText += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
                allCorrect = false;
            }
        }

        this.currentText = newText;
        textElement.textContent = this.currentText;

        if (allCorrect) {
            this.isDecrypting = false;
            textElement.style.color = 'var(--cyber-accent)';
            textElement.style.textShadow = '0 0 20px var(--cyber-accent)';
            setTimeout(() => this.completeLoading(), 1000);
        } else {
            setTimeout(() => this.decryptStep(), this.decryptionSpeed);
        }
    }

    updateProgress(percentage) {
        const progressBar = document.getElementById('loading-progress');
        const percentageText = document.getElementById('loading-percentage');
        
        if (progressBar && percentageText) {
            progressBar.style.width = percentage + '%';
            percentageText.textContent = Math.round(percentage) + '%';
        }
    }

    completeLoading() {
        const loadingContainer = document.getElementById('cyber-loading');
        if (loadingContainer) {
            loadingContainer.classList.add('fade-out');
            setTimeout(() => {
                loadingContainer.remove();
            }, 800);
        }
    }

    simulate() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                this.updateProgress(progress);
                clearInterval(interval);
                setTimeout(() => this.startDecryption(), 500);
            } else {
                this.updateProgress(progress);
            }
        }, 200);
    }
}

// Export for use in other files
window.CyberLoader = CyberLoader;
