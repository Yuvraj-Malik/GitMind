// Runs every *.test.js under bugs/ and exits non-zero if any fails.
// Output includes stack traces, which Git-Mind uses to locate the broken file.
const { readdirSync } = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

const dir = path.join(__dirname, "bugs");
let failed = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".test.js")).sort()) {
  const r = spawnSync(process.execPath, [path.join("bugs", f)], { cwd: __dirname, encoding: "utf8" });
  if (r.status === 0) {
    console.log(`PASS bugs/${f}`);
  } else {
    failed++;
    console.log(`FAIL bugs/${f}\n${r.stdout}${r.stderr}`);
  }
}
console.log(`\n${failed} failing test file(s)`);
process.exit(failed ? 1 : 0);
