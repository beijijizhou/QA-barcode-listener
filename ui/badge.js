
import {
    buildSwitchSummary,
    getCurrentPlatformCredentialStatus,
    syncCurrentHumbirdToken,
    getTodayBarcodeCountByUser,
    getTodayPlatformDashboardByUser
} from '../db/barcodeRepo.js';
import {
    renderLoggedIn,
    getBadge,
    renderLoggedOut,
    renderMinimized
} from './badgeRenderer.js';
import {
    getSharedBadgeMinimized,
    getSharedCurrentUser,
    getTodayCountKey,
    getTodayPlatformSummaryKey,
    getTodayRankingsKey,
    getTodaySwitchSummaryKey,
    isBadgeMinimizedKey,
    isCurrentUserKey,
    isTodayCountKey,
    isTodayPlatformSummaryKey,
    isTodayRankingsKey,
    isTodaySwitchSummaryKey,
    onSharedStateChange,
    setCurrentUserOnPage,
    setSharedTodayCount,
    setSharedTodayPlatformSummary,
    setSharedTodayRankings,
    setSharedTodaySwitchSummary
} from '../storage/sharedState.js';
import { getPlatformFromHostname } from '../core/platform.js';

let activeCountStorageKey = null;
let activePlatformSummaryStorageKey = null;
let activeRankingsStorageKey = null;
let activeSwitchSummaryStorageKey = null;
let isListeningForSharedState = false;
let currentUserName = "";
let currentCount = 0;
let currentPlatformSummary = [];
let currentHourlyRows = [];
let currentSwitchSummary = {};
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
    currentCount = Number(count) || 0;

    const countEl =
        document.getElementById('qa-today-scan-count');

    if (!countEl) return;

    countEl.textContent = String(currentCount);
}

