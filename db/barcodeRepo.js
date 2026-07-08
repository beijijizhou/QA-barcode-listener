import { supabase } from './supabase.js';
import { getPlatformFromHostname } from '../core/platform.js';

const usersByDepartmentCache = {};

function getTodayInNewYork() {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/New_York"
        }
    ).format(new Date());
}

function isHalooPlatform(platform) {
    return String(platform || "")
        .trim()
        .toLowerCase() === "haloo";
}

function buildRankings(rows) {
    const totalsByPerson = new Map();

    rows.forEach(row => {
        const person = String(row.person || "")
            .trim();

        if (!person) return;

        const current =
            totalsByPerson.get(person) || {
                name: person,
                haloo: 0,
                other: 0
            };
        const count = Number(row.scan_count) || 0;

        if (isHalooPlatform(row.platform)) {
            current.haloo += count;
        } else {
            current.other += count;
        }

        totalsByPerson.set(person, current);
    });

    function rankByField(field) {
        return [...totalsByPerson.values()]
            .filter(row => row[field] > 0)
            .sort((a, b) => b[field] - a[field])
            .map((row, index) => ({
                rank: index + 1,
                name: row.name,
                count: row[field]
            }));
    }

    return {
        haloo: rankByField("haloo"),
        other: rankByField("other")
    };
}

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
        hotstamp_by: hotstampUser,
        platform: getPlatformFromHostname()
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

export async function getTodayPlatformDashboardByUser() {
    const user = JSON.parse(
        localStorage.getItem('currentUser')
    ).name;
    const { data, error } = await supabase.rpc(
        'get_daily_qa_person_platform_summary',
        {
            target_date: getTodayInNewYork(),
            snapshot_at: null
        }
    );

    if (error) {
        console.error(
            "failed to fetch today platform dashboard"
        );
        throw error;
    }

    const rows = data || [];

    return {
        platformSummary: rows
            .filter(row => row.person === user)
            .map(row => ({
                platform:
                    row.platform || "未标记平台",
                count:
                    Number(row.scan_count) || 0
            }))
            .sort((a, b) => b.count - a.count),
        rankings: buildRankings(rows)
    };
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
