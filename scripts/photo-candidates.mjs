// Finds candidate photos on Wikimedia Commons for the keys in photo-candidates.json and saves
// small previews to review/<key>/<n>.jpg plus review/candidates.json, so a person can pick the
// best one and pin it in photos.manifest.json. Runs in .github/workflows/photo-review.yml.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'PangeaBot/0.2 (https://github.com/k1vlem/wanderwise; school project)';
const OUT = 'review';
const PER_KEY = 12;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'json') {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) return as === 'json' ? res.json() : Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * attempt);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`Gave up on ${url}`);
}

const commons = (params) => get(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`);

async function leadImageFile(article) {
  const m = /^([a-z]{2,3}):(.+)$/.exec(article);
  const lang = m ? m[1] : 'en';
  const title = encodeURIComponent((m ? m[2] : article).replace(/ /g, '_'));
  const summary = await get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const src = summary.originalimage?.source;
  if (!src) return null;
  const parts = new URL(src).pathname.split('/');
  if (parts[2] !== 'commons') return null;
  const thumb = parts.indexOf('thumb');
  return `File:${decodeURIComponent(thumb === -1 ? parts[parts.length - 1] : parts[thumb + 3])}`;
}

async function search(query) {
  const data = await commons({ action: 'query', list: 'search', srnamespace: '6', srlimit: '15', srsearch: `${query} filetype:bitmap` });
  return (data.query?.search ?? []).map((r) => r.title);
}

async function infos(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const data = await commons({ action: 'query', titles: titles.slice(i, i + 20).join('|'), prop: 'imageinfo', iiprop: 'size|url|mime', iiurlwidth: '360' });
    for (const page of Object.values(data.query?.pages ?? {})) {
      const ii = page.imageinfo?.[0];
      if (ii && /jpeg|png|webp/.test(ii.mime)) out.push({ file: page.title, width: ii.width, height: ii.height, thumb: ii.thumburl });
    }
  }
  // Keep the order the titles were found in.
  return titles.map((t) => out.find((o) => o.file === t)).filter(Boolean);
}

const config = JSON.parse(await fs.readFile('photo-candidates.json', 'utf8'));
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const result = {};

for (const [key, c] of Object.entries(config)) {
  const titles = [];
  const add = (t) => t && !titles.includes(t) && titles.push(t);
  for (const article of c.wiki ?? []) add(await leadImageFile(article).catch(() => null));
  for (const q of c.queries ?? []) {
    for (const variant of [`${q} incategory:Quality_images`, q]) {
      for (const t of await search(variant).catch(() => [])) add(t);
      await sleep(200);
    }
  }
  const minWidth = c.minWidth ?? 1400;
  const fits = (i) => i.width >= minWidth && (c.portrait || i.width / i.height >= 1.1);
  const picked = (await infos(titles.slice(0, 60))).filter(fits).slice(0, PER_KEY);
  result[key] = [];
  await fs.mkdir(path.join(OUT, key), { recursive: true });
  for (const [n, item] of picked.entries()) {
    try {
      const buf = await get(item.thumb, 'buffer');
      await sharp(buf).resize({ width: 360, height: 240, fit: 'cover' }).jpeg({ quality: 78 }).toFile(path.join(OUT, key, `${n + 1}.jpg`));
      result[key].push({ n: n + 1, file: item.file, width: item.width, height: item.height });
    } catch (err) {
      console.log(`thumb fail ${key} ${item.file}: ${err.message}`);
    }
  }
  console.log(`${key}: ${result[key].length} candidates from ${titles.length} titles`);
}

await fs.writeFile(path.join(OUT, 'candidates.json'), `${JSON.stringify(result, null, 1)}\n`);
