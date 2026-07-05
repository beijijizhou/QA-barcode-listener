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

manifest.version = `1.${month}.${day}`;

fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Updated manifest version to ${manifest.version}`);
