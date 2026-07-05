import { processBarcode }
from '../core/processBarcode.js';

let buffer = '';
let lastTime = Date.now();

const THRESHOLD = 40;

export function registerPhysicalScanner() {

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const code = buffer.trim();
            buffer = '';

            if (code) {
                processBarcode(code);
            }

        } else if (event.key.length === 1) {
            buffer += event.key;
        }
    });

    window.addEventListener('paste', (event) => {
        const code =
            event.clipboardData
                ?.getData('text')
                ?.trim();

        if (!code) return;

        event.preventDefault();
        buffer = '';
        processBarcode(code);
    });
}
