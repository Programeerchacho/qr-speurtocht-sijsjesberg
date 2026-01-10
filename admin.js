/**
 * Sijsjesberg Quest - Admin Panel
 */

// SHA-256 hash van wachtwoord "admin123" (wijzig dit naar je eigen wachtwoord)
// Genereer een nieuwe hash via: https://emn178.github.io/online-tools/sha256.html
const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

class AdminPanel {
    constructor() {
        this.routeData = null;
        this.currentSeason = null;
        this.currentCheckpoint = null;
        
        this.init();
    }

    async init() {
        this.checkSession();
        this.setupEventListeners();
        await this.loadRouteData();
    }

    // ============ AUTHENTICATIE ============

    checkSession() {
        const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
        if (isLoggedIn) {
            this.showDashboard();
        }
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async login() {
        const passwordInput = document.getElementById('password-input');
        const password = passwordInput.value;
        const hash = await this.hashPassword(password);
        
        if (hash === ADMIN_PASSWORD_HASH) {
            sessionStorage.setItem('admin_logged_in', 'true');
            this.showDashboard();
        } else {
            document.getElementById('login-error').classList.remove('hidden');
            passwordInput.value = '';
        }
    }

    logout() {
        sessionStorage.removeItem('admin_logged_in');
        location.reload();
    }

    showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        this.renderSeasonList();
    }

    // ============ DATA LADEN ============

    async loadRouteData() {
        try {
            const response = await fetch('routes.json');
            this.routeData = await response.json();
            this.renderSeasonList();
        } catch (err) {
            console.error('Route data laden mislukt:', err);
            // Start met lege data
            this.routeData = {
                appName: "Sijsjesberg Quest",
                rules: {
                    maxHintsForReward: 3,
                    reward: { title: "IJsje!", text: "Je verdient een ijsje 🍦" },
                    noReward: { title: "Bijna…", text: "Geen ijsje deze keer." }
                },
                seasons: {}
            };
        }
    }

    // ============ EVENT LISTENERS ============

    setupEventListeners() {
        // Login
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('password-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Import/Export
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importJSON(e));
        document.getElementById('export-btn').addEventListener('click', () => this.exportJSON());

        // Seizoen
        document.getElementById('add-season-btn').addEventListener('click', () => this.addSeason());
        document.getElementById('save-season-btn').addEventListener('click', () => this.saveSeason());
        document.getElementById('delete-season-btn').addEventListener('click', () => this.deleteSeason());

        // Checkpoint
        document.getElementById('add-checkpoint-btn').addEventListener('click', () => this.addCheckpoint());
        document.getElementById('save-checkpoint-btn').addEventListener('click', () => this.saveCheckpoint());
        document.getElementById('delete-checkpoint-btn').addEventListener('click', () => this.deleteCheckpoint());
        document.getElementById('cp-type').addEventListener('change', () => this.toggleTypeFields());
        document.getElementById('cp-qr').addEventListener('input', () => this.updateQRPreview());

        // QR
        document.getElementById('generate-all-qr-btn').addEventListener('click', () => this.showQRGenerator());
        document.getElementById('download-qr-btn').addEventListener('click', () => this.downloadCurrentQR());
        document.getElementById('download-puzzle-qr-btn').addEventListener('click', () => this.downloadPuzzleQR());
        document.getElementById('download-all-qr-btn').addEventListener('click', () => this.downloadAllQR());
        
        // Update puzzle QR preview wanneer het veld verandert
        document.getElementById('cp-puzzle-qr').addEventListener('input', () => this.updateQRPreview());
    }

    // ============ SEIZOEN BEHEER ============

    renderSeasonList() {
        const container = document.getElementById('season-list');
        container.innerHTML = '';

        if (!this.routeData || !this.routeData.seasons) return;

        for (const seasonId in this.routeData.seasons) {
            const season = this.routeData.seasons[seasonId];
            const btn = document.createElement('button');
            btn.className = 'season-btn' + (this.currentSeason === seasonId ? ' active' : '');
            btn.textContent = season.label || seasonId;
            btn.addEventListener('click', () => this.selectSeason(seasonId));
            container.appendChild(btn);
        }
    }

