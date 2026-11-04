/**
 * dev.js - Clean Next.js dev server launcher
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = __dirname;
const nextDir = path.join(root, '.next');
const traceFile = path.join(nextDir, 'trace');

// 1. Clear stale trace file if present
try {
  if (fs.existsSync(traceFile)) {
    fs.unlinkSync(traceFile);
  }
} catch (_) {}

// 2. Start Next.js dev server
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = cp.spawn(process.execPath, [nextBin, 'dev'], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});

process.on('SIGINT', () => { child.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { child.kill('SIGTERM'); process.exit(0); });