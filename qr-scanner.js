/**
 * QR Scanner Module
 * Gebruikt html5-qrcode library voor camera-gebaseerde QR-scanning
 */

class QRScannerModule {
    constructor(elementId, onScanCallback) {
        this.elementId = elementId;
        this.onScanCallback = onScanCallback;
        this.html5QrCode = null;
        this.isScanning = false;
    }

    /**
     * Start de QR scanner
     */
    async start() {
        if (this.isScanning) return;

        try {
            this.html5QrCode = new Html5Qrcode(this.elementId);
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await this.html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.handleScan(decodedText),
                (errorMessage) => {
                    // Scan errors worden genegeerd (normaal gedrag tijdens scannen)
                }
            );

            this.isScanning = true;
        } catch (err) {
            console.error("Camera starten mislukt:", err);
            this.showCameraError();
        }
    }

    /**
     * Stop de QR scanner
     */
    async stop() {
        if (!this.isScanning || !this.html5QrCode) return;

        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
        } catch (err) {
            console.error("Camera stoppen mislukt:", err);
        }
    }

    /**
     * Verwerk een gescande QR-code
     */
    handleScan(decodedText) {
        this.stop();
        
        if (this.onScanCallback) {
            this.onScanCallback(decodedText);
        }
    }

    /**
     * Toon camera foutmelding
     */
    showCameraError() {
        const container = document.getElementById(this.elementId);
        if (container) {
            container.innerHTML = `
                <div class="camera-error">
                    <p>📷 Camera niet beschikbaar</p>
                    <p>Geef toestemming voor camera-toegang of gebruik HTTPS.</p>
                </div>
            `;
        }
    }
}

window.QRScannerModule = QRScannerModule;
