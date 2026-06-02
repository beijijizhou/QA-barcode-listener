import { supabase }
from './supabase.js';
export async function saveBarcode(code, user) {

    const now = new Date().toLocaleString();

    const { error } = await supabase
        .from('barcode_scans')
        .upsert(
            {
                barcode: code,
                scanned_by: user,
                scanned_at: now
            },
            {
                onConflict: 'barcode'
            }
        );

    if (error) throw error;
}