import { showBanner }
from '../ui/banner.js';

import { saveBarcode }
from '../db/barcodeRepo.js';

export async function processBarcode(code) {

    showBanner(code);

    const input =
        document.querySelector('input[type="text"]') ||
        document.querySelector('input');

    if (input) {
        input.value = code;
    }

    try {

        await saveBarcode(code, 'EMP001');

        console.log('Barcode saved');

    } catch (err) {

        console.error('Save failed:', err);
    }
}