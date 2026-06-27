
import { getTodayBarcodeCountByUser,getUsersByDepartment } from '../db/barcodeRepo.js';
import { renderLoggedIn, getBadge, renderLoggedOut } from './badgeRenderer.js';

export async function showActiveBadge() {
    const badge = getBadge();

    const user = JSON.parse(
        localStorage.getItem('currentUser')
    );

    if (!user) {
        await renderLoggedOut(badge);
        return;
    }

    const count =
        await getTodayBarcodeCountByUser();
    
    
    renderLoggedIn(
        badge,
        user,
        count,
        
    );
   
}