    selectSeason(seasonId) {
        this.currentSeason = seasonId;
        this.currentCheckpoint = null;
        this.renderSeasonList();
        this.renderCheckpointList();
        this.showSeasonEditor();
    }

    showSeasonEditor() {
        this.hideAllPanels();
        document.getElementById('season-editor').classList.remove('hidden');

        const season = this.routeData.seasons[this.currentSeason];
        document.getElementById('season-id').value = this.currentSeason;
        document.getElementById('season-label').value = season.label || '';
        document.getElementById('season-route-title').value = season.route?.title || '';
        document.getElementById('season-intro-text').value = season.route?.intro?.text || '';
    }

    addSeason() {
        const id = prompt('Voer een seizoen ID in (bijv. "spring"):');
        if (!id) return;

        if (this.routeData.seasons[id]) {
            alert('Dit seizoen bestaat al!');
            return;
        }

        this.routeData.seasons[id] = {
            label: id.charAt(0).toUpperCase() + id.slice(1),
            route: {
                title: `${id} route`,
                intro: { text: '', start: '1' },
                points: {},
                finish: {
                    title: 'Einde!',
                    text: 'Gefeliciteerd!',
                    rewardLogic: { hintsUsedMax: 3, onWinKey: 'reward', onLoseKey: 'noReward' }
                }
            }
        };

        this.renderSeasonList();
        this.selectSeason(id);
    }

    saveSeason() {
        const season = this.routeData.seasons[this.currentSeason];
        season.label = document.getElementById('season-label').value;
        season.route.title = document.getElementById('season-route-title').value;
        season.route.intro.text = document.getElementById('season-intro-text').value;
        
        alert('Seizoen opgeslagen! Vergeet niet te exporteren.');
        this.renderSeasonList();
    }

    deleteSeason() {
        if (!confirm(`Weet je zeker dat je seizoen "${this.currentSeason}" wilt verwijderen?`)) return;
        
        delete this.routeData.seasons[this.currentSeason];
        this.currentSeason = null;
        this.currentCheckpoint = null;
        this.renderSeasonList();
        this.renderCheckpointList();
        this.hideAllPanels();
        document.getElementById('welcome-panel').classList.remove('hidden');
    }

    // ============ CHECKPOINT BEHEER ============

    renderCheckpointList() {
        const container = document.getElementById('checkpoint-list');
        container.innerHTML = '';

        if (!this.currentSeason) return;

        const points = this.routeData.seasons[this.currentSeason].route.points;
        
        for (const pointId in points) {
            const point = points[pointId];
            const btn = document.createElement('button');
            btn.className = 'checkpoint-btn' + (this.currentCheckpoint === pointId ? ' active' : '');
            btn.innerHTML = `<strong>${pointId}</strong><br><small>${point.qr}</small>`;
            btn.addEventListener('click', () => this.selectCheckpoint(pointId));
            container.appendChild(btn);
        }
    }

    selectCheckpoint(pointId) {
        this.currentCheckpoint = pointId;
        this.renderCheckpointList();
        this.showCheckpointEditor();
    }

