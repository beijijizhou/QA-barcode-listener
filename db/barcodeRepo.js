import { supabase } from './supabase.js';
import { getPlatformFromHostname } from '../core/platform.js';
import {
    getPageProductionDepartment,
    isDtfDepartment
} from '../core/department.js';

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

function parseCurrentUser() {
    return JSON.parse(
        localStorage.getItem('currentUser') || "null"
    ) || {};
}

function normalizeProductionDepartment(value) {
    return String(value || "DTF")
        .trim()
        .toUpperCase();
}

function isRowForDepartment(row, department) {
    if (!Object.prototype.hasOwnProperty.call(
        row,
        "production_department"
    )) {
        return true;
    }

    return normalizeProductionDepartment(
        row.production_department
    ) === normalizeProductionDepartment(department);
}

function buildRankings(rows, department = "DTF") {
    const totalsByPerson = new Map();

    rows.forEach(row => {
        const person = String(row.person || "")
            .trim();

        if (!person) return;

        const current =
            totalsByPerson.get(person) || {
                name: person,
                total: 0,
                haloo: 0,
                other: 0
            };
        const count = Number(row.scan_count) || 0;

        current.total += count;

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
        total: rankByField("total"),
        haloo: rankByField("haloo"),
        other: rankByField("other"),
        department
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
    const currentUser = parseCurrentUser();
    const user = currentUser.name;
    const department =
        getPageProductionDepartment(currentUser);
    const hotstampUser = isDtfDepartment(department) ?
        localStorage.getItem("qa_hotstamp_user") :
        null;

    const scanPayload = {
        barcode: code,
        scanned_by: user,
        scanned_at: now,
        hotstamp_by: hotstampUser,
        platform: getPlatformFromHostname(
            undefined,
            department,
            code
        ),
        production_department: department
    };

    const { error } = await supabase
        .from('barcode_scans')
        .upsert(
            scanPayload,
            {
                onConflict:
                    'barcode,production_department'
            }
        );

    if (error) throw error;
}


export async function getTodayBarcodeCountByUser() {
    const currentUser = parseCurrentUser();
    const user = currentUser.name;
    const department =
        getPageProductionDepartment(currentUser);

    const { data, error } = await supabase.rpc(
        'get_today_barcode_count_by_user',
        {
            p_user: user,
            p_department: department
        }
    );

    if (error) {
        console.error ("failed to fetch today count")
        throw error;}

    return data;
}

export async function getTodayPlatformDashboardByUser() {
    const currentUser = parseCurrentUser();
    const user = currentUser.name;
    const department =
        getPageProductionDepartment(currentUser);
    const targetDate = getTodayInNewYork();
    const [
        platformResult,
        hourlyResult
    ] = await Promise.all([
        supabase.rpc(
            'get_daily_qa_person_platform_summary',
            {
                target_date: targetDate,
                snapshot_at: null,
                p_department: department
            }
        ),
        supabase.rpc(
            'get_daily_qa_hourly_person_client_summary',
            {
                target_date: targetDate,
                snapshot_at: null,
                p_department: department
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

    const rows = (platformResult.data || [])
        .filter(row =>
            isRowForDepartment(row, department)
        );
    const hourlyRows =
        isDtfDepartment(department) ?
            normalizeHourlyRows(
                (hourlyResult.data || []).filter(row =>
                    isRowForDepartment(row, department)
                ),
                user
            ) :
            [];

    return {
        department,
        platformSummary: rows
            .filter(row => row.person === user)
            .map(row => ({
                platform:
                    row.platform || "未标记平台",
                count:
                    Number(row.scan_count) || 0
            }))
            .sort((a, b) => b.count - a.count),
        rankings: buildRankings(rows, department),
        hourlyRows,
        switchSummary: isDtfDepartment(department) ?
            buildSwitchSummary(hourlyRows) :
            {
                switchCount: 0,
                path: "UV 不区分 Haloo / 小平台",
                risk: "不适用",
                steps: []
            }
    };
}

export async function getCurrentPlatformCredentialStatus() {
    const department =
        getPageProductionDepartment(parseCurrentUser());
    const platform = getPlatformFromHostname(
        undefined,
        department
    );
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
    const department =
        getPageProductionDepartment(parseCurrentUser());
    const platform = getPlatformFromHostname(
        undefined,
        department
    );
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


export async function getUsersByProductionDepartment(
    department,
    options = {}
) {
    const productionDepartment = String(
        department || "DTF"
    ).trim().toUpperCase();
    const cacheKey = `production:${productionDepartment}`;

    if (
        !options.forceRefresh &&
        usersByDepartmentCache[cacheKey]?.length
    ) {
        return usersByDepartmentCache[cacheKey];
    }

    const { data, error } = await supabase.rpc(
        "get_users_by_production_department",
        { p_department: productionDepartment }
    );

    if (error) {
        console.error(error);
        throw error;
    }
    if (data?.length) {
        usersByDepartmentCache[cacheKey] = data;
    } else {
        delete usersByDepartmentCache[cacheKey];
    }

    return data || [];
}
