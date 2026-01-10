/**
 * Sijsjesberg Quest - Hoofdlogica
 */

class SijsjesbergQuest {
    constructor() {
        this.routeData = null;
        this.currentRoute = null;
        this.currentPoint = null;
        this.hintsUsed = 0;
        this.currentHintShown = false;
        this.totalPoints = 0;
        this.completedPoints = 0;
        this.scanner = null;
        
        // Nieuwe state voor volgorde en pogingen
        this.expectedNextPoint = '1'; // Start bij checkpoint 1
        this.currentAttempts = 0; // Pogingen voor huidige vraag
        this.waitingForPuzzleQr = false; // Wacht op puzzel QR-scan

        this.init();
    }

    async init() {
        this.loadState();
        await this.loadRoute();
        this.setupEventListeners();
        this.showScanner();
    }

    async loadRoute() {
        try {
            const response = await fetch('routes.json');
            this.routeData = await response.json();
            this.currentRoute = this.routeData.seasons.winter.route;
            this.totalPoints = Object.keys(this.currentRoute.points).length;
            
            // Bepaal startpunt uit intro of default naar '1'
            const startPoint = this.currentRoute.intro?.start || '1';
            
            // Als er geen opgeslagen expectedNextPoint is, gebruik startpunt
            const savedExpectedNext = localStorage.getItem('sijsjesberg_expectedNextPoint');
            if (!savedExpectedNext || savedExpectedNext === '') {
                this.expectedNextPoint = startPoint;
            }
            
            console.log('Route geladen. Expected next:', this.expectedNextPoint);
            
            this.updateProgress();
        } catch (err) {
            console.error('Route laden mislukt:', err);
            alert('Fout bij laden van de speurtocht. Probeer de pagina te verversen.');
        }
    }

    setupEventListeners() {
        document.getElementById('check-btn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('scan-next-btn').addEventListener('click', () => this.showScanner());
        
        // Reset knop met bevestiging
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            const handleReset = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Reset knop ingedrukt!');
                this.showResetConfirmation();
            };
            
            resetBtn.onclick = handleReset;
            resetBtn.ontouchstart = (e) => {
                e.preventDefault();
                console.log('Reset touch gedetecteerd!');
                this.showResetConfirmation();
            };
        } else {
            console.error('Reset knop niet gevonden!');
        }
        