    showCheckpointEditor() {
        this.hideAllPanels();
        document.getElementById('checkpoint-editor').classList.remove('hidden');

        const point = this.routeData.seasons[this.currentSeason].route.points[this.currentCheckpoint];
        
        document.getElementById('cp-id').value = this.currentCheckpoint;
        document.getElementById('cp-qr').value = point.qr || '';
        document.getElementById('cp-type').value = point.task?.type || 'text';
        document.getElementById('cp-question').value = point.task?.q || '';
        document.getElementById('cp-choices').value = (point.task?.choices || []).join('\n');
        document.getElementById('cp-pieces').value = point.task?.pieces || 6;
        document.getElementById('cp-puzzle-qr').value = point.task?.puzzleQr || '';
        document.getElementById('cp-max-attempts').value = point.task?.maxAttempts || 0;
        
        // Antwoord
        if (point.answer?.accept) {
            document.getElementById('cp-answer').value = point.answer.accept.join(', ');
        } else {
            document.getElementById('cp-answer').value = point.answer?.value || '';
        }
        
        document.getElementById('cp-hint').value = point.hint || '';
        document.getElementById('cp-nav-text').value = point.nav?.text || '';
        document.getElementById('cp-nav-image').value = point.nav?.img || '';
        document.getElementById('cp-task-image').value = point.task?.image || '';

        // Volgende checkpoint dropdown
        this.populateNextDropdown(point.next);
        
        this.toggleTypeFields();
        this.updateQRPreview();
    }

    populateNextDropdown(currentNext) {
        const select = document.getElementById('cp-next');
        select.innerHTML = '<option value="finish">Finish (einde)</option>';
        
        const points = this.routeData.seasons[this.currentSeason].route.points;
        for (const pointId in points) {
            if (pointId !== this.currentCheckpoint) {
                const option = document.createElement('option');
                option.value = pointId;
                option.textContent = `Checkpoint ${pointId}`;
                if (pointId === currentNext) option.selected = true;
                select.appendChild(option);
            }
        }
        
        if (currentNext === 'finish') {
            select.value = 'finish';
        }
    }

    toggleTypeFields() {
        const type = document.getElementById('cp-type').value;
        document.getElementById('mc-options-container').classList.toggle('hidden', type !== 'mc');
        document.getElementById('max-attempts-container').classList.toggle('hidden', type !== 'mc');
        document.getElementById('qr-puzzle-container').classList.toggle('hidden', type !== 'qrPuzzle');
        // task-image-container is nu altijd zichtbaar (optioneel voor alle vraagtypen)
        
        // Update QR preview om puzzel QR te tonen/verbergen
        this.updateQRPreview();
    }

    addCheckpoint() {
        if (!this.currentSeason) {
            alert('Selecteer eerst een seizoen.');
            return;
        }

        const points = this.routeData.seasons[this.currentSeason].route.points;
        const existingIds = Object.keys(points).map(Number).filter(n => !isNaN(n));
        const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

        points[newId] = {
            qr: `${this.currentSeason.toUpperCase()}-${newId}`,
            task: { type: 'text', q: 'Nieuwe vraag' },
            answer: { type: 'text', value: '' },
            hint: '',
            next: 'finish',
            nav: { text: '' }
        };

        this.renderCheckpointList();
        this.selectCheckpoint(newId.toString());
    }

    saveCheckpoint() {
        const point = this.routeData.seasons[this.currentSeason].route.points[this.currentCheckpoint];
        const type = document.getElementById('cp-type').value;
        
        point.qr = document.getElementById('cp-qr').value;
        point.task = {
            type: type,
            q: document.getElementById('cp-question').value
        };
        
        // Optionele afbeelding voor alle vraagtypen
        const taskImage = document.getElementById('cp-task-image').value.trim();
        if (taskImage) {
            point.task.image = taskImage;
        }

        if (type === 'mc') {
            point.task.choices = document.getElementById('cp-choices').value.split('\n').filter(c => c.trim());
            const maxAttempts = parseInt(document.getElementById('cp-max-attempts').value) || 0;
            if (maxAttempts > 0) {
                point.task.maxAttempts = maxAttempts;
            }
            point.answer = { type: 'choice', value: document.getElementById('cp-answer').value };
        } else if (type === 'qrPuzzle') {
            point.task.pieces = parseInt(document.getElementById('cp-pieces').value);
            const puzzleQr = document.getElementById('cp-puzzle-qr').value.trim();
            point.task.puzzleQr = puzzleQr;
            point.answer = { type: 'qrScan', value: puzzleQr };
        } else if (type === 'searchCode') {
            point.task.inputLabel = 'Code';
            const answerValue = document.getElementById('cp-answer').value;
            if (answerValue.includes(',')) {
                point.answer = { type: 'code', accept: answerValue.split(',').map(a => a.trim()) };
            } else {
                point.answer = { type: 'code', value: answerValue };
            }
        } else {
            const answerValue = document.getElementById('cp-answer').value;
            if (answerValue.includes(',')) {
                point.answer = { type: 'text', accept: answerValue.split(',').map(a => a.trim()) };
            } else {
                point.answer = { type: 'text', value: answerValue };
            }
        }

        point.hint = document.getElementById('cp-hint').value;
        point.next = document.getElementById('cp-next').value;
        
        // Navigatie met optionele afbeelding
        const navImage = document.getElementById('cp-nav-image').value.trim();
        point.nav = { 
            text: document.getElementById('cp-nav-text').value 
        };
        if (navImage) {
            point.nav.img = navImage;
        }

        alert('Checkpoint opgeslagen! Vergeet niet te exporteren.');
        this.renderCheckpointList();
    }

