import {
    showActiveBadge
} from './activeTab';

showActiveBadge();

let barcodeBuffer = '';
let lastKeyTime = Date.now();
const SCANNER_SPEED_THRESHOLD = 40; // ms between keys

// 1. LISTEN FOR PRODUCTION PHYSICAL SCANNER
window.addEventListener('keydown', (event) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;
    lastKeyTime = currentTime;

    if (timeDiff > SCANNER_SPEED_THRESHOLD) {
        barcodeBuffer = ''; // Clear buffer if typed slowly by a human
    }

    if (event.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
            processScannedBarcode(barcodeBuffer);
            barcodeBuffer = '';
            event.preventDefault();
        }
    } else if (event.key.length === 1) {
        barcodeBuffer += event.key;
    }
});

// 2. LISTEN FOR NO-HARDWARE SIMULATION SHORTCUT (Ctrl + Shift + S)
window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();

        // Generate a random warehouse style barcode
        const mockBarcode = "QA-MOCK-" + Math.floor(100000 + Math.random() * 900000);

        // Simulate hardware typing speed (4ms per character)
        let index = 0;
        function fireKey() {
            if (index < mockBarcode.length) {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: mockBarcode[index] }));
                index++;
                setTimeout(fireKey, 4);
            } else {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            }
        }
        processScannedBarcode(mockBarcode);
        fireKey();
    }
});

// 3. INTERCEPT AND CHOOSE WHAT TO DO WITH THE DATA
async function processScannedBarcode(
    scannedCode
) {

    // VISUAL TESTING EFFECT
    const banner =
        document.createElement('div');

    banner.innerText =
        `📦 Intercepted Barcode: ${scannedCode}`;

    Object.assign(
        banner.style,
        {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#007BFF',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            zIndex: '10000',
            boxShadow:
                '0px 4px 12px rgba(0,0,0,0.2)'
        }
    );

    document.body.appendChild(
        banner
    );

    setTimeout(
        () => banner.remove(),
        3000
    );

    // AUTO INPUT FILL
    const anyInputField =
        document.querySelector(
            'input[type="text"]'
        ) ||
        document.querySelector(
            'input'
        );

    if (anyInputField) {
        anyInputField.value =
            scannedCode;
    }

    // DATABASE SAVE
    try {

        await saveBarcode(
            scannedCode,
            'EMP001'
        );

        console.log(
            'Barcode saved'
        );

    } catch (err) {

        console.error(
            'Save failed:',
            err
        );

    }
}