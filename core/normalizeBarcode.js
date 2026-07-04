export function normalizeBarcodeForCurrentSite(code) {
    const normalizedCode = String(code || "").trim();

    if (
        window.location.hostname === "tshirt.riin.com" &&
        normalizedCode.includes(",")
    ) {
        return normalizedCode
            .split(",")[0]
            .trim();
    }

    return normalizedCode;
}
