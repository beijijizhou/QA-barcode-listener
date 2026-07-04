import { showBanner }
from '../ui/banner.js';

import { saveBarcode }
from '../db/barcodeRepo.js';
import { getCurrentUser } from '../db/currentUser.js';
import { requireLogin } from '../auth/login.js';
import { incrementTodayScanCount } from '../ui/badge.js';
import { normalizeBarcodeForCurrentSite } from './normalizeBarcode.js';


export async function processBarcode(code) {

    const barcode =
        normalizeBarcodeForCurrentSite(code);

    showBanner(barcode);
    const input =
        document.querySelector('input[type="text"]') ||
        document.querySelector('input');

    if (input) {
        input.value = barcode;
    }

    try {
        const user = await requireLogin();
        if (!user) return;

        await saveBarcode(barcode);
        incrementTodayScanCount(user);

    } catch (err) {

        console.error('Save failed:', err);
    }
}
