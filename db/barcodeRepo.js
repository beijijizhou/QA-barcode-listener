import { supabase } from './supabase.js';
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
    const user = JSON.parse(
        localStorage.getItem('currentUser')
    ).name;

    const { data, error } = await supabase.rpc(
        'get_today_barcode_count_by_user',
        {
            p_user: user
        }
    );

    if (error) {
        console.error ("failed to fetch today count")
        throw error;}

    return data;
}


export async function getUsersByDepartment(
    department
) {
    const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("department", department)
        .order("name");

    if (error) {
        console.error(error);
        throw error;
    }

    return data;
}