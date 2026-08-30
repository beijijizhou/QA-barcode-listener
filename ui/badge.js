
import {
    buildSwitchSummary,
    getCurrentPlatformCredentialStatus,
    syncCurrentHumbirdToken,
    getTodayBarcodeCountByUser,
    getTodayPlatformDashboardByUser
} from '../db/barcodeRepo.js';
import {
    applyBadgePosition,
    renderLoggedIn,
    getBadge,
    renderLoggedOut,
    renderMinimized,
    updateCredentialStatus
} from './badgeRenderer.js';
import {
    getSharedBadgeMinimized,
    getSharedBadgePosition,
    getSharedCurrentUser,
    getTodayCountKey,
    getTodayPlatformSummaryKey,
    getTodayRankingsKey,
    getTodaySwitchSummaryKey,
    isBadgeMinimizedKey,
    isBadgePositionKey,
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
import {
    getPageProductionDepartment,
    isDtfDepartment
} from '../core/department.js';

let activeCountStorageKey = null;
let activePlatformSummaryStorageKey = null;
let activeRankingsStorageKey = null;
let activeSwitchSummaryStorageKey = null;
let isListeningForSharedState = false;
let currentUserName = "";
let currentDepartment = "DTF";
let currentCount = 0;
let currentPlatformSummary = [];
let currentHourlyRows = [];
let currentSwitchSummary = {};
let currentRankings = {
    total: [],
    haloo: [],
    other: []
};

function resetVisibleDashboardState(department = "DTF") {
    currentCount = 0;
    currentPlatformSummary = [];
    currentHourlyRows = [];
    currentSwitchSummary = {
        switchCount: 0,
        path: isDtfDepartment(department) ?
            "暂无" :
            "UV 不区分 Haloo / 小平台",
        risk: isDtfDepartment(department) ?
            "暂无" :
            "不适用",
        steps: []
    };
    currentRankings = {
        total: [],
        haloo: [],
        other: [],
        department
    };
}

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
        total: rankings.total || [],
        haloo: rankings.haloo || [],
        other: rankings.other || [],
        department:
            rankings.department || currentDepartment
    };
}

function sumPlatformSummary(summary = []) {
    return summary.reduce(
        (total, row) =>
            total + (Number(row.count) || 0),
        0
    );
}

