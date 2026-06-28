
import { getTodayBarcodeCountByUser,getUsersByDepartment } from '../db/barcodeRepo.js';
import { renderLoggedIn, getBadge, renderLoggedOut } from './badgeRenderer.js';

let activeCountStorageKey = null;
let isListeningForCountChanges = false;

const getCountStorageKey = (user) =>
    [
        'qa_today_scan_count',
        user.name,
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone: 'America/New_York'
            }
        ).format(new Date())
    ].join(':');

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

function shareCount(count) {
    if (!activeCountStorageKey) return;

    chrome.storage?.local?.set({
        [activeCountStorageKey]: count
    });
}

function listenForSharedCount() {
    if (isListeningForCountChanges) return;

    chrome.storage?.onChanged?.addListener((changes, areaName) => {
        const changedCount =
            activeCountStorageKey &&
            changes[activeCountStorageKey];

        if (areaName === 'local' && changedCount) {
            setVisibleCount(changedCount.newValue);
        }
    });

    isListeningForCountChanges = true;
}

export async function showActiveBadge() {
    const badge = getBadge();

    const user = JSON.parse(
        localStorage.getItem('currentUser')
    );

    if (!user) {
        await renderLoggedOut(badge);
        return;
    }

    const count =
        await getTodayBarcodeCountByUser();
    activeCountStorageKey = getCountStorageKey(user);
    
    
    renderLoggedIn(
        badge,
        user,
        count,
        
    );

    listenForSharedCount();
    shareCount(count);
   
}

export function incrementTodayScanCount(user) {
    activeCountStorageKey =
        getCountStorageKey(user);

    const nextCount = getVisibleCount() + 1;

    setVisibleCount(nextCount);
    shareCount(nextCount);
}
