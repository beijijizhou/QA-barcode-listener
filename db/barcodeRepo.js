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

function getNewYorkHourLabel(value) {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: "America/New_York",
            hour: "2-digit",
            hour12: false
        }
    ).format(new Date(value));
}

function getMainWork(row) {
    return Number(row.halooCount) >=
        Number(row.otherCount) ?
        "Haloo" :
        "小平台";
}

function normalizeHourlyRows(rows, user) {
    return (rows || [])
        .filter(row => row.person === user)
        .map(row => ({
            hourStartAt: row.hour_start_at,
            hourLabel:
                `${getNewYorkHourLabel(row.hour_start_at)}:00`,
            halooCount:
                Number(row.haloo_count) || 0,
            otherCount:
                Number(row.other_count) || 0,
            totalCount:
                Number(row.total_count) || 0
        }))
        .filter(row => row.totalCount > 0)
        .sort((a, b) =>
            new Date(a.hourStartAt) -
            new Date(b.hourStartAt)
        );
}

export function buildSwitchSummary(hourlyRows = []) {
    const rows = hourlyRows
        .filter(row => Number(row.totalCount) > 0)
        .sort((a, b) =>
            new Date(a.hourStartAt) -
            new Date(b.hourStartAt)
        );

    if (!rows.length) {
        return {
            switchCount: 0,
            path: "暂无",
            risk: "暂无",
            steps: []
        };
    }

    const steps = [];

    rows.forEach(row => {
        const work = getMainWork(row);
        const count = work === "Haloo" ?
            Number(row.halooCount) || 0 :
            Number(row.otherCount) || 0;
        const lastStep = steps[steps.length - 1];

        if (!lastStep || lastStep.work !== work) {
            steps.push({
                work,
                count,
                startHour: row.hourLabel,
                endHour: row.hourLabel
            });
            return;
        }

        lastStep.count += count;
        lastStep.endHour = row.hourLabel;
    });

    const switchCount = Math.max(
        steps.length - 1,
        0
    );
    const risk = switchCount <= 2 ?
        "正常" :
        switchCount <= 4 ?
            "注意" :
            "频繁切换";

    return {
        switchCount,
        risk,
        path: steps
            .map(step => `${step.work}（${step.count}）`)
            .join(" -> "),
        steps
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
    const targetDate = getTodayInNewYork();
    const [
        platformResult,
        hourlyResult
    ] = await Promise.all([
        supabase.rpc(
            'get_daily_qa_person_platform_summary',
            {
                target_date: targetDate,
                snapshot_at: null
            }
        ),
        supabase.rpc(
            'get_daily_qa_hourly_person_client_summary',
            {
                target_date: targetDate,
                snapshot_at: null
            }
        )
    ]);

    if (platformResult.error) {
        console.error(
            "failed to fetch today platform dashboard"
        );
        throw platformResult.error;
    }

    if (hourlyResult.error) {
        console.error(
            "failed to fetch today switch summary"
        );
        throw hourlyResult.error;
    }

    const rows = platformResult.data || [];
    const hourlyRows =
        normalizeHourlyRows(
            hourlyResult.data,
            user
        );

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
        rankings: buildRankings(rows),
        hourlyRows,
        switchSummary: buildSwitchSummary(
            hourlyRows
        )
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
