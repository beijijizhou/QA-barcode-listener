import { getCurrentUser } from '../db/currentUser.js';

export function showActiveBadge() {

    const user =
        getCurrentUser();

    const badge =
        document.createElement('div');

    badge.id =
        'qa-active-badge';
    console.log("123", user)
    badge.textContent =
        `质检插件启动中 - ${user.name}`;

    Object.assign(
        badge.style,
        {
            position: 'fixed',
            bottom: '12px',
            right: '12px',
            background: '#28a745',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            zIndex: '999999'
        }
    );

    document.body.appendChild(
        badge
    );
}