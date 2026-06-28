import { supabase } from './supabase.js';

const usersByDepartmentCache = {};

export async function saveBarcode(code) {
  
    const now = new Date().toISOString();
    const user = JSON.parse(localStorage.getItem('currentUser')).name;
    const hotstampUser = localStorage.getItem(
        "qa_hotstamp_user"
    );

    const scanPayload = {
        barcode: code,
        scanned_by: user,
        scanned_at: now,
        hotstamp_by: hotstampUser
    };

    const { error } = await supabase
        .from('barcode_scans')
        .upsert(
            scanPayload,
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
    if (usersByDepartmentCache[department]) {
        return usersByDepartmentCache[department];
    }

    const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("department", department)
        .order("name");

    if (error) {
        console.error(error);
        throw error;
    }

    usersByDepartmentCache[department] = data;
    return data;
}
