import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const names = ['next', 'react', 'react-dom', 'tailwindcss', '@tailwindcss/postcss',
  'firebase', 'lucide-react', 'typescript', 'eslint', 'eslint-config-next',
  '@types/react', '@types/react-dom', '@types/node', '@fontsource-variable/manrope'];
const packages = await Promise.all(names.map(async name => {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const item = await response.json();
  return { name, version: item.version, source: url, engines: item.engines,
    peerDependencies: item.peerDependencies };
}));
const releases = await (await fetch('https://nodejs.org/dist/index.json')).json();
const node = releases.find(item => /^v26\.\d+\.\d+$/.test(item.version) && item.lts);
const vercelSource = 'https://vercel.com/docs/functions/runtimes/node-js/node-js-versions';
const vercelHtml = await (await fetch(vercelSource)).text();
if (!vercelHtml.includes('26.x')) throw new Error('Recheck Vercel Node 26 support');
const audit = { checkedForClientDate: '2026-11-11', fetchedAt: new Date().toISOString(),
  packages, node: { ...node, source: 'https://nodejs.org/dist/index.json' },
  vercel: { source: vercelSource, selectedMajor: '26.x' } };
const directory = fileURLToPath(new URL('../docs/', import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/version-audit.json`, JSON.stringify(audit, null, 2)+'\n');
console.log(packages.map(item => `${item.name} ${item.version}`).join('\n'));
console.log(`Node ${node.version}; Vercel 26.x verified`);
