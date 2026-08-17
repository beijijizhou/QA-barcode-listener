import { registerPhysicalScanner } from './scanner/physicalScanner.js';
import { registerMockScanner } from './scanner/mockScanner.js';
import { showActiveBadge } from './ui/badge.js';
import { setSharedBadgeMinimized } from './storage/sharedState.js';

function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }

    try {
        return JSON.stringify(error);
    } catch (_jsonError) {
        return String(error);
    }
}

setSharedBadgeMinimized(false)
    .then(showActiveBadge)
    .catch(error => {
        console.error(
            "QA Barcode Extension failed to render badge:",
            formatError(error)
        );
    });

registerPhysicalScanner();
registerMockScanner();
