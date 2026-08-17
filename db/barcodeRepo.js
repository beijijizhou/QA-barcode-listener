import { supabase } from './supabase.js';
import { getPlatformFromHostname } from '../core/platform.js';

const usersByDepartmentCache = {};

function readableError(error) {
    if (error instanceof Error) {
        return error.message;
    }

    try {
        return JSON.stringify(error);
    } catch (_jsonError) {
        return String(error);
    }
}

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
            "failed to fetch today platform dashboard",
            readableError(platformResult.error)
        );
        throw platformResult.error;
    }

    if (hourlyResult.error) {
        console.error(
            "failed to fetch today switch summary",
            readableError(hourlyResult.error)
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

export async function getCurrentPlatformCredentialStatus() {
    const platform = getPlatformFromHostname();
    const { data, error } = await supabase.rpc(
        'get_erp_api_credential_status',
        {
            p_platform: platform
        }
    );

    if (error) {
        console.error(
            "failed to fetch platform credential status",
            readableError(error)
        );

        return {
            platform,
            status: "unavailable",
            message: "需要运行授权状态 SQL"
        };
    }

    const row = Array.isArray(data) ?
        data[0] :
        data;

    if (!row) {
        return {
            platform,
            status: "missing",
            message: "未保存 token"
        };
    }

    return {
        platform: row.platform || platform,
        status: row.status || "unknown",
        tokenFingerprint:
            row.token_fingerprint || "",
        lastRefreshedAt:
            row.last_refreshed_at || "",
        lastUsedAt:
            row.last_used_at || "",
        updatedAt:
            row.updated_at || "",
        message:
            row.status === "active" ?
                "token 已保存" :
                "token 需要检查"
    };
}

function getCurrentHumbirdToken() {
    return String(
        localStorage.getItem("factory_token_") || ""
    ).trim();
}

async function tokenFingerprint(token) {
    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(token)
        );

    return [...new Uint8Array(digest)]
        .map(byte =>
            byte.toString(16).padStart(2, "0")
        )
        .join("")
        .slice(0, 12);
}

function shouldSyncToken(status, fingerprint) {
    if (!fingerprint) return false;
    if (!status) return true;

    return status.status !== "active" ||
        status.tokenFingerprint !== fingerprint;
}

export async function syncCurrentHumbirdToken(
    updatedBy
) {
    const platform = getPlatformFromHostname();
    const token = getCurrentHumbirdToken();

    if (!token) {
        return {
            platform,
            synced: false,
            reason: "no_page_token"
        };
    }

    const fingerprint =
        await tokenFingerprint(token);
    const currentStatus =
        await getCurrentPlatformCredentialStatus();

    if (!shouldSyncToken(
        currentStatus,
        fingerprint
    )) {
        return {
            platform,
            synced: false,
            reason: "already_current",
            status: currentStatus
        };
    }

    const { data, error } =
        await supabase.functions.invoke(
            "save-humbird-token",
            {
                body: {
                    platform,
                    token,
                    updated_by:
                        updatedBy || "qa-extension"
                }
            }
        );

    if (error) {
        console.error(
            "failed to sync humbird token",
            readableError(error)
        );

        return {
            platform,
            synced: false,
            reason: "save_failed",
            status: {
                platform,
                status: "unavailable",
                message: "保存入口未部署"
            }
        };
    }

    return {
        platform,
        synced: true,
        result: data,
        status:
            await getCurrentPlatformCredentialStatus()
    };
}


export async function getUsersByDepartment(
    department
) {
    if (usersByDepartmentCache[department]) {
        return usersByDepartmentCache[department];
    }

    const jobTitle = String(department || "").trim();
    let query = supabase
        .from("users")
        .select("name")
        .eq("job_title", jobTitle)
        .order("name");
    let { data, error } = await query;
    if (error && String(error.message || "").includes("job_title")) {
        const legacy = await supabase
            .from("users")
            .select("name")
            .eq("department", jobTitle)
            .order("name");
        data = legacy.data;
        error = legacy.error;
    }
    if (error) {
        console.error(error);
        throw error;
    }
    usersByDepartmentCache[department] = data || [];
    return data || [];
}

export async function getUsersByProductionDepartment(
    department
) {
    const productionDepartment = String(
        department || "DTF"
    ).trim().toUpperCase();
    const cacheKey = `production:${productionDepartment}`;
    if (usersByDepartmentCache[cacheKey]) {
        return usersByDepartmentCache[cacheKey];
    }
    const { data, error } = await supabase.rpc(
        "get_users_by_production_department",
        { p_department: productionDepartment }
    );

    if (!error) {
        usersByDepartmentCache[cacheKey] = data || [];
        return data || [];
    }

    const missingRpc =
        error.code === "PGRST202" ||
        String(error.message || "").includes(
            "get_users_by_production_department"
        );
    if (!missingRpc) {
        console.error(error);
        throw error;
    }

    // Compatibility before the employee-department migration is deployed.
    // The legacy column stores the job title, so QA personnel were selected
    // with department='质检' and implicitly belonged to DTF.
    if (productionDepartment !== "DTF") {
        usersByDepartmentCache[cacheKey] = [];
        return [];
    }
    const legacy = await supabase
        .from("users")
        .select("name")
        .eq("department", "质检")
        .order("name");
    if (legacy.error) {
        console.error(legacy.error);
        throw legacy.error;
    }
    usersByDepartmentCache[cacheKey] = legacy.data || [];
    return legacy.data || [];
}
