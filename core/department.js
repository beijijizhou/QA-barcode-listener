const DEFAULT_DEPARTMENT = "DTF";
const KNOWN_DEPARTMENTS = new Set([
    "DTF",
    "UV",
    "3D"
]);

const UV_HOSTS = new Set([
    "factory.s2bdiy.com",
    "factory.sdsdiy.com",
    "overseasfactory.s2bdiy.com",
    "erp.sellersbot.com",
    "gc.toyitool.com",
    "www.shineink.cn"
]);

const DTF_HOSTS = new Set([
    "longfeng.merchant.hihumbird.com",
    "haloopod.merchant.hihumbird.com",
    "sbkj.merchant.hihumbird.com",
    "putiandiy.merchant.hihumbird.com",
    "aasy.lewhqh.cn",
    "cps.robotees.us",
    "www.pixelin.cc",
    "us.qcpod.19diy.com",
    "aipod.himytool.com",
    "podvision.himytool.com"
]);

function normalizeDepartment(value) {
    const department = String(value || "")
        .trim()
        .toUpperCase();

    return KNOWN_DEPARTMENTS.has(department) ?
        department :
        "";
}

function normalizeDepartmentList(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (!value) {
        return [];
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.startsWith("[")) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ?
                    parsed :
                    [trimmed];
            } catch (_error) {
                return [trimmed];
            }
        }

        return trimmed
            .split(/[,\s/]+/)
            .filter(Boolean);
    }

    return [value];
}

export function getUserProductionDepartment(user = {}) {
    const departments = [
        ...normalizeDepartmentList(user.departments),
        user.production_department,
        user.department_code,
        user.department
    ];

    const normalized = departments
        .map(normalizeDepartment)
        .find(Boolean);

    return normalized || DEFAULT_DEPARTMENT;
}

export function getUserProductionDepartments(user = {}) {
    const departments = [
        ...normalizeDepartmentList(user.departments),
        user.production_department,
        user.department_code,
        user.department
    ];

    return [...new Set(
        departments
            .map(normalizeDepartment)
            .filter(Boolean)
    )];
}

function currentHost() {
    return String(
        globalThis.location?.hostname ||
        globalThis.window?.location?.hostname ||
        ""
    ).trim().toLowerCase();
}

export function getPageProductionDepartment(user = {}) {
    const departments = getUserProductionDepartments(user);
    const host = currentHost();

    if (
        departments.includes("UV") &&
        UV_HOSTS.has(host)
    ) {
        return "UV";
    }

    if (
        departments.includes("DTF") &&
        DTF_HOSTS.has(host)
    ) {
        return "DTF";
    }

    return departments[0] || DEFAULT_DEPARTMENT;
}

export function getUserJobTitle(user = {}) {
    const jobTitle = String(
        user.job_title ||
        user.jobTitle ||
        ""
    ).trim();

    if (jobTitle) return jobTitle;

    const legacyDepartment = String(
        user.department || ""
    ).trim();

    return normalizeDepartment(legacyDepartment) ?
        "员工" :
        legacyDepartment || "员工";
}

export function getCurrentProductionDepartment() {
    try {
        const user = JSON.parse(
            localStorage.getItem("currentUser") ||
            "null"
        );

        return getPageProductionDepartment(user || {});
    } catch (_error) {
        return DEFAULT_DEPARTMENT;
    }
}

export function isDtfDepartment(department) {
    return getUserProductionDepartment({
        departments: [department]
    }) === "DTF";
}
