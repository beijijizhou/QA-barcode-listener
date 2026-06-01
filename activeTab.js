export function showActiveBadge() {

    const badge =
        document.createElement('div');

    badge.textContent =
        'QA EXT ACTIVE 1';

    Object.assign(
        badge.style,
        {
            position:'fixed',
            bottom:'12px',
            right:'12px',
            background:'#28a745',
            color:'white',
            padding:'8px 12px',
            borderRadius:'8px',
            zIndex:'999999',
            fontSize:'12px'
        }
    );

    document.body.appendChild(
        badge
    );
    
}