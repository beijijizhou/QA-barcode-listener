const EXACT_PLATFORM_BY_HOST = {
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
    "aipod.himytool.com": "AI POD Himytool",
    "example.com": "Example",
    "fangguo.com": "方果",
    "usf.19diy.com": "一朵云",
    "tshirt.riin.com": "汉森",
    "factory.globalpod.cn": "GlobalPOD Factory",
    "gc.toyitool.com": "Toyitool GC",
    "gmanage.sdspod.com": "SDS POD Global",
    "www.shineink.cn": "闪印",
    "podvision.himytool.com": "POD Vision Himytool"
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

export function getPlatformFromHostname(
    hostname = window.location.hostname
) {
    const host = normalizeHost(hostname);

    if (EXACT_PLATFORM_BY_HOST[host]) {
        return EXACT_PLATFORM_BY_HOST[host];
    }

    const suffixMatch =
        SUFFIX_PLATFORM_BY_HOST.find(({ suffix }) =>
            host.endsWith(suffix)
        );

    return suffixMatch ?
        suffixMatch.platform :
        host || "Unknown";
}
