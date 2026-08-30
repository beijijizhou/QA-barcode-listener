import { requireLogin,logout } from "../auth/login";
import { showActiveBadge } from "./badge";
import { renderHotstampDropdown } from "./hotstampDropdown";
import {
    getBadgePositionFromPage,
    setSharedBadgeMinimized,
    setSharedBadgePosition
} from "../storage/sharedState";
import {
    getPageProductionDepartment,
    getUserJobTitle,
    isDtfDepartment
} from "../core/department.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function ensureBadgeStyle() {
    if (document.getElementById("qa-badge-style")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "qa-badge-style";
    style.textContent = `
        #qa-active-badge,
        #qa-active-badge * {
            box-sizing: border-box !important;
            font-family: Arial, Helvetica, sans-serif !important;
            letter-spacing: 0 !important;
        }

        #qa-active-badge button {
            background: #ffe038 !important;
            color: #003366 !important;
            border: 1px solid #f58216 !important;
            border-radius: 6px !important;
            padding: 4px 8px !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            cursor: pointer !important;
        }

        #qa-active-badge button:hover {
            background: #fff09a !important;
        }

        #qa-badge-drag-handle {
            cursor: move !important;
        }

        #qa-hotstamp-wrapper {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin-top: 8px !important;
            padding-top: 6px !important;
            border-top: 1px solid rgba(245, 130, 22, 0.45) !important;
            color: #003366 !important;
            font-size: 12px !important;
        }

        #qa-hotstamp-wrapper label {
            color: #003366 !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
        }

        #qa-hotstamp-user {
            min-width: 116px !important;
            max-width: 150px !important;
            height: 24px !important;
            color: #003366 !important;
            background: #ffffff !important;
            border: 1px solid #f58216 !important;
            border-radius: 6px !important;
            font-size: 12px !important;
            font-weight: 700 !important;
        }

        #qa-action-row {
            display: flex !important;
            justify-content: flex-end !important;
            margin-top: 8px !important;
        }
    `;
    document.head.appendChild(style);
}

function clamp(value, min, max) {
    return Math.min(
        Math.max(value, min),
        Math.max(min, max)
    );
}

function normalizeBadgePosition(position, badge) {
    if (!position) return null;

    const rect = badge.getBoundingClientRect();
    const width = rect.width || 280;
    const height = rect.height || 80;

    return {
        left: clamp(
            Number(position.left) || 0,
            8,
            window.innerWidth - width - 8
        ),
        top: clamp(
            Number(position.top) || 0,
            8,
            window.innerHeight - height - 8
        )
    };
}

export function applyBadgePosition(position) {
    const badge =
        document.getElementById('qa-active-badge');

    if (!badge) return;

    const normalized =
        normalizeBadgePosition(position, badge);

    if (!normalized) return;

    Object.assign(badge.style, {
        left: `${normalized.left}px`,
        top: `${normalized.top}px`,
        right: 'auto',
        bottom: 'auto'
    });
}

function isInteractiveElement(element) {
    return Boolean(
        element.closest(
            'button,select,input,textarea,a,option'
        )
    );
}

