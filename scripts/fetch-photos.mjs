// Downloads the photos listed in photos.manifest.json into public/photos.
// Each photo is the lead image of an English Wikipedia article (or a Commons file set in "file").
// Writes two sizes per photo (<id>.jpg 1920px wide, <id>-sm.jpg 800px wide) and credits.json.
// Runs in GitHub Actions (see .github/workflows/photos.yml); photos that already match the
// manifest are skipped, so re-runs only fetch what changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const UA = 'WanderwiseBot/0.1 (https://github.com/k1vlem/wanderwise; school project)';
const OUT = 'public/photos';
const CREDITS = path.join(OUT, 'credits.json');

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

const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const exists = (p) => fs.access(p).then(() => true, () => false);

async function leadImageFile(article) {
  const title = encodeURIComponent(article.replace(/ /g, '_'));
  const summary = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const src = summary.originalimage?.source;
  if (!src) throw new Error(`No lead image for "${article}"`);
  // e.g. /wikipedia/commons/thumb/a/ab/Name.jpg/3840px-Name.jpg?utm_source=... or /wikipedia/commons/a/ab/Name.jpg
  const parts = new URL(src).pathname.split('/');
  if (parts[2] !== 'commons') throw new Error(`Lead image of "${article}" is not on Commons`);
  const thumb = parts.indexOf('thumb');
  const name = thumb === -1 ? parts[parts.length - 1] : parts[thumb + 3];
  return `File:${decodeURIComponent(name)}`;
}

async function fileInfo(file) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: file,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1920',
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

let fetched = 0;
let failed = 0;
const log = [];
const say = (line) => {
  log.push(line);
  console.log(line);
};
for (const p of manifest.photos) {
  const key = p.file ?? `wiki:${[].concat(p.wiki).join('|')}`;
  const big = path.join(OUT, `${p.id}.jpg`);
  const small = path.join(OUT, `${p.id}-sm.jpg`);
  if (credits[p.id]?.key === key && (await exists(big)) && (await exists(small))) continue;
  try {
    let file = p.file;
    if (!file) {
      // "wiki" can list several articles; the first one with a usable lead image wins.
      const articles = Array.isArray(p.wiki) ? p.wiki : [p.wiki];
      for (const article of articles) {
        try {
          file = await leadImageFile(article);
          break;
        } catch (err) {
          say(`skip ${p.id.padEnd(12)} ${err.message}`);
        }
      }
      if (!file) throw new Error('No usable lead image');
    }
    const info = await fileInfo(file);
    const buf = await get(info.url, 'buffer');
    const image = sharp(buf).rotate();
    await image.clone().resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(big);
    await image.clone().resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(small);
    credits[p.id] = { key, file, author: info.author, license: info.license, licenseUrl: info.licenseUrl, source: info.source, width: info.width, height: info.height };
    fetched += 1;
    say(`ok   ${p.id.padEnd(12)} ${file} (${info.width}x${info.height}, ${info.license})`);
  } catch (err) {
    failed += 1;
    say(`fail ${p.id.padEnd(12)} ${err.message}`);
  }
  await sleep(400);
}

// Drop credits for photos that left the manifest.
for (const id of Object.keys(credits)) {
  if (!manifest.photos.some((p) => p.id === id)) delete credits[id];
}
await fs.writeFile(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);
say(`Done: ${fetched} fetched, ${failed} failed.`);
await fs.writeFile(path.join(OUT, 'fetch-log.txt'), `${log.join('\n')}\n`);