    deleteCheckpoint() {
        if (!confirm(`Weet je zeker dat je checkpoint "${this.currentCheckpoint}" wilt verwijderen?`)) return;
        
        delete this.routeData.seasons[this.currentSeason].route.points[this.currentCheckpoint];
        this.currentCheckpoint = null;
        this.renderCheckpointList();
        this.hideAllPanels();
        document.getElementById('welcome-panel').classList.remove('hidden');
    }

    // ============ QR CODE GENERATIE ============

    generateQR(text, size = 4) {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createDataURL(size, 0);
    }

    updateQRPreview() {
        const qrCode = document.getElementById('cp-qr').value;
        const preview = document.getElementById('qr-preview');
        const type = document.getElementById('cp-type').value;
        const puzzleQrContainer = document.getElementById('puzzle-qr-preview-item');
        const puzzleQrPreview = document.getElementById('puzzle-qr-preview');
        
        // Checkpoint QR preview
        if (qrCode) {
            const dataUrl = this.generateQR(qrCode, 6);
            preview.innerHTML = `<img src="${dataUrl}" alt="QR Code">`;
        } else {
            preview.innerHTML = '<p>Voer een QR code in</p>';
        }
        
        // Puzzel QR preview (alleen voor qrPuzzle type)
        if (type === 'qrPuzzle') {
            puzzleQrContainer.classList.remove('hidden');
            const puzzleQrCode = document.getElementById('cp-puzzle-qr').value;
            if (puzzleQrCode) {
                const puzzleDataUrl = this.generateQR(puzzleQrCode, 6);
                puzzleQrPreview.innerHTML = `<img src="${puzzleDataUrl}" alt="Puzzel QR Code">`;
            } else {
                puzzleQrPreview.innerHTML = '<p>Voer een puzzel QR code in</p>';
            }
        } else {
            puzzleQrContainer.classList.add('hidden');
        }
    }

    downloadCurrentQR() {
        const qrCode = document.getElementById('cp-qr').value;
        if (!qrCode) {
            alert('Geen QR code om te downloaden');
            return;
        }
        
        const dataUrl = this.generateQR(qrCode, 10);
        this.downloadImage(dataUrl, `${qrCode}.png`);
    }

    downloadPuzzleQR() {
        const puzzleQrCode = document.getElementById('cp-puzzle-qr').value;
        if (!puzzleQrCode) {
            alert('Geen puzzel QR code om te downloaden');
            return;
        }
        
        const dataUrl = this.generateQR(puzzleQrCode, 10);
        this.downloadImage(dataUrl, `${puzzleQrCode}.png`);
    }

