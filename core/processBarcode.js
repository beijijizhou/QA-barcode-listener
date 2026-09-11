import { showBanner }
from '../ui/banner.js';

import { saveBarcode }
from '../db/barcodeRepo.js';
import { requireLogin } from '../auth/login.js';
import {
    incrementTodayPlatformSummary,
    incrementTodayScanCount
} from '../ui/badge.js';
import { normalizeBarcodeForCurrentSite } from './normalizeBarcode.js';


export async function processBarcode(code) {

    const barcode =
        normalizeBarcodeForCurrentSite(code);

    try {
        const user = await requireLogin();
        if (!user) return;

        showBanner(barcode);
        const input = document.querySelector([
            'input:not([type])',
            'input[type="text"]',
            'input[type="search"]',
            'input[type="tel"]',
            'input[type="url"]',
            'input[type="email"]'
        ].join(','));

        if (input) {
            input.value = barcode;
        }

        await saveBarcode(barcode);
        incrementTodayScanCount(user);
        incrementTodayPlatformSummary(user, barcode);

    } catch (err) {

        console.error('Save failed:', err);
        alert(
            `质检数据保存失败：${err?.message || String(err)}`
        );
    }
}
