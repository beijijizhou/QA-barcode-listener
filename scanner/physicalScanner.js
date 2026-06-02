import { processBarcode }
from '../core/processBarcode.js';

let buffer = '';
let lastTime = Date.now();

const THRESHOLD = 40;

export function registerPhysicalScanner() {

    window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        processBarcode(buffer);
        buffer = '';
    } else if (event.key.length === 1) {
        buffer += event.key;
    }
});
}