const CURRENT_USER_KEY = "qa_current_user";
const HOTSTAMP_USER_KEY = "qa_hotstamp_user";
const TODAY_COUNT_PREFIX = "qa_today_scan_count";

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
    const user =
        await readSharedValue(CURRENT_USER_KEY);

    if (user) {
        setCurrentUserOnPage(user);
        return user;
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

export function getTodayCountKey(user) {
    return [
        TODAY_COUNT_PREFIX,
        user.name,
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "America/New_York"
            }
        ).format(new Date())
    ].join(":");
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