function renderVisibleRankings(rankings = {}) {
    currentRankings = normalizeRankings(rankings);

    renderRankingList(
        document.getElementById('qa-total-ranking'),
        currentRankings.total
    );
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
            total: [],
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

        if (isBadgePositionKey(key)) {
            applyBadgePosition(value);
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

function isCurrentBadgeUser(user) {
    return currentUserName === user.name &&
        currentDepartment ===
            getPageProductionDepartment(user);
}

async function refreshBadgeData(user) {
    try {
        const count =
            await getTodayBarcodeCountByUser();

        if (!isCurrentBadgeUser(user)) return;

        currentCount = Number(count) || 0;
        setVisibleCount(currentCount);
        await setSharedTodayCount(
            user,
            currentCount
        );
    } catch (error) {
        console.error(
            "QA Barcode Extension failed to fetch scan count:",
            readableError(error)
        );
    }

    try {
        const dashboard =
            await getTodayPlatformDashboardByUser();

        if (!isCurrentBadgeUser(user)) return;

        const {
            platformSummary,
            rankings,
            hourlyRows,
            switchSummary
        } = dashboard;

        currentPlatformSummary = platformSummary || [];
        currentHourlyRows = hourlyRows || [];
        currentSwitchSummary = switchSummary || {};
        currentRankings = normalizeRankings(rankings);

        if (!currentCount) {
            currentCount = sumPlatformSummary(
                currentPlatformSummary
            );
            setVisibleCount(currentCount);
            await setSharedTodayCount(
                user,
                currentCount
            );
        }

        renderVisiblePlatformSummary(
            currentPlatformSummary
        );
        renderVisibleRankings(currentRankings);
        renderVisibleSwitchSummary(
            currentSwitchSummary
        );

        await setSharedTodayPlatformSummary(
            user,
            currentPlatformSummary
        );
        await setSharedTodayRankings(
            user,
            currentRankings
        );
        await setSharedTodaySwitchSummary(
            user,
            currentSwitchSummary
        );
    } catch (error) {
        console.error(
            "QA Barcode Extension failed to fetch dashboard:",
            readableError(error)
        );
    }

    try {
        if (
            !isDtfDepartment(currentDepartment) ||
            !isCurrentBadgeUser(user)
        ) {
            return;
        }

        const syncResult =
            await syncCurrentHumbirdToken(user.name);

        if (!isCurrentBadgeUser(user)) return;

        updateCredentialStatus(
            syncResult.status ||
            await getCurrentPlatformCredentialStatus()
        );
    } catch (error) {
        console.error(
            "QA Barcode Extension failed to fetch credential status:",
            readableError(error)
        );
    }
}

export async function showActiveBadge(options = {}) {
    const badge = getBadge();

    listenForSharedState();
    getSharedBadgePosition()
        .then(applyBadgePosition)
        .catch(error => {
            console.error(
                "QA Barcode Extension failed to apply badge position:",
                readableError(error)
            );
        });

    const user = await getSharedCurrentUser();

    if (!user) {
        await renderLoggedOut(badge);
        return;
    }

    const nextDepartment =
        getPageProductionDepartment(user);
    const nextCountStorageKey = getTodayCountKey(user);
    const nextPlatformSummaryStorageKey =
        getTodayPlatformSummaryKey(user);
    const nextRankingsStorageKey =
        getTodayRankingsKey(user);
    const nextSwitchSummaryStorageKey =
        getTodaySwitchSummaryKey(user);
    const isSameDashboard =
        currentUserName === user.name &&
        currentDepartment === nextDepartment &&
        activeCountStorageKey === nextCountStorageKey &&
        activePlatformSummaryStorageKey ===
            nextPlatformSummaryStorageKey &&
        activeRankingsStorageKey === nextRankingsStorageKey &&
        activeSwitchSummaryStorageKey ===
            nextSwitchSummaryStorageKey;

    currentUserName = user.name;
    currentDepartment = nextDepartment;
    activeCountStorageKey = nextCountStorageKey;
    activePlatformSummaryStorageKey =
        nextPlatformSummaryStorageKey;
    activeRankingsStorageKey = nextRankingsStorageKey;
    activeSwitchSummaryStorageKey =
        nextSwitchSummaryStorageKey;

    if (!isSameDashboard) {
        resetVisibleDashboardState(currentDepartment);
    }

    const isMinimized = options.forceExpanded ?
        false :
        await getSharedBadgeMinimized();

    if (isMinimized) {
        renderMinimized(badge);
        return;
    }

    const credentialStatus =
        isDtfDepartment(currentDepartment) ?
            {} :
            { hidden: true };

    await renderLoggedIn(
        badge,
        user,
        currentCount,
        currentPlatformSummary,
        currentRankings,
        currentSwitchSummary,
        credentialStatus,
    );

    refreshBadgeData(user);
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

export function incrementTodayPlatformSummary(user, code = "") {
    activePlatformSummaryStorageKey =
        getTodayPlatformSummaryKey(user);

    const platform = getPlatformFromHostname(
        undefined,
        currentDepartment,
        code
    );
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

    if (isDtfDepartment(currentDepartment)) {
        incrementRankingGroup(
            isHalooPlatform(platform) ?
                "haloo" :
                "other"
        );
    } else {
        incrementRankingGroup("total");
    }
    renderVisibleRankings(currentRankings);
    setSharedTodayRankings(
        user,
        currentRankings
    );

    if (isDtfDepartment(currentDepartment)) {
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
}
