import { showBanner }
from '../ui/banner.js';

import { saveBarcode }
from '../db/barcodeRepo.js';
import { getCurrentUser } from '../db/currentUser.js';
import { requireLogin } from '../auth/login.js';
import { incrementTodayScanCount } from '../ui/badge.js';


export async function processBarcode(code) {

    showBanner(code);
    const input =
        document.querySelector('input[type="text"]') ||
        document.querySelector('input');

    if (input) {
        input.value = code;
    }

    try {
        const user = await requireLogin();
        if (!user) return;

        await saveBarcode(code);
        incrementTodayScanCount(user);

    } catch (err) {

        console.error('Save failed:', err);
    }
}