function renderVisiblePlatformSummary(summary = []) {
    currentPlatformSummary = summary;

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

    if (!summaryEl) {
        return [...currentPlatformSummary];
    }

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

function getRiskColor(risk) {
    if (risk === "正常") return "#003366";
    if (risk === "注意") return "#7a4b00";
    if (risk === "频繁切换") return "#7f1d1d";
    return "#eef7ff";
}

function renderSwitchSteps(steps = []) {
    if (!steps.length) {
        return `
            <span style="color:#ffffff;">
                暂无
            </span>
        `;
    }

    return steps
        .map((step, index) => `
            ${index > 0 ? `
                <span style="
                    color:#d7f4df;
                    white-space:nowrap;
                ">
                    →
                </span>
            ` : ""}
            <span style="
                white-space:nowrap;
                color:#ffffff;
            ">
                ${escapeHtml(step.work)}（${Number(step.count) || 0}）
            </span>
        `)
        .join("");
}

function renderVisibleSwitchSummary(summary = {}) {
    currentSwitchSummary = summary;

    const switchEl =
        document.getElementById(
            'qa-switch-summary'
        );

    if (!switchEl) return;

    const risk = summary.risk || "暂无";

    switchEl.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            gap:12px;
            font-size:12px;
            line-height:1.5;
        ">
            <span>切换次数</span>
            <span style="
                color:${getRiskColor(risk)};
                font-weight:700;
            ">
                ${Number(summary.switchCount) || 0}
                / ${escapeHtml(risk)}
            </span>
        </div>
        <div style="
            font-size:12px;
            line-height:1.45;
            margin-top:3px;
            max-width:260px;
        ">
            <div style="
                color:#7f1d1d;
                font-weight:700;
                margin-bottom:4px;
                white-space:nowrap;
            ">
                规定流程: Haloo → 小平台 → Haloo
            </div>
            <div style="
                display:flex;
                flex-wrap:wrap;
                align-items:center;
                column-gap:3px;
                row-gap:1px;
            ">
                ${renderSwitchSteps(summary.steps)}
            </div>
        </div>
    `;
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

function getCurrentNewYorkHourKey() {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            hour12: false
        }
    ).format(new Date());
}

function getNewYorkHourKey(value) {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            hour12: false
        }
    ).format(new Date(value));
}

function getNewYorkHourLabel() {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: "America/New_York",
            hour: "2-digit",
            hour12: false
        }
    ).format(new Date()) + ":00";
}

function incrementCurrentHour(platform) {
    const currentHourKey =
        getCurrentNewYorkHourKey();
    let currentHour = currentHourlyRows.find(
        row =>
            getNewYorkHourKey(row.hourStartAt) ===
            currentHourKey
    );

    if (!currentHour) {
        currentHour = {
            hourStartAt: new Date().toISOString(),
            hourLabel: getNewYorkHourLabel(),
            halooCount: 0,
            otherCount: 0,
            totalCount: 0
        };
        currentHourlyRows.push(currentHour);
    }

    if (isHalooPlatform(platform)) {
        currentHour.halooCount += 1;
    } else {
        currentHour.otherCount += 1;
    }

    currentHour.totalCount += 1;
    currentHourlyRows.sort((a, b) =>
        new Date(a.hourStartAt) -
        new Date(b.hourStartAt)
    );
}

function emptyDashboard() {
    return {
        platformSummary: [],
        rankings: {
            haloo: [],
            other: []
        },
        hourlyRows: [],
        switchSummary: {
            switchCount: 0,
            path: "暂无",
            risk: "暂无",
            steps: []
        }
    };
}

function readableError(error) {
    if (error instanceof Error) {
        return error.message;
    }

    try {
        return JSON.stringify(error);
    } catch (_jsonError) {
        return String(error);
    }
}

function listenForSharedState() {
    if (isListeningForSharedState) return;

    onSharedStateChange((key, value) => {
        if (isCurrentUserKey(key)) {
            setCurrentUserOnPage(value);
            showActiveBadge();
            return;
        }

        if (isBadgeMinimizedKey(key)) {
            if (value) {
                renderMinimized(getBadge());
                return;
            }

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

        if (
            isTodaySwitchSummaryKey(key) &&
            key === activeSwitchSummaryStorageKey
        ) {
            renderVisibleSwitchSummary(value);
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

    let count = 0;
    let dashboard = emptyDashboard();
    let credentialStatus = {};

    try {
        count = await getTodayBarcodeCountByUser();
    } catch (error) {
        console.error(
            "QA Barcode Extension failed to fetch scan count:",
            readableError(error)
        );
    }

    try {
        dashboard =
            await getTodayPlatformDashboardByUser();
    } catch (error) {
        console.error(
            "QA Barcode Extension failed to fetch dashboard:",
            readableError(error)
        );
    }

    try {
        const syncResult =
            await syncCurrentHumbirdToken(user.name);
        credentialStatus =
            syncResult.status ||
            await getCurrentPlatformCredentialStatus();
    } catch (error) {
        console.error(
            "QA Barcode Extension failed to fetch credential status:",
            readableError(error)
        );
    }

    const {
        platformSummary,
        rankings,
        hourlyRows,
        switchSummary
    } = dashboard;
    currentCount = Number(count) || 0;
    currentPlatformSummary = platformSummary;
    currentHourlyRows = hourlyRows || [];
    currentSwitchSummary = switchSummary || {};
    activeCountStorageKey = getTodayCountKey(user);
    activePlatformSummaryStorageKey =
        getTodayPlatformSummaryKey(user);
    activeRankingsStorageKey =
        getTodayRankingsKey(user);
    activeSwitchSummaryStorageKey =
        getTodaySwitchSummaryKey(user);
    currentRankings = normalizeRankings(rankings);
    
    
    if (await getSharedBadgeMinimized()) {
        renderMinimized(badge);
    } else {
        await renderLoggedIn(
            badge,
            user,
            count,
            platformSummary,
            rankings,
            switchSummary,
            credentialStatus,
            
        );
    }

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
    await setSharedTodaySwitchSummary(
        user,
        switchSummary
    );
   
}

export function incrementTodayScanCount(user) {
    activeCountStorageKey =
        getTodayCountKey(user);

    const nextCount = currentCount + 1;

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

    activeSwitchSummaryStorageKey =
        getTodaySwitchSummaryKey(user);
    incrementCurrentHour(platform);
    currentSwitchSummary =
        buildSwitchSummary(currentHourlyRows);
    renderVisibleSwitchSummary(
        currentSwitchSummary
    );
    setSharedTodaySwitchSummary(
        user,
        currentSwitchSummary
    );
}
