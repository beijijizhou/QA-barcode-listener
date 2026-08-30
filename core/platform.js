import { getCurrentProductionDepartment } from "./department.js";

const DTF_PLATFORM_BY_HOST = {
    "longfeng.merchant.hihumbird.com": "隆丰",
    "manage.sdspod.com": "SDS",
    "haloopod.merchant.hihumbird.com": "Haloo",
    "sbkj.merchant.hihumbird.com": "赛博",
    "putiandiy.merchant.hihumbird.com": "莆田",
    "aasy.lewhqh.cn": "中昌",
    "cps.robotees.us": "RBT",
    "www.pixelin.cc": "必印",
    "us.qcpod.19diy.com": "七创",
    "factory.s2bdiy.com": "S2B",
    "aipod.himytool.com": "卖途",
    "example.com": "Example",
    "fangguo.com": "方果",
    "usf.19diy.com": "一朵云",
    "tshirt.riin.com": "汉森",
    "tshirtus.riin.com": "汉森",
    "factory.globalpod.cn": "全球定制",
    "gc.toyitool.com": "托易通",
    "gmanage.sdspod.com": "SDS",
    "www.shineink.cn": "闪印",
    "podvision.himytool.com": "POD Vision Himytool"
};

const UV_PLATFORM_BY_HOST = {
    "overseasfactory.s2bdiy.com": "S2B",
    "factory.s2bdiy.com": "S2B",
    "tshirt.riin.com": "汉森",
    "tshirtus.riin.com": "汉森",
    "usf.19diy.com": "一朵云",
    "example.com": "Example",
    "fangguo.com": "方果",
    "gc.toyitool.com": "托易通",
    "erp.sellersbot.com": "巍盛",
    "manage.sdspod.com": "SDS",
    "gmanage.sdspod.com": "SDS",
    "factory.sdsdiy.com": "SDS",
    "www.shineink.cn": "闪印"
};

const UV_SDS_PLATFORM_BY_ORDER_PREFIX = {
    "2006": "SDS1",
    "2008": "SDS2",
    "2010": "忆点万象"
};

const UV_SDS_PLATFORM_BY_PAGE_TEXT = [
    {
        pattern: "纽约8号仓",
        platform: "忆点万象"
    },
    {
        pattern: "HPK001",
        platform: "SDS1"
    },
    {
        pattern: "HPK002",
        platform: "SDS2"
    }
];

export const PLATFORMS_BY_DEPARTMENT = {
    DTF: [
        "Haloo",
        "隆丰",
        "莆田",
        "赛博",
        "S2B",
        "汉森",
        "七创",
        "一朵云",
        "方果",
        "SDS1",
        "SDS2"
    ],
    UV: [
        "S2B",
        "汉森",
        "一朵云",
        "方果",
        "SDS1",
        "SDS2",
        "忆点万象",
        "托易通",
        "巍盛",
        "闪印",
        "Example"
    ]
};

const SUFFIX_PLATFORM_BY_HOST = [
    {
        suffix: ".hihumbird.com",
        platform: "Humbird"
    },
    {
        suffix: ".19diy.com",
        platform: "19DIY"
    },
    {
        suffix: ".s2bdiy.com",
        platform: "S2B DIY"
    }
];

function normalizeHost(hostname) {
    return String(hostname || "")
        .trim()
        .toLowerCase();
}

function isUvDepartment(department) {
    return String(department || "")
        .trim()
        .toUpperCase() === "UV";
}

function getOrderPrefix(value) {
    const match = String(value || "")
        .trim()
        .match(/\d+/);

    return match ? match[0].slice(0, 4) : "";
}

function isSdsHost(host) {
    return host === "manage.sdspod.com" ||
        host === "gmanage.sdspod.com" ||
        host === "factory.sdsdiy.com";
}

function getUvSdsPlatformFromBarcode(code) {
    return UV_SDS_PLATFORM_BY_ORDER_PREFIX[
        getOrderPrefix(code)
    ];
}

function getPageText() {
    if (typeof document === "undefined") {
        return "";
    }

    return document.body?.innerText || "";
}

function getUvSdsPlatformFromPage() {
    const pageText = getPageText();

    if (!pageText) return "";

    const match = UV_SDS_PLATFORM_BY_PAGE_TEXT.find(
        ({ pattern }) => pageText.includes(pattern)
    );

    return match?.platform || "";
}

export function getPlatformFromHostname(
    hostname = window.location.hostname,
    department = getCurrentProductionDepartment(),
    code = ""
) {
    const host = normalizeHost(hostname);
    const departmentPlatforms =
        isUvDepartment(department) ?
            UV_PLATFORM_BY_HOST :
            DTF_PLATFORM_BY_HOST;

    if (isUvDepartment(department) && isSdsHost(host)) {
        return getUvSdsPlatformFromPage() ||
            getUvSdsPlatformFromBarcode(code) ||
            departmentPlatforms[host];
    }

    if (departmentPlatforms[host]) {
        return departmentPlatforms[host];
    }

    const suffixMatch =
        SUFFIX_PLATFORM_BY_HOST.find(({ suffix }) =>
            host.endsWith(suffix)
        );

    return suffixMatch ?
        suffixMatch.platform :
        host || "Unknown";
}
