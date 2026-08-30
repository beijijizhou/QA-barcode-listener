
import { findUser } from "../db/userRepo.js";
import {
    getCurrentUserFromPage,
    getSharedCurrentUser,
    setSharedCurrentUser
} from "../storage/sharedState.js";

const LOGIN_GUARD_KEY = "qa_login_guard";
const WARNING_THRESHOLD = 2;

function getStorage() {
    return globalThis.chrome?.storage?.local;
}

function readGuardFromPage() {
    try {
        return JSON.parse(
            localStorage.getItem(LOGIN_GUARD_KEY) ||
            "null"
        ) || {};
    } catch (_error) {
        return {};
    }
}

function writeGuardToPage(guard) {
    localStorage.setItem(
        LOGIN_GUARD_KEY,
        JSON.stringify(guard || {})
    );
}

async function readLoginGuard() {
    const storage = getStorage();

    if (!storage) return readGuardFromPage();

    return await new Promise(resolve => {
        storage.get(LOGIN_GUARD_KEY, result => {
            const guard =
                result[LOGIN_GUARD_KEY] ||
                readGuardFromPage();
            writeGuardToPage(guard);
            resolve(guard || {});
        });
    });
}

async function writeLoginGuard(guard) {
    writeGuardToPage(guard);

    const storage = getStorage();
    if (!storage) return;

    await new Promise(resolve => {
        storage.set(
            {
                [LOGIN_GUARD_KEY]: guard
            },
            resolve
        );
    });
}

async function clearLoginGuard() {
    localStorage.removeItem(LOGIN_GUARD_KEY);

    const storage = getStorage();
    if (!storage) return;

    await new Promise(resolve => {
        storage.remove(LOGIN_GUARD_KEY, resolve);
    });
}

async function recordLoginFailure(login = "") {
    const guard = await readLoginGuard();
    const targetLogin =
        String(login || guard.lastLogin || "").trim();
    const failures = Number(guard.failures) + 1 || 1;

    const nextGuard = {
        failures,
        lastLogin: targetLogin,
        lastFailureAt: Date.now()
    };

    await writeLoginGuard(nextGuard);

    if (failures >= WARNING_THRESHOLD) {
        alert(
            `已连续 ${failures} 次未完成质检登录。请先登录质检插件，否则这次不会记录到质检数据。`
        );
    }
}

export async function requireLogin() {
    let user = await getSharedCurrentUser();
    
    if (user) {
        return user;
    }

    if (!user) {
        const name = prompt('请输入用户名');
        if (!name) {
            alert('请先登录后再质检');
            await recordLoginFailure();
            await setSharedCurrentUser(null);
            return null;
        }

        const password = prompt('请输入密码');
        if (!password) {
            alert('请先登录后再质检');
            await recordLoginFailure(name);
            await setSharedCurrentUser(null);
            return null;
        }

        user = { name, password };
    }

    const found = await findUser(user.name, user.password);
    if (!found) {
        alert('登录失败，请重试');
        await recordLoginFailure(user.name);
        await setSharedCurrentUser(null);
        return null;
    }

    await clearLoginGuard();
    await setSharedCurrentUser(found);
    return found;
}

export function getCurrentUser() {
    return getCurrentUserFromPage();
}
export async function logout() {
    await setSharedCurrentUser(null);
}
