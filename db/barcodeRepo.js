import { supabase }
from './supabase.js';
export async function saveBarcode(code) {

    const now = new Date().toISOString();
    const user = JSON.parse(localStorage.getItem('currentUser')).name;
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


export async function getTodayBarcodeCountByUser() {

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const name = JSON.parse(localStorage.getItem('currentUser')).name;
    console.log(name)
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { count, error } = await supabase
        .from('barcode_scans')
        .select('id', { count: 'exact', head: true })
        .eq('scanned_by', name)
        .gte('scanned_at', start.toISOString())
        .lte('scanned_at', end.toISOString());
    console.log('Count result:', { count, error });
    if (error) throw error;
    

    return count;
}