        // Modal knoppen
        const confirmResetBtn = document.getElementById('confirm-reset-btn');
        const cancelResetBtn = document.getElementById('cancel-reset-btn');
        if (confirmResetBtn) {
            confirmResetBtn.addEventListener('click', () => this.confirmReset());
        }
        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', () => this.hideResetModal());
        }
    }

    loadState() {
        const savedHints = localStorage.getItem('sijsjesberg_hintsUsed');
        const savedCompleted = localStorage.getItem('sijsjesberg_completedPoints');
        const savedExpectedNext = localStorage.getItem('sijsjesberg_expectedNextPoint');
        
        if (savedHints !== null) {
            this.hintsUsed = parseInt(savedHints, 10);
        }
        if (savedCompleted !== null) {
            this.completedPoints = parseInt(savedCompleted, 10);
        }
        if (savedExpectedNext !== null && savedExpectedNext !== '') {
            this.expectedNextPoint = savedExpectedNext;
        }
        
        console.log('State geladen:', {
            hintsUsed: this.hintsUsed,
            completedPoints: this.completedPoints,
            expectedNextPoint: this.expectedNextPoint
        });
        
        this.updateHintCounter();
    }

    saveState() {
        localStorage.setItem('sijsjesberg_hintsUsed', this.hintsUsed.toString());
        localStorage.setItem('sijsjesberg_completedPoints', this.completedPoints.toString());
        localStorage.setItem('sijsjesberg_expectedNextPoint', this.expectedNextPoint);
    }

    clearState() {
        localStorage.removeItem('sijsjesberg_hintsUsed');
        localStorage.removeItem('sijsjesberg_completedPoints');
        localStorage.removeItem('sijsjesberg_expectedNextPoint');
        this.hintsUsed = 0;
        this.completedPoints = 0;
        this.currentHintShown = false;
        this.currentAttempts = 0;
        this.expectedNextPoint = this.currentRoute?.intro?.start || '1';
    }

    showScanner() {
        this.hideAllSections();
        document.getElementById('scanner-section').classList.remove('hidden');
        this.scanner = new QRScannerModule('qr-reader', (code) => this.handleQRScan(code));
        this.scanner.start();
    }

    handleQRScan(code) {
        console.log('Gescand:', code, '| Verwacht:', this.expectedNextPoint, '| Puzzel wachten:', this.waitingForPuzzleQr);
        
        // Check of we wachten op een puzzel QR
        if (this.waitingForPuzzleQr) {
            this.handlePuzzleQRScan(code);
            return;
        }
        
        // Check of dit de finish QR is
        if (code.toUpperCase().includes('FINISH') || code.toUpperCase().includes('EINDE')) {
            // Alleen toestaan als we bij finish verwacht worden
            if (this.expectedNextPoint === 'finish') {
                this.showFinish();
            } else {
                this.showWrongOrderMessage('finish');
            }
            return;
        }
        
        // Zoek het bijbehorende checkpoint
        const points = this.currentRoute.points;
        for (const pointId in points) {
            const point = points[pointId];
            if (point.qr.toUpperCase() === code.toUpperCase()) {
                console.log('Gevonden checkpoint:', pointId, '| Verwacht:', this.expectedNextPoint);
                
                // Check of dit het verwachte volgende punt is
                if (pointId === this.expectedNextPoint) {
                    this.currentPoint = { id: pointId, ...point };
                    this.currentHintShown = false;
                    this.currentAttempts = 0; // Reset pogingen voor nieuwe vraag
                    this.renderTask();
                } else {
                    this.showWrongOrderMessage(pointId);
                }
                return;
            }
        }
        
        // Onbekende QR-code
        alert('Deze QR-code hoort niet bij de speurtocht. Probeer een andere.');
        this.scanner.start();
    }

    handlePuzzleQRScan(code) {
        const expectedPuzzleQr = this.currentPoint.task.puzzleQr || this.currentPoint.answer.value;
        
        console.log('Puzzel QR check:', code.toUpperCase(), '===', expectedPuzzleQr.toUpperCase());
        
        if (code.toUpperCase() === expectedPuzzleQr.toUpperCase()) {
            // Correcte puzzel QR gescand!
            this.waitingForPuzzleQr = false;
            
            // Update voortgang
            this.completedPoints++;
            this.expectedNextPoint = this.currentPoint.next;
            this.saveState();
            this.updateProgress();
            
            // Toon succes en navigatie
            this.hideAllSections();
            document.getElementById('task-section').classList.remove('hidden');
            
            const feedback = document.getElementById('feedback');
            feedback.textContent = 'Puzzel opgelost! 🎉';
            feedback.className = 'feedback success';
            
            setTimeout(() => this.showNavigation(), 1500);
        } else {
            // Verkeerde QR-code
            this.waitingForPuzzleQr = false;
            alert('❌ Dit is niet de juiste puzzel QR-code. Heb je alle stukjes goed bij elkaar gelegd?');
            this.renderTask(); // Terug naar de puzzel opdracht
        }
    }

    showWrongOrderMessage(scannedPointId) {
        const expectedLabel = this.expectedNextPoint === 'finish' 
            ? 'de finish' 
            : `checkpoint ${this.expectedNextPoint}`;
        
        alert(`⚠️ Verkeerde volgorde!\n\nJe moet eerst ${expectedLabel} scannen.\n\nJe hebt checkpoint ${scannedPointId} gescand, maar dat is nog niet aan de beurt.`);
        this.scanner.start();
    }

    renderTask() {
        this.hideAllSections();
        document.getElementById('task-section').classList.remove('hidden');
        
        const task = this.currentPoint.task;
        
        // Toon opdrachtnummer
        document.getElementById('task-title').textContent = `Opdracht ${this.currentPoint.id}`;
        document.getElementById('task-question').textContent = task.q;
        
        document.getElementById('feedback').textContent = '';
        document.getElementById('feedback').className = 'feedback';
        document.getElementById('hint-display').classList.add('hidden');
        
        // Update pogingen indicator indien van toepassing
        this.updateAttemptsIndicator();
        
        const container = document.getElementById('task-input-container');
        container.innerHTML = '';
        
        // Toon optionele afbeelding bij de vraag (voor alle vraagtypen)
        if (task.image) {
            const img = document.createElement('img');
            img.src = task.image;
            img.alt = 'Afbeelding bij de vraag';
            img.className = 'task-image';
            container.appendChild(img);
        }
        
        // Reset check knop
        const checkBtn = document.getElementById('check-btn');
        checkBtn.textContent = 'Controleer antwoord';
        checkBtn.disabled = false;
        checkBtn.classList.remove('hidden');
        
        switch (task.type) {
            case 'mc':
                this.renderMultipleChoice(container, task.choices);
                break;
            case 'searchCode':
                this.renderSearchCode(container, task.inputLabel);
                break;
            case 'qrPuzzle':
                this.renderQRPuzzle(container, task);
                break;
            case 'text':
                this.renderTextInput(container, task.inputLabel);
                break;
            default:
                this.renderTextInput(container, 'Antwoord');
        }
        
        this.updateHintCounter();
    }

    renderMultipleChoice(container, choices) {
        const div = document.createElement('div');
        div.className = 'mc-options';
        
        choices.forEach((choice) => {
            const label = document.createElement('label');
            label.className = 'mc-option';
            label.innerHTML = `
                <input type="radio" name="mc-answer" value="${choice}">
                <span class="mc-label">${choice}</span>
            `;
            div.appendChild(label);
        });
        
        container.appendChild(div);
    }

    renderSearchCode(container, inputLabel) {
        // Afbeelding wordt nu in renderTask() toegevoegd
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'answer-input';
        input.className = 'text-input';
        input.placeholder = inputLabel || 'Typ je antwoord';
        container.appendChild(input);
    }

    renderQRPuzzle(container, task) {
        const div = document.createElement('div');
        div.className = 'qr-puzzle-info';
        div.innerHTML = `
            <p class="puzzle-tip">🧩 ${task.tip || 'Verzamel alle stukjes en scan de complete QR-code.'}</p>
            <p>Aantal stukjes: <strong>${task.pieces}</strong></p>
        `;
        container.appendChild(div);
        
        // Verberg de normale check knop
        document.getElementById('check-btn').classList.add('hidden');
        
        // Voeg scan puzzel knop toe
        const scanPuzzleBtn = document.createElement('button');
        scanPuzzleBtn.id = 'scan-puzzle-btn';
        scanPuzzleBtn.className = 'btn btn-primary';
        scanPuzzleBtn.textContent = '📷 Scan de puzzel QR-code';
        scanPuzzleBtn.onclick = () => this.startPuzzleScan();
        container.appendChild(scanPuzzleBtn);
    }

    startPuzzleScan() {
        // Sla op dat we wachten op een puzzel QR
        this.waitingForPuzzleQr = true;
        this.showScanner();
    }

    renderTextInput(container, inputLabel) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'answer-input';
        input.className = 'text-input';
        input.placeholder = inputLabel || 'Typ je antwoord';
        container.appendChild(input);
    }

    checkAnswer() {
        const answer = this.currentPoint.answer;
        const task = this.currentPoint.task;
        let userAnswer = '';
        let isCorrect = false;
        
        switch (task.type) {
            case 'mc':
                const selected = document.querySelector('input[name="mc-answer"]:checked');
                userAnswer = selected ? selected.value : '';
                isCorrect = userAnswer === answer.value;
                break;
                
            case 'searchCode':
            case 'text':
                const input = document.getElementById('answer-input');
                userAnswer = input ? input.value.trim() : '';
                
                if (answer.accept) {
                    isCorrect = answer.accept.some(a => 
                        a.toLowerCase() === userAnswer.toLowerCase()
                    );
                } else {
                    isCorrect = userAnswer.toLowerCase() === (answer.value || '').toLowerCase();
                }
                break;
                
            case 'qrPuzzle':
                isCorrect = true;
                break;
        }
        
        if (!isCorrect) {
            this.currentAttempts++;
        }
        
        this.showFeedback(isCorrect);
    }

    showFeedback(isCorrect) {
        const feedback = document.getElementById('feedback');
        const task = this.currentPoint.task;
        
        if (isCorrect) {
            feedback.textContent = 'Goed zo! 🎉';
            feedback.className = 'feedback success';
            
            this.completedPoints++;
            
            // Update verwacht volgende punt
            this.expectedNextPoint = this.currentPoint.next;
            
            this.saveState();
            this.updateProgress();
            
            document.getElementById('check-btn').textContent = 'Controleer antwoord';
            
            setTimeout(() => this.showNavigation(), 1500);
        } else {
            const maxAttempts = task.maxAttempts || 999; // Default: onbeperkt
            const attemptsLeft = maxAttempts - this.currentAttempts;
            
            if (attemptsLeft <= 0) {
                // Max pogingen bereikt
                feedback.innerHTML = `❌ Je hebt geen pogingen meer over.<br>Gebruik de hint om verder te gaan.`;
                feedback.className = 'feedback error';
                
                // Blokkeer verdere pogingen
                document.getElementById('check-btn').disabled = true;
                
                // Toon hint automatisch als die nog niet getoond is
                if (!this.currentHintShown) {
                    this.showHint();
                }
            } else {
                feedback.textContent = `Dat klopt niet helemaal. Nog ${attemptsLeft} poging${attemptsLeft === 1 ? '' : 'en'} over.`;
                feedback.className = 'feedback error';
            }
            
            this.updateAttemptsIndicator();
        }
    }

    updateAttemptsIndicator() {
        const task = this.currentPoint?.task;
        if (!task) return;
        
        const maxAttempts = task.maxAttempts;
        let indicator = document.getElementById('attempts-indicator');
        
        if (maxAttempts && maxAttempts < 999) {
            if (!indicator) {
                indicator = document.createElement('p');
                indicator.id = 'attempts-indicator';
                indicator.className = 'attempts-indicator';
                const taskCard = document.querySelector('.task-card');
                taskCard.insertBefore(indicator, document.getElementById('task-input-container'));
            }
            
            const remaining = Math.max(0, maxAttempts - this.currentAttempts);
            indicator.textContent = `Pogingen: ${remaining}/${maxAttempts}`;
            indicator.className = `attempts-indicator${remaining <= 1 ? ' warning' : ''}`;
        } else if (indicator) {
            indicator.remove();
        }
    }

    showHint() {
        if (this.currentHintShown) return;
        
        const hintDisplay = document.getElementById('hint-display');
        hintDisplay.textContent = '💡 ' + this.currentPoint.hint;
        hintDisplay.classList.remove('hidden');
        
        this.hintsUsed++;
        this.currentHintShown = true;
        this.saveState();
        this.updateHintCounter();
    }

    updateHintCounter() {
        const counter = document.getElementById('hint-counter');
        counter.textContent = `(${this.hintsUsed}/2 gebruikt)`;
        
        if (this.hintsUsed >= 2) {
            counter.classList.add('warning');
        }
    }

    showNavigation() {
        if (this.currentPoint.next === 'finish') {
            this.showFinish();
            return;
        }
        
        this.hideAllSections();
        document.getElementById('nav-section').classList.remove('hidden');
        
        const nav = this.currentPoint.nav;
        document.getElementById('nav-text').textContent = nav.text;
        
        const navImage = document.getElementById('nav-image');
        if (nav.img) {
            navImage.src = nav.img;
            navImage.style.display = 'block';
        } else {
            navImage.style.display = 'none';
        }
    }

    showFinish() {
        this.hideAllSections();
        document.getElementById('finish-section').classList.remove('hidden');
        
        const rules = this.routeData.rules;
        const earnedReward = this.hintsUsed < 3;
        
        const title = document.getElementById('finish-title');
        const icon = document.getElementById('finish-icon');
        const text = document.getElementById('finish-text');
        const hintsInfo = document.getElementById('finish-hints-used');
        
        if (earnedReward) {
            title.textContent = rules.reward.title;
            icon.textContent = '🍦';
            text.textContent = rules.reward.text;
        } else {
            title.textContent = rules.noReward.title;
            icon.textContent = '😅';
            text.textContent = rules.noReward.text;
        }
        
        hintsInfo.textContent = `Aantal hints gebruikt: ${this.hintsUsed}`;
    }

    updateProgress() {
        const fill = document.getElementById('progress-fill');
        const text = document.getElementById('progress-text');
        
        const percentage = (this.completedPoints / this.totalPoints) * 100;
        fill.style.width = `${percentage}%`;
        text.textContent = `Checkpoint ${this.completedPoints}/${this.totalPoints}`;
    }

    // Reset met bevestiging
    showResetConfirmation() {
        console.log('showResetConfirmation aangeroepen');
        const modal = document.getElementById('reset-modal');
        console.log('Modal element:', modal);
        if (modal) {
            modal.classList.remove('hidden');
            console.log('Modal zichtbaar gemaakt');
        } else {
            // Fallback: direct bevestiging vragen
            if (confirm('Weet je het zeker? Je voortgang gaat verloren.')) {
                this.restart();
            }
        }
    }

    hideResetModal() {
        const modal = document.getElementById('reset-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    confirmReset() {
        this.hideResetModal();
        this.restart();
    }

    restart() {
        this.clearState();
        this.updateProgress();
        this.updateHintCounter();
        this.showScanner();
    }

    hideAllSections() {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        
        if (this.scanner) {
            this.scanner.stop();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SijsjesbergQuest();
});
