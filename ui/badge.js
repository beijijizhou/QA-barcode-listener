export function showActiveBadge() {

    const badge =
        document.createElement('div');

    badge.textContent = 'QA EXT ACTIVE 2';

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

    document.body.appendChild(badge);
}