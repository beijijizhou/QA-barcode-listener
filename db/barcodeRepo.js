import { supabase }
from './supabase.js';

export async function saveBarcode(code, user) {

    const { error } =
        await supabase
            .from('barcode_scans')
            .insert([
                {
                    barcode: code,
                    scanned_by: user
                }
            ]);
    console.log(`Saved barcode: ${code} by user: ${user}`);
    if (error) throw error;
}