function enableBadgeDragging(badge) {
    if (badge.dataset.dragEnabled === "true") {
        return;
    }

    badge.addEventListener("pointerdown", event => {
        if (
            event.button !== 0 ||
            isInteractiveElement(event.target)
        ) {
            return;
        }

        const rect = badge.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        badge.setPointerCapture?.(event.pointerId);
        badge.style.cursor = "move";

        const move = moveEvent => {
            const nextPosition =
                normalizeBadgePosition(
                    {
                        left: moveEvent.clientX - offsetX,
                        top: moveEvent.clientY - offsetY
                    },
                    badge
                );

            applyBadgePosition(nextPosition);
        };

        const stop = upEvent => {
            badge.releasePointerCapture?.(upEvent.pointerId);
            badge.style.cursor = "";
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);

            const finalRect = badge.getBoundingClientRect();
            setSharedBadgePosition({
                left: Math.round(finalRect.left),
                top: Math.round(finalRect.top)
            });
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
    });

    badge.dataset.dragEnabled = "true";
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
    currentUserName = "",
    department = "DTF"
) {
    if (!isDtfDepartment(department)) {
        return `
            <div id="qa-rankings">
                <div style="
                    font-size:12px;
                    margin-bottom:4px;
                    color:#eef7ff;
                ">
                    质检排名
                </div>
                <div id="qa-total-ranking">
                    ${renderRankingList(
                        rankings.total,
                        currentUserName
                    )}
                </div>
            </div>
        `;
    }

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

function renderWorkflowSection(
    department,
    switchSummary
) {
    if (!isDtfDepartment(department)) {
        return "";
    }

    return `
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
    `;
}

function renderRankingSection(
    rankings,
    user,
    department
) {
    return `
        <div style="
            margin-bottom:8px;
            padding-top:6px;
            border-top:1px solid rgba(255,255,255,0.35);
        ">
            ${renderRankings(
                rankings,
                user.name,
                department
            )}
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
    return getPageProductionDepartment(user);
}

function renderUserMeta(user = {}) {
    const department = getUserDepartment(user);
    const jobTitle = getUserJobTitle(user);

    return `
        <span style="
            color:#003366;
            font-size:12px;
            font-weight:700;
            margin-left:6px;
            white-space:nowrap;
        ">
            岗位: ${escapeHtml(jobTitle)}
        </span>
        <span style="
            color:#003366;
            font-size:12px;
            font-weight:700;
            margin-left:6px;
            white-space:nowrap;
        ">
            部门: ${escapeHtml(department)}
        </span>
    `;
}

function credentialStatusColor(status) {
    if (!status) return "#eef7ff";
    if (status.status === "active") return "#003366";
    if (status.status === "missing") return "#7a4b00";
    return "#7f1d1d";
}

function renderCredentialStatus(status = {}) {
    if (status.hidden) return "";

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

export function updateCredentialStatus(status = {}) {
    const credentialEl =
        document.getElementById("qa-credential-status");

    if (!credentialEl) return;

    credentialEl.outerHTML =
        renderCredentialStatus(status);
}

export function getBadge() {
    ensureBadgeStyle();

    let badge =
        document.getElementById('qa-active-badge');

    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'qa-active-badge';
        document.body.appendChild(badge);
    }

    Object.assign(badge.style, {
        display: 'block',
        position: 'fixed',
        bottom: '50px',
        right: '50px',
        background: '#46aaaa',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '2px solid #f58216',
        boxShadow: '0 8px 24px rgba(0, 51, 102, 0.24)',
        minWidth: '280px',
        maxWidth: '340px',
        width: 'auto',
        zIndex: '999999'
    });

    enableBadgeDragging(badge);
    applyBadgePosition(getBadgePositionFromPage());

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
    const department = getUserDepartment(user);

    badge.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:6px;
        " id="qa-badge-drag-handle">
            <span>
                质检插件启动中 -
                <span style="color:#003366;">
                    ${escapeHtml(user.name)}
                </span>
                ${renderUserMeta(user)}
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

        ${renderRankingSection(
            rankings,
            user,
            department
        )}

        ${renderWorkflowSection(
            department,
            switchSummary
        )}
    `;
    
    badge
        .querySelector('#qa-minimize-btn')
        .onclick = async () => {
            renderMinimized(badge);
            await setSharedBadgeMinimized(true);
        };

    if (isDtfDepartment(department)) {
        await renderHotstampDropdown(badge);
    }

    badge.insertAdjacentHTML(
        "beforeend",
        `
            <div id="qa-action-row">
                <button id="qa-logout-btn">
                    退出登录
                </button>
            </div>
        `
    );

    badge
        .querySelector('#qa-logout-btn')
        .onclick = async () => {
            await logout();
            await showActiveBadge();
        };
}

export function renderMinimized(badge) {
    Object.assign(badge.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px',
        minWidth: 'auto',
        maxWidth: 'none',
        width: 'auto'
    });

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
            showActiveBadge({ forceExpanded: true });
            await setSharedBadgeMinimized(false);
        };

    badge
        .querySelector('#qa-logout-btn')
        .onclick = async () => {
            await logout();
            await showActiveBadge();
        };
}
