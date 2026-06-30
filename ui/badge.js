
import { getTodayBarcodeCountByUser,getUsersByDepartment } from '../db/barcodeRepo.js';
import { renderLoggedIn, getBadge, renderLoggedOut } from './badgeRenderer.js';
import {
    getSharedCurrentUser,
    getTodayCountKey,
    isCurrentUserKey,
    isTodayCountKey,
    onSharedStateChange,
    setCurrentUserOnPage,
    setSharedTodayCount
} from '../storage/sharedState.js';

let activeCountStorageKey = null;
let isListeningForSharedState = false;

function setVisibleCount(count) {
    const countEl =
        document.getElementById('qa-today-scan-count');

    if (!countEl) return;

    countEl.textContent = String(count);
}

function getVisibleCount() {
    const countEl =
        document.getElementById('qa-today-scan-count');

    if (!countEl) return 0;

    const currentCount =
        Number.parseInt(
            countEl.textContent,
            10
        );

    return Number.isNaN(currentCount) ?
        0 :
        currentCount;
}

function listenForSharedState() {
    if (isListeningForSharedState) return;

    onSharedStateChange((key, value) => {
        if (isCurrentUserKey(key)) {
            setCurrentUserOnPage(value);
            showActiveBadge();
            return;
        }

        if (
            isTodayCountKey(key) &&
            key === activeCountStorageKey
        ) {
            setVisibleCount(value);
        }
    });

    isListeningForSharedState = true;
}

export async function showActiveBadge() {
    const badge = getBadge();

    listenForSharedState();

    const user = await getSharedCurrentUser();

    if (!user) {
        await renderLoggedOut(badge);
        return;
    }

    const count =
        await getTodayBarcodeCountByUser();
    activeCountStorageKey = getTodayCountKey(user);
    
    
    renderLoggedIn(
        badge,
        user,
        count,
        
    );

    await setSharedTodayCount(
        user,
        count
    );
   
}

export function incrementTodayScanCount(user) {
    activeCountStorageKey =
        getTodayCountKey(user);

    const nextCount = getVisibleCount() + 1;

    setVisibleCount(nextCount);
    setSharedTodayCount(
        user,
        nextCount
    );
}