    showQRGenerator() {
        if (!this.currentSeason) {
            alert('Selecteer eerst een seizoen.');
            return;
        }

        this.hideAllPanels();
        document.getElementById('qr-generator-panel').classList.remove('hidden');

        const grid = document.getElementById('qr-grid');
        grid.innerHTML = '';

        const points = this.routeData.seasons[this.currentSeason].route.points;
        
        for (const pointId in points) {
            const point = points[pointId];
            const qrCode = point.qr;
            
            // Checkpoint QR card
            const card = document.createElement('div');
            card.className = 'qr-card';
            
            const dataUrl = this.generateQR(qrCode, 6);
            card.innerHTML = `
                <img src="${dataUrl}" alt="${qrCode}">
                <p><strong>${qrCode}</strong></p>
                <small>Checkpoint ${pointId}</small>
                <button class="btn btn-small" onclick="admin.downloadImage('${this.generateQR(qrCode, 10)}', '${qrCode}.png')">Download</button>
            `;
            
            grid.appendChild(card);
            
            // Puzzel QR card (alleen voor qrPuzzle type)
            if (point.task?.type === 'qrPuzzle' && point.task?.puzzleQr) {
                const puzzleQrCode = point.task.puzzleQr;
                const puzzleCard = document.createElement('div');
                puzzleCard.className = 'qr-card qr-card-puzzle';
                
                const puzzleDataUrl = this.generateQR(puzzleQrCode, 6);
                puzzleCard.innerHTML = `
                    <img src="${puzzleDataUrl}" alt="${puzzleQrCode}">
                    <p><strong>${puzzleQrCode}</strong></p>
                    <small>🧩 Puzzel antwoord</small>
                    <button class="btn btn-small" onclick="admin.downloadImage('${this.generateQR(puzzleQrCode, 10)}', '${puzzleQrCode}.png')">Download</button>
                `;
                
                grid.appendChild(puzzleCard);
            }
        }

        // Voeg finish QR toe
        const finishCard = document.createElement('div');
        finishCard.className = 'qr-card';
        const finishUrl = this.generateQR('FINISH', 6);
        finishCard.innerHTML = `
            <img src="${finishUrl}" alt="FINISH">
            <p><strong>FINISH</strong></p>
            <small>Einde route</small>
            <button class="btn btn-small" onclick="admin.downloadImage('${this.generateQR('FINISH', 10)}', 'FINISH.png')">Download</button>
        `;
        grid.appendChild(finishCard);
    }

    downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    }

    downloadAllQR() {
        const points = this.routeData.seasons[this.currentSeason].route.points;
        
        // Download elke QR met korte delay
        let delay = 0;
        for (const pointId in points) {
            const point = points[pointId];
            const qrCode = point.qr;
            
            // Download checkpoint QR
            setTimeout(() => {
                this.downloadImage(this.generateQR(qrCode, 10), `${qrCode}.png`);
            }, delay);
            delay += 300;
            
            // Download puzzel QR indien aanwezig
            if (point.task?.type === 'qrPuzzle' && point.task?.puzzleQr) {
                const puzzleQrCode = point.task.puzzleQr;
                setTimeout(() => {
                    this.downloadImage(this.generateQR(puzzleQrCode, 10), `${puzzleQrCode}.png`);
                }, delay);
                delay += 300;
            }
        }
        
        // Finish QR
        setTimeout(() => {
            this.downloadImage(this.generateQR('FINISH', 10), 'FINISH.png');
        }, delay);
    }

    // ============ IMPORT/EXPORT ============

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.routeData = JSON.parse(e.target.result);
                this.currentSeason = null;
                this.currentCheckpoint = null;
                this.renderSeasonList();
                this.renderCheckpointList();
                this.hideAllPanels();
                document.getElementById('welcome-panel').classList.remove('hidden');
                alert('Routes succesvol geïmporteerd!');
            } catch (err) {
                alert('Fout bij importeren: ongeldig JSON bestand');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    exportJSON() {
        const json = JSON.stringify(this.routeData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = 'routes.json';
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        alert('routes.json gedownload! Vervang het bestand in je project map.');
    }

    // ============ HELPERS ============

    hideAllPanels() {
        document.querySelectorAll('.editor-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
    }
}

// Start admin panel
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminPanel();
});
