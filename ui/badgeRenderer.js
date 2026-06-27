import { requireLogin,logout } from "../auth/login";
import { showActiveBadge } from "./badge";
import { renderHotstampDropdown } from "./hotstampDropdown";
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
                showActiveBadge();
            }
        };
}

export async function renderLoggedIn(
    badge,
    user,
    count,
) {
    badge.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:6px;
        ">
            <span>
                质检插件启动中 - ${user.name}
            </span>

            <button id="qa-minimize-btn">
                缩小
            </button>
        </div>

        <div style="margin-bottom:6px;">
            今日扫描: ${count}
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
        .onclick = () => {
            logout();
            showActiveBadge();
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
        .onclick = () =>
            showActiveBadge();

    badge
        .querySelector('#qa-logout-btn')
        .onclick = () => {
            logout();
            showActiveBadge();
        };
}