import { requireLogin } from "../auth/login";
import { getTodayBarcodeCountByUser } from "../db/barcodeRepo";
import { showActiveBadge } from "../ui/badge";

export async function initBadge() {

    const count =
        await getTodayBarcodeCountByUser();
    console.log('Today barcode count:', count);
    showActiveBadge(count);
}