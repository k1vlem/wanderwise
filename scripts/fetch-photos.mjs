// Downloads the photos listed in photos.manifest.json into public/photos.
// A photo is the lead image of a Wikipedia article ("Title" or "lang:Title"), or a Commons file
// set in "file". Writes <id>.jpg (large) and <id>-sm.jpg (small) plus credits.json, and logs
// every decision to fetch-log.txt. Runs in GitHub Actions (.github/workflows/photos.yml);
// photos that already match the manifest are skipped, so re-runs only fetch what changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'WanderwiseBot/0.2 (https://github.com/k1vlem/wanderwise; school project)';
const OUT = 'public/photos';
const CREDITS = path.join(OUT, 'credits.json');
// Cities and the hero fill wide banners; sights and dishes appear as cards and in the photo viewer.
const SIZES = {
  place: { lg: 1920, sm: 800 },
  detail: { lg: 1400, sm: 640 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => fs.access(p).then(() => true, () => false);
const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

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

/** "it:Supplì" -> lead image of the Italian article, as a Commons file title. */
async function leadImageFile(article) {
  const m = /^([a-z]{2,3}):(.+)$/.exec(article);
  const lang = m ? m[1] : 'en';
  const title = encodeURIComponent((m ? m[2] : article).replace(/ /g, '_'));
  const summary = await get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const src = summary.originalimage?.source;
  if (!src) throw new Error(`No lead image for "${article}"`);
  // e.g. /wikipedia/commons/thumb/a/ab/Name.jpg/3840px-Name.jpg?utm_source=... or /wikipedia/commons/a/ab/Name.jpg
  const parts = new URL(src).pathname.split('/');
  if (parts[2] !== 'commons') throw new Error(`Lead image of "${article}" is not on Commons`);
  const thumb = parts.indexOf('thumb');
  return `File:${decodeURIComponent(thumb === -1 ? parts[parts.length - 1] : parts[thumb + 3])}`;
}

async function fileInfo(file, width) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: file,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: String(width),
  });
  const data = await get(`https://commons.wikimedia.org/w/api.php?${params}`);
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`No Commons info for ${file}`);
  const meta = info.extmetadata ?? {};
  return {
    url: info.thumburl ?? info.url,
    width: info.width,
    height: info.height,
    author: stripHtml(meta.Artist?.value) || 'Unknown',
    license: stripHtml(meta.LicenseShortName?.value) || 'See source',
    licenseUrl: meta.LicenseUrl?.value ?? '',
    source: info.descriptionurl,
  };
}

const manifest = JSON.parse(await fs.readFile('photos.manifest.json', 'utf8'));
await fs.mkdir(OUT, { recursive: true });
const credits = (await exists(CREDITS)) ? JSON.parse(await fs.readFile(CREDITS, 'utf8')) : {};

const log = [];
const say = (line) => {
  log.push(line);
  console.log(line);
};

let fetched = 0;
let failed = 0;
for (const p of manifest.photos) {
  const articles = p.wiki ? [].concat(p.wiki) : [];
  const key = p.file ?? `wiki:${articles.join('|')}`;
  const size = SIZES[p.kind] ?? SIZES.place;
  const big = path.join(OUT, `${p.id}.jpg`);
  const small = path.join(OUT, `${p.id}-sm.jpg`);
  if (credits[p.id]?.key === key && (await exists(big)) && (await exists(small))) continue;

  // Files already used by other photos, so the same picture doesn't appear twice.
  const used = new Map(Object.entries(credits).filter(([id]) => id !== p.id).map(([id, c]) => [c.file, id]));
  try {
    let file = p.file;
    for (let i = 0; !file && i < articles.length; i += 1) {
      try {
        const candidate = await leadImageFile(articles[i]);
        if (used.has(candidate) && i < articles.length - 1) {
          say(`skip ${p.id.padEnd(28)} "${articles[i]}" uses ${candidate}, already used by ${used.get(candidate)}`);
          continue;
        }
        if (used.has(candidate)) say(`dup  ${p.id.padEnd(28)} ${candidate} is also used by ${used.get(candidate)}`);
        file = candidate;
      } catch (err) {
        say(`skip ${p.id.padEnd(28)} ${err.message}`);
      }
    }
    if (!file) throw new Error('No usable lead image');
    const info = await fileInfo(file, size.lg);
    const buf = await get(info.url, 'buffer');
    const image = sharp(buf).rotate().flatten({ background: '#ffffff' });
    await image.clone().resize({ width: size.lg, withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(big);
    await image.clone().resize({ width: size.sm, withoutEnlargement: true }).jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(small);
    credits[p.id] = { key, file, author: info.author, license: info.license, licenseUrl: info.licenseUrl, source: info.source, width: info.width, height: info.height };
    fetched += 1;
    say(`ok   ${p.id.padEnd(28)} ${file} (${info.width}x${info.height}, ${info.license})`);
  } catch (err) {
    failed += 1;
    say(`fail ${p.id.padEnd(28)} ${err.message}`);
  }
  await sleep(300);
}

// Drop photos that left the manifest.
for (const id of Object.keys(credits)) {
  if (!manifest.photos.some((p) => p.id === id)) {
    delete credits[id];
    await fs.rm(path.join(OUT, `${id}.jpg`), { force: true });
    await fs.rm(path.join(OUT, `${id}-sm.jpg`), { force: true });
    say(`del  ${id}`);
  }
}
await fs.writeFile(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);
say(`Done: ${fetched} fetched, ${failed} failed.`);
await fs.writeFile(path.join(OUT, 'fetch-log.txt'), `${log.join('\n')}\n`);
