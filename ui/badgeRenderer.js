import { requireLogin,logout } from "../auth/login";
import { showActiveBadge } from "./badge";
import { renderHotstampDropdown } from "./hotstampDropdown";
import { setSharedBadgeMinimized } from "../storage/sharedState";

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

function renderSwitchSummary(summary = {}) {
    const risk = summary.risk || "暂无";

    return `
        <div id="qa-switch-summary">
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
        </div>
    `;
}

function credentialStatusText(status) {
    if (!status) return "未检查";
    if (status.status === "active") return "已保存";
    if (status.status === "missing") return "未保存";
    if (status.status === "expired") return "已失效";
    if (status.status === "error") return "异常";
    if (status.status === "unavailable") {
        const message = String(status.message || "");

        if (message.includes("状态 SQL")) {
            return "状态SQL未部署";
        }

        if (message.includes("保存入口")) {
            return "保存入口未部署";
        }

        return "暂不可用";
    }
    return status.status;
}

function getUserDepartment(user = {}) {
    const departments = Array.isArray(user.departments) ?
        user.departments :
        [user.production_department || "DTF"];
    return departments
        .map(value => String(value || "").trim())
        .filter(Boolean)
        .join(" / ") || "DTF";
}

function credentialStatusColor(status) {
    if (!status) return "#eef7ff";
    if (status.status === "active") return "#003366";
    if (status.status === "missing") return "#7a4b00";
    return "#7f1d1d";
}

function renderCredentialStatus(status = {}) {
    const fingerprint = status.tokenFingerprint ?
        ` / ${escapeHtml(status.tokenFingerprint)}` :
        "";

    return `
        <div id="qa-credential-status" style="
            margin-bottom:6px;
            font-size:12px;
            line-height:1.45;
        ">
            蜂鸟授权:
            <span style="color:#003366;font-weight:700;">
                ${escapeHtml(status.platform || "当前平台")}
            </span>
            <span style="
                color:${credentialStatusColor(status)};
                font-weight:700;
            ">
                ${credentialStatusText(status)}
            </span>
            <span style="color:#eef7ff;">
                ${fingerprint}
            </span>
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
    switchSummary = {},
    credentialStatus = {},
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
                    ${escapeHtml(user.name)}
                </span>
                <span style="
                    color:#003366;
                    font-size:12px;
                    font-weight:700;
                    margin-left:6px;
                    white-space:nowrap;
                ">
                    部门: ${escapeHtml(getUserDepartment(user))}
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

        ${renderCredentialStatus(credentialStatus)}

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

        <div style="
            margin-bottom:8px;
            padding-top:6px;
            border-top:1px solid rgba(255,255,255,0.35);
        ">
            <div style="
                font-size:12px;
                margin-bottom:4px;
                color:#eef7ff;
            ">
                今日流程
            </div>
            ${renderSwitchSummary(switchSummary)}
        </div>

        <button id="qa-logout-btn">
            退出登录
        </button>
    `;
    
    badge
        .querySelector('#qa-minimize-btn')
        .onclick = async () => {
            await setSharedBadgeMinimized(true);
            renderMinimized(badge);
        };

    badge
        .querySelector('#qa-logout-btn')
        .onclick = async () => {
            await logout();
            await showActiveBadge();
        };
    await renderHotstampDropdown(badge);
}

export function renderMinimized(badge) {
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
        .onclick = async () => {
            await setSharedBadgeMinimized(false);
            showActiveBadge();
        };

    badge
        .querySelector('#qa-logout-btn')
        .onclick = async () => {
            await logout();
            await showActiveBadge();
        };
}
