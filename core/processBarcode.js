import { showBanner }
from '../ui/banner.js';

import { saveBarcode }
from '../db/barcodeRepo.js';
import { getCurrentUser } from '../db/currentUser.js';
import { requireLogin } from '../auth/login.js';


export async function processBarcode(code) {

    showBanner(code);
    const input =
        document.querySelector('input[type="text"]') ||
        document.querySelector('input');

    if (input) {
        input.value = code;
    }

    try {
        requireLogin();
        await saveBarcode(code);

    } catch (err) {

        console.error('Save failed:', err);
    }
}