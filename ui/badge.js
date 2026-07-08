
import {
    getTodayBarcodeCountByUser,
    getTodayPlatformDashboardByUser
} from '../db/barcodeRepo.js';
import { renderLoggedIn, getBadge, renderLoggedOut } from './badgeRenderer.js';
import {
    getSharedCurrentUser,
    getTodayCountKey,
    getTodayPlatformSummaryKey,
    getTodayRankingsKey,
    isCurrentUserKey,
    isTodayCountKey,
    isTodayPlatformSummaryKey,
    isTodayRankingsKey,
    onSharedStateChange,
    setCurrentUserOnPage,
    setSharedTodayCount,
    setSharedTodayPlatformSummary,
    setSharedTodayRankings
} from '../storage/sharedState.js';
import { getPlatformFromHostname } from '../core/platform.js';

let activeCountStorageKey = null;
let activePlatformSummaryStorageKey = null;
let activeRankingsStorageKey = null;
let isListeningForSharedState = false;
let currentUserName = "";
let currentRankings = {
    haloo: [],
    other: []
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

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

function renderVisiblePlatformSummary(summary = []) {
    const summaryEl =
        document.getElementById('qa-platform-summary');

    if (!summaryEl) return;

    if (!summary.length) {
        summaryEl.innerHTML = `
            <div style="font-size:12px;color:#eef7ff;">
                暂无
            </div>
        `;
        return;
    }

    summaryEl.innerHTML = summary
        .map(row => `
            <div data-platform-summary-row="true" style="
                display:flex;
                justify-content:space-between;
                gap:12px;
                font-size:12px;
                line-height:1.5;
            ">
                <span style="
                    color:#003366;
                    font-weight:600;
                    max-width:120px;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                ">
                    ${escapeHtml(row.platform)}
                </span>
                <span style="color:#ffffff;">
                    ${Number(row.count) || 0}
                </span>
            </div>
        `)
        .join("");
}

function getVisiblePlatformSummary() {
    const summaryEl =
        document.getElementById('qa-platform-summary');

    if (!summaryEl) return [];

    return [
        ...summaryEl.querySelectorAll(
            '[data-platform-summary-row="true"]'
        )
    ]
        .map(row => {
            const [platformEl, countEl] =
                row.children;

            return {
                platform:
                    platformEl?.textContent?.trim() ||
                    "",
                count:
                    Number.parseInt(
                        countEl?.textContent,
                        10
                    ) || 0
            };
        })
        .filter(row => row.platform);
}

function renderRankingList(
    rankingEl,
    rows = []
) {
    if (!rankingEl) return;

    if (!rows.length) {
        rankingEl.innerHTML = `
            <div style="font-size:12px;color:#eef7ff;">
                暂无
            </div>
        `;
        return;
    }

    const topRows = rows.slice(0, 5);
    const currentUserRow = rows.find(
        row => row.name === currentUserName
    );
    const visibleRows =
        currentUserRow &&
        !topRows.some(row => row.name === currentUserName) ?
            [...topRows, currentUserRow] :
            topRows;

    rankingEl.innerHTML = visibleRows
        .map(row => {
            const isCurrentUser =
                row.name === currentUserName;

            return `
                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:8px;
                    font-size:12px;
                    line-height:1.5;
                    color:${isCurrentUser ? "#003366" : "#ffffff"};
                    font-weight:${isCurrentUser ? "700" : "400"};
                ">
                    <span style="
                        max-width:116px;
                        overflow:hidden;
                        text-overflow:ellipsis;
                        white-space:nowrap;
                    ">
                        #${Number(row.rank) || 0}
                        ${escapeHtml(row.name)}
                    </span>
                    <span>
                        ${Number(row.count) || 0}
                    </span>
                </div>
            `;
        })
        .join("");
}

function normalizeRankings(rankings = {}) {
    return {
        haloo: rankings.haloo || [],
        other: rankings.other || []
    };
}

function renderVisibleRankings(rankings = {}) {
    currentRankings = normalizeRankings(rankings);

    renderRankingList(
        document.getElementById('qa-haloo-ranking'),
        currentRankings.haloo
    );
    renderRankingList(
        document.getElementById('qa-other-ranking'),
        currentRankings.other
    );
}

function isHalooPlatform(platform) {
    return String(platform || "")
        .trim()
        .toLowerCase() === "haloo";
}

function rerank(rows = []) {
    return rows
        .filter(row => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((row, index) => ({
            ...row,
            rank: index + 1
        }));
}

function incrementRankingGroup(group) {
    const rows = [...currentRankings[group]];
    const currentUserRow = rows.find(
        row => row.name === currentUserName
    );

    if (currentUserRow) {
        currentUserRow.count += 1;
    } else {
        rows.push({
            rank: rows.length + 1,
            name: currentUserName,
            count: 1
        });
    }

    currentRankings = {
        ...currentRankings,
        [group]: rerank(rows)
    };
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

        if (
            isTodayPlatformSummaryKey(key) &&
            key === activePlatformSummaryStorageKey
        ) {
            renderVisiblePlatformSummary(value);
        }

        if (
            isTodayRankingsKey(key) &&
            key === activeRankingsStorageKey
        ) {
            renderVisibleRankings(value);
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

    currentUserName = user.name;

    const [count, dashboard] =
        await Promise.all([
            getTodayBarcodeCountByUser(),
            getTodayPlatformDashboardByUser()
        ]);
    const { platformSummary, rankings } = dashboard;
    activeCountStorageKey = getTodayCountKey(user);
    activePlatformSummaryStorageKey =
        getTodayPlatformSummaryKey(user);
    activeRankingsStorageKey =
        getTodayRankingsKey(user);
    currentRankings = normalizeRankings(rankings);
    
    
    renderLoggedIn(
        badge,
        user,
        count,
        platformSummary,
        rankings,
        
    );

    await setSharedTodayCount(
        user,
        count
    );
    await setSharedTodayPlatformSummary(
        user,
        platformSummary
    );
    await setSharedTodayRankings(
        user,
        rankings
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

export function incrementTodayPlatformSummary(user) {
    activePlatformSummaryStorageKey =
        getTodayPlatformSummaryKey(user);

    const platform = getPlatformFromHostname();
    const summary = getVisiblePlatformSummary();
    const currentRow = summary.find(
        row => row.platform === platform
    );

    if (currentRow) {
        currentRow.count += 1;
    } else {
        summary.push({
            platform,
            count: 1
        });
    }

    summary.sort((a, b) => b.count - a.count);
    renderVisiblePlatformSummary(summary);
    setSharedTodayPlatformSummary(
        user,
        summary
    );

    incrementRankingGroup(
        isHalooPlatform(platform) ?
            "haloo" :
            "other"
    );
    renderVisibleRankings(currentRankings);
    setSharedTodayRankings(
        user,
        currentRankings
    );
}
