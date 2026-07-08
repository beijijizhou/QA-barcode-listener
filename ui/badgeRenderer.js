import { requireLogin,logout } from "../auth/login";
import { showActiveBadge } from "./badge";
import { renderHotstampDropdown } from "./hotstampDropdown";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderPlatformSummary(platformSummary = []) {
    if (!platformSummary.length) {
        return `
            <div style="font-size:12px;color:#eef7ff;">
                暂无
            </div>
        `;
    }

    return platformSummary
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

function renderRankingList(
    rows = [],
    currentUserName = ""
) {
    if (!rows.length) {
        return `
            <div style="font-size:12px;color:#eef7ff;">
                暂无
            </div>
        `;
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

    return visibleRows
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

function renderRankings(
    rankings = {},
    currentUserName = ""
) {
    return `
        <div id="qa-rankings" style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
        ">
            <div>
                <div style="
                    font-size:12px;
                    margin-bottom:4px;
                    color:#eef7ff;
                ">
                    Haloo 排名
                </div>
                <div id="qa-haloo-ranking">
                    ${renderRankingList(
                        rankings.haloo,
                        currentUserName
                    )}
                </div>
            </div>
            <div>
                <div style="
                    font-size:12px;
                    margin-bottom:4px;
                    color:#eef7ff;
                ">
                    小平台排名
                </div>
                <div id="qa-other-ranking">
                    ${renderRankingList(
                        rankings.other,
                        currentUserName
                    )}
                </div>
            </div>
        </div>
    `;
}

export function getBadge() {
    let badge =
        document.getElementById('qa-active-badge');

    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'qa-active-badge';
        document.body.appendChild(badge);
    }

    Object.assign(badge.style, {
        position: 'fixed',
        bottom: '50px',
        right: '50px',
        background: '#28a745',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        zIndex: '999999'
    });

    return badge;
}

export async function renderLoggedOut(badge) {
    badge.innerHTML = `
        <div style="margin-bottom:6px;">
            质检插件启动中 - 未登录
        </div>

        <button id="qa-login-btn">
            登录
        </button>
    `;

    badge
        .querySelector('#qa-login-btn')
        .onclick = async () => {

            const user =
                await requireLogin();

            if (user) {
                await showActiveBadge();
            }
        };
}

export async function renderLoggedIn(
    badge,
    user,
    count,
    platformSummary = [],
    rankings = {},
) {
    badge.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:6px;
        ">
            <span>
                质检插件启动中 -
                <span style="color:#003366;">
                    ${user.name}
                </span>
            </span>

            <button id="qa-minimize-btn">
                缩小
            </button>
        </div>

        <div style="margin-bottom:6px;">
            今日扫描:
            <span id="qa-today-scan-count">
                ${count}
            </span>
        </div>

        <div style="
            margin-bottom:8px;
            padding-top:6px;
            border-top:1px solid rgba(255,255,255,0.35);
            max-height:120px;
            overflow:auto;
        ">
            <div style="
                font-size:12px;
                margin-bottom:4px;
                color:#eef7ff;
            ">
                平台明细
            </div>
            <div id="qa-platform-summary">
                ${renderPlatformSummary(platformSummary)}
            </div>
        </div>

        <div style="
            margin-bottom:8px;
            padding-top:6px;
            border-top:1px solid rgba(255,255,255,0.35);
        ">
            ${renderRankings(rankings, user.name)}
        </div>

        <button id="qa-logout-btn">
            退出登录
        </button>
    `;
    
    badge
        .querySelector('#qa-minimize-btn')
        .onclick = () =>
            renderMinimized(badge);

    badge
        .querySelector('#qa-logout-btn')
        .onclick = async () => {
            await logout();
            await showActiveBadge();
        };
    await renderHotstampDropdown(badge);
}

function renderMinimized(badge) {
    badge.innerHTML = `
        <button id="qa-expand-btn">
            展开
        </button>

        <button id="qa-logout-btn">
            退出
        </button>
    `;

    badge
        .querySelector('#qa-expand-btn')
        .onclick = async () =>
            showActiveBadge();

    badge
        .querySelector('#qa-logout-btn')
        .onclick = async () => {
            await logout();
            await showActiveBadge();
        };
}
