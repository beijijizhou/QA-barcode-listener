import { getPageProductionDepartment }
from "../core/department.js";

const CURRENT_USER_KEY = "qa_current_user";
const HOTSTAMP_USER_KEY = "qa_hotstamp_user";
const BADGE_MINIMIZED_KEY = "qa_badge_minimized";
const BADGE_POSITION_KEY = "qa_badge_position";
const TODAY_COUNT_PREFIX = "qa_today_scan_count";
const TODAY_PLATFORM_SUMMARY_PREFIX = "qa_today_platform_summary";
const TODAY_RANKINGS_PREFIX = "qa_today_rankings";
const TODAY_SWITCH_SUMMARY_PREFIX = "qa_today_switch_summary";

function getTodayKeyParts(prefix, user) {
    return [
        prefix,
        getPageProductionDepartment(user),
        user.name,
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "America/New_York"
            }
        ).format(new Date())
    ];
}

function getStorage() {
    return globalThis.chrome?.storage?.local;
}

function readSharedValue(key) {
    const storage = getStorage();

    if (!storage) {
        return Promise.resolve(undefined);
    }

    return new Promise(resolve => {
        storage.get(
            key,
            result => resolve(result[key])
        );
    });
}

function readSharedEntry(key) {
    const storage = getStorage();

    if (!storage) {
        return Promise.resolve({
            hasValue: false,
            value: undefined
        });
    }

    return new Promise(resolve => {
        storage.get(
            key,
            result => resolve({
                hasValue:
                    Object.prototype.hasOwnProperty
                        .call(result, key),
                value: result[key]
            })
        );
    });
}

function writeSharedValue(key, value) {
    const storage = getStorage();

    if (!storage) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        storage.set(
            {
                [key]: value
            },
            resolve
        );
    });
}

export function onSharedStateChange(callback) {
    globalThis.chrome?.storage?.onChanged?.addListener(
        (changes, areaName) => {
            if (areaName !== "local") return;

            Object.entries(changes).forEach(
                ([key, change]) =>
                    callback(key, change.newValue)
            );
        }
    );
}

export function getCurrentUserFromPage() {
    const userStr =
        localStorage.getItem("currentUser");

    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error(
            "Failed to parse user from localStorage",
            e
        );
        return null;
    }
}

export function setCurrentUserOnPage(user) {
    if (user) {
        localStorage.setItem(
            "currentUser",
            JSON.stringify(user)
        );
        return;
    }

    localStorage.removeItem("currentUser");
}

export async function setSharedCurrentUser(user) {
    setCurrentUserOnPage(user);
    await writeSharedValue(
        CURRENT_USER_KEY,
        user
    );
}

export async function getSharedCurrentUser() {
    const { hasValue, value } =
        await readSharedEntry(CURRENT_USER_KEY);

    if (hasValue) {
        setCurrentUserOnPage(value);
        return value;
    }

    return getCurrentUserFromPage();
}

export function isCurrentUserKey(key) {
    return key === CURRENT_USER_KEY;
}

export async function setSharedHotstampUser(name) {
    const value = name || "";

    localStorage.setItem(
        HOTSTAMP_USER_KEY,
        value
    );

    await writeSharedValue(
        HOTSTAMP_USER_KEY,
        value
    );
}

export async function getSharedHotstampUser() {
    const value =
        await readSharedValue(HOTSTAMP_USER_KEY);

    return value ||
        localStorage.getItem(HOTSTAMP_USER_KEY) ||
        "";
}

export function isHotstampUserKey(key) {
    return key === HOTSTAMP_USER_KEY;
}

export async function setSharedBadgeMinimized(
    isMinimized
) {
    await writeSharedValue(
        BADGE_MINIMIZED_KEY,
        Boolean(isMinimized)
    );
}

export async function getSharedBadgeMinimized() {
    return Boolean(
        await readSharedValue(BADGE_MINIMIZED_KEY)
    );
}

export function isBadgeMinimizedKey(key) {
    return key === BADGE_MINIMIZED_KEY;
}

export async function setSharedBadgePosition(position) {
    const value = position || null;

    if (value) {
        localStorage.setItem(
            BADGE_POSITION_KEY,
            JSON.stringify(value)
        );
    } else {
        localStorage.removeItem(BADGE_POSITION_KEY);
    }

    await writeSharedValue(
        BADGE_POSITION_KEY,
        value
    );
}

export function getBadgePositionFromPage() {
    const value =
        localStorage.getItem(BADGE_POSITION_KEY);

    if (!value) return null;

    try {
        return JSON.parse(value);
    } catch (_error) {
        return null;
    }
}

export async function getSharedBadgePosition() {
    return await readSharedValue(BADGE_POSITION_KEY) ||
        getBadgePositionFromPage();
}

export function isBadgePositionKey(key) {
    return key === BADGE_POSITION_KEY;
}

export function getTodayCountKey(user) {
    return getTodayKeyParts(
        TODAY_COUNT_PREFIX,
        user
    ).join(":");
}

export function getTodayPlatformSummaryKey(user) {
    return getTodayKeyParts(
        TODAY_PLATFORM_SUMMARY_PREFIX,
        user
    ).join(":");
}

export function getTodayRankingsKey(user) {
    return getTodayKeyParts(
        TODAY_RANKINGS_PREFIX,
        user
    ).join(":");
}

export function getTodaySwitchSummaryKey(user) {
    return getTodayKeyParts(
        TODAY_SWITCH_SUMMARY_PREFIX,
        user
    ).join(":");
}

export async function setSharedTodayCount(
    user,
    count
) {
    await writeSharedValue(
        getTodayCountKey(user),
        count
    );
}

export function isTodayCountKey(key) {
    return key.startsWith(
        `${TODAY_COUNT_PREFIX}:`
    );
}

export async function setSharedTodayPlatformSummary(
    user,
    summary
) {
    await writeSharedValue(
        getTodayPlatformSummaryKey(user),
        summary
    );
}

export function isTodayPlatformSummaryKey(key) {
    return key.startsWith(
        `${TODAY_PLATFORM_SUMMARY_PREFIX}:`
    );
}

export async function setSharedTodayRankings(
    user,
    rankings
) {
    await writeSharedValue(
        getTodayRankingsKey(user),
        rankings
    );
}

export function isTodayRankingsKey(key) {
    return key.startsWith(
        `${TODAY_RANKINGS_PREFIX}:`
    );
}

export async function setSharedTodaySwitchSummary(
    user,
    summary
) {
    await writeSharedValue(
        getTodaySwitchSummaryKey(user),
        summary
    );
}

export function isTodaySwitchSummaryKey(key) {
    return key.startsWith(
        `${TODAY_SWITCH_SUMMARY_PREFIX}:`
    );
}
