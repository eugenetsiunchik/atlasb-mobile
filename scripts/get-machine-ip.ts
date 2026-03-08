import os from 'os';

type InterfaceCandidate = {
  name: string;
  address: string;
};

function pickBestIpv4() {
  const networks = os.networkInterfaces();
  const candidates: InterfaceCandidate[] = [];

  for (const [name, addresses] of Object.entries(networks)) {
    if (!addresses) continue;

    for (const addressInfo of addresses) {
      if (!addressInfo) continue;
      if (addressInfo.family !== 'IPv4') continue;
      if (addressInfo.internal) continue;

      candidates.push({ name, address: addressInfo.address });
    }
  }

  const preferredInterfaces = ['en0', 'en1', 'wlan0', 'eth0'];

  for (const interfaceName of preferredInterfaces) {
    const match = candidates.find(candidate => candidate.name === interfaceName);
    if (match) return match.address;
  }

  return candidates[0]?.address ?? null;
}

const ipAddress = pickBestIpv4();

if (!ipAddress) {
  process.stderr.write(
    'Could not determine LAN IPv4. Make sure you are connected to Wi-Fi/Ethernet.\n',
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`${ipAddress}\n`);
}
