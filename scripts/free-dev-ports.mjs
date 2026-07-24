// Frees the dev ports (5050 backend, 5173 frontend) before `npm run dev:all`,
// so a ghost process left over from a previous run can never block startup with
// EADDRINUSE. Runs automatically as the `predev:all` npm lifecycle hook.
// Best-effort by design: any failure is swallowed so it can never break `dev:all`.
import { execSync } from 'node:child_process';

const PORTS = [5050, 5173];
const isWin = process.platform === 'win32';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function pidsOnPort(port) {
  try {
    const out = isWin
      ? run(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique"`,
        )
      : run(`lsof -ti tcp:${port} -sTCP:LISTEN`);
    return out
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return []; // nothing listening (or the tool is unavailable)
  }
}

function kill(pid) {
  try {
    if (isWin) run(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`);
    else run(`kill -9 ${pid}`);
  } catch {
    /* already gone */
  }
}

let freed = 0;
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    if (String(pid) === String(process.pid)) continue; // never kill ourselves
    kill(pid);
    freed += 1;
    console.log(`  freed port ${port} (stopped PID ${pid})`);
  }
}
console.log(freed === 0 ? 'dev ports 5050/5173 already free ✓' : `cleaned ${freed} ghost process(es) ✓`);
