const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, "..", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric"
}).formatToParts(new Date());

const month = dateParts.find(part => part.type === "month").value;
const day = dateParts.find(part => part.type === "day").value;
const dateVersionPrefix = `1.${month}.${day}`;
const currentVersion = String(manifest.version || "");
const versionParts = currentVersion.split(".");

if (currentVersion === dateVersionPrefix) {
    manifest.version = `${dateVersionPrefix}.1`;
} else if (currentVersion.startsWith(`${dateVersionPrefix}.`)) {
    const releaseNumber =
        Number.parseInt(versionParts[3], 10) || 0;

    manifest.version =
        `${dateVersionPrefix}.${releaseNumber + 1}`;
} else {
    manifest.version = dateVersionPrefix;
}

fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Updated manifest version to ${manifest.version}`);
