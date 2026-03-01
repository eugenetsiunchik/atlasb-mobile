/* eslint-disable no-console */
const os = require('os');

function pickBestIpv4() {
  const nets = os.networkInterfaces();

  /** @type {Array<{name: string, address: string}>} */
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (!a) continue;
      if (a.family !== 'IPv4') continue;
      if (a.internal) continue;
      candidates.push({ name, address: a.address });
    }
  }

  // Prefer common macOS/Linux primary interfaces.
  const preferred = ['en0', 'en1', 'wlan0', 'eth0'];
  for (const iface of preferred) {
    const hit = candidates.find(c => c.name === iface);
    if (hit) return hit.address;
  }

  return candidates[0]?.address ?? null;
}

const ip = pickBestIpv4();
if (!ip) {
  console.error(
    'Could not determine LAN IPv4. Make sure you are connected to Wi‑Fi/Ethernet.',
  );
  process.exitCode = 1;
} else {
  // Print only the IP (easy copy/paste).
  console.log(ip);
}

