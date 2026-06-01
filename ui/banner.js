export function showBanner(code) {

    const banner =
        document.createElement('div');

    banner.innerText =
        `📦 Intercepted Barcode: ${code}`;

    Object.assign(banner.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#007BFF',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        zIndex: '10000'
    });

    document.body.appendChild(banner);

    setTimeout(() => banner.remove(), 3000);
}