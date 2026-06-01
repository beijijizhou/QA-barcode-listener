import { processBarcode }
from '../core/processBarcode.js';

let buffer = '';
let lastTime = Date.now();

const THRESHOLD = 40;

export function registerPhysicalScanner() {

    window.addEventListener('keydown', (event) => {

        const now = Date.now();
        const diff = now - lastTime;
        lastTime = now;

        if (diff > THRESHOLD) {
            buffer = '';
        }

        if (event.key === 'Enter') {

            if (buffer.length >= 3) {
                processBarcode(buffer);
                buffer = '';
                event.preventDefault();
            }

        } else if (event.key.length === 1) {
            buffer += event.key;
        }
    });
}