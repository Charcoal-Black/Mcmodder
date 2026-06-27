const fs = require("fs");
const { spawnSync } = require("child_process");

const version = process.env.VERSION;
const isNewVersion = process.env.IS_NEW_VERSION;
const tagName = process.env.TAG_NAME;

let notes = "";
if (isNewVersion === "true" && fs.existsSync("CHANGELOG.md")) {
  const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
  const escapedVersion = version.replace(/\./g, "\\.");
  const regex = new RegExp("##\\s*\\[" + escapedVersion + "\\][^\\n]*([\\s\\S]*?)(?=\\n##\\s*\\[|$)");
  const match = changelog.match(regex);
  if (match && match[1]) {
    notes = match[1].trim();
  }
}

const args = ["release", "create", tagName, "dist/mcmodder.user.js", "--title", "v" + version, "--notes", notes];
const result = spawnSync("gh", args, { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status || 1);
}
