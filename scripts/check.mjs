import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {locales} from '../public/assets/locales.js';
import {checkTrustedLinks} from './trusted-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const walk = async dir => (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(async e => e.isDirectory() ? walk(path.join(dir,e.name)) : path.join(dir,e.name)))).flat();
const files = await walk(dist);
const htmlFiles = files.filter(f => f.endsWith('.html'));
const html = new Map(await Promise.all(htmlFiles.map(async f => [f,await fs.readFile(f,'utf8')])));
let checkedLinks = 0;
for (const [file, source] of html) {
  assert.equal((source.match(/<h1\b/g)||[]).length,1,`${file}: one h1 required`);
  const relative='/'+path.relative(dist,file);
  const language=locales.find(locale=>locale.prefix&&relative.startsWith(locale.prefix+'/'))?.code||'ja';
  assert.ok(source.includes(`<html lang="${language}">`),`${file}: correct page language required`);
  assert.ok(source.includes('name="description"'),`${file}: description missing`);
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`${file}: duplicate element id`);
  for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = match[1].replaceAll('&amp;','&');
    if (/^https?:\/\//.test(url)) { assert.equal(new URL(url).protocol,'https:',`Non-HTTPS link ${url}`);continue; }
    const [address,fragment] = url.split('#');
    const pathname = address.split('?')[0];
    const target = pathname ? path.join(dist, pathname.endsWith('/') ? pathname+'index.html' : pathname) : file;
    assert.ok(files.includes(target),`${file}: missing local target ${url}`);
    if (fragment) assert.ok(html.get(target)?.includes(`id="${decodeURIComponent(fragment)}"`),`${file}: missing anchor ${url}`);
    checkedLinks++;
  }
  assert.ok(!source.includes('localSource'),`${file}: private source metadata should not ship`);
  assert.ok(!source.includes('/Users/'),`${file}: absolute local path leaked`);
  assert.ok(!/<a\b[^>]*href="(?:#|)"/.test(source),`${file}: placeholder link`);
}
const read = async name => JSON.parse(await fs.readFile(path.join(root,'content',name+'.json'),'utf8'));
const [terms, channels, videos, snapshot, site, privacy] = await Promise.all(['terms','channels','videos','youtube-snapshot','site','privacy'].map(read));
checkTrustedLinks({site, privacy, channels});
for (const list of [terms,videos,snapshot.schedule.events]) assert.equal(list.length,new Set(list.map(v=>v.id)).size,'Duplicate content id');
assert.equal(channels.length,17,'All 17 requested channels must be included');
const expectedHandles=['charenja_ren','makyon','shion987','黒川宇宙研究所','maimaiの色いろなお話し','amo01721','yuricomoon','Misato-Morisaki','Izumi-bn1hv','serum-saori','kimie-014','yoshi_treasure_map','morikyun2026','神樂安珠那','TOMANIALIVE','のりのりのりこ-v2b','カオス屋みや'];
assert.deepEqual(channels.map(c=>c.handle),expectedHandles,'Requested channel ordering and handles');
assert.equal(new Set(channels.map(c=>c.channelId)).size,channels.length,'Unique channel IDs');
for (const c of channels) assert.match(c.channelId,/^UC[\w-]{22}$/,'Valid stable channel ID');
for (const item of snapshot.channels.items) if (item.latest) assert.equal(item.latest.format,'video','Snapshot excludes Shorts');
assert.ok(!html.get(path.join(dist,'videos/index.html')).includes('class="recommended-link"'),'Original video is not pinned separately');
for (const page of ['index.html','start/index.html','videos/index.html']) assert.ok(html.get(path.join(dist,page)).includes('PLQJ1jLgQOlbeUHgQf5oDO8ii1Vkz94upN'),'Interview playlist present');
for (const t of terms) assert.match(t.id,/^[a-z0-9-]+$/,'Valid glossary anchors');
for (const v of videos) assert.match(v.id,/^[\w-]{11}$/,'Valid YouTube video ID');
for (const e of snapshot.schedule.events) assert.ok(!e.startsAt || (Number.isFinite(Date.parse(e.startsAt)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(e.startsAt)),'Explicit event time zone');
assert.ok(files.includes(path.join(dist,'_worker.js')),'Cloudflare Worker included');
assert.deepEqual(JSON.parse(await fs.readFile(path.join(dist,'_routes.json'),'utf8')).include,['/api/*'],'Only API requests invoke the Worker');
assert.ok(html.get(path.join(dist,'club/index.html')).includes(site.membership.condition),'Membership eligibility shown');
console.log(`PASS: ${htmlFiles.length} pages; ${checkedLinks} local links/assets/anchors; ${channels.length} channel destinations; content metadata and membership guidance.`);
