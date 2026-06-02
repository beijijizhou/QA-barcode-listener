import { requireLogin } from "../auth/login.js";


export function showActiveBadge() {
    const user = requireLogin();
    if (!user) return; // should not happen, but just in case
    let badge = document.getElementById('qa-active-badge');

    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'qa-active-badge';
        document.body.appendChild(badge);
    }

    badge.textContent = `质检插件启动中 - ${user.name}`;

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
}