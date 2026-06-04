import {requireLogin, logout} from '../auth/login.js';
import { getTodayBarcodeCountByUser } from '../db/barcodeRepo.js';
export async function showActiveBadge() {
    const user = JSON.parse(
        localStorage.getItem('currentUser')
    );

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

    if (!user) {
        badge.innerHTML = `
            <div style="margin-bottom:6px;"> 质检插件启动中 - 未登录</div>
            <button id="qa-login-btn">
                登录
            </button>
        `;

        badge
            .querySelector('#qa-login-btn')
            .onclick = () => {
                const user =
                    requireLogin();

                if (user) {
                    showActiveBadge();
                }
            };

        return;
    }

    const count =
        await getTodayBarcodeCountByUser();
    console.log('Today\'s barcode count for user', user.name, ':', count);
    badge.innerHTML = `
        <div style="margin-bottom:6px;">
            质检插件启动中 - ${user.name}
        </div>
        <div style="margin-bottom:6px;">
            今日扫描: ${count}
        </div>
        <button id="qa-logout-btn">
            退出登录
        </button>
    `;

    badge
        .querySelector('#qa-logout-btn')
        .onclick = () => {
            logout();
            showActiveBadge();
        };
}