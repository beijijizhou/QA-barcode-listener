import { requireLogin,logout } from "../auth/login.js";



export function showActiveBadge(count = 0) {
    const user = requireLogin();
    if (!user) return;

    let badge = document.getElementById('qa-active-badge');

    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'qa-active-badge';
        document.body.appendChild(badge);
    }

    badge.innerHTML = `
        <div style="margin-bottom:6px;">
            质检插件启动中 - ${user.name}
        </div>
        <div style="margin-bottom:6px;">
            今日扫描: ${count}
        </div>
        <button id="qa-logout-btn">退出登录</button>
    `;

    Object.assign(badge.style, {
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        background: '#28a745',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        zIndex: '999999'
    });

    const btn = document.getElementById('qa-logout-btn');

    btn.onclick = () => {
        logout();
        badge.remove();
    };
}