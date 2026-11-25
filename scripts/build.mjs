import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPages } from '../src/pages.mjs';
import { sortChannels } from '../src/youtube-service.mjs';
import { createHash } from 'node:crypto';
import {localizePage} from '../src/localization.mjs';
import {locales} from '../public/assets/locales.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async name => JSON.parse(await fs.readFile(path.join(root, 'content', name + '.json'), 'utf8'));
const [site, terms, videos, channels] = await Promise.all(['site', 'terms', 'videos', 'channels'].map(read));
const [official, snapshot, interview] = await Promise.all(['official-channels','youtube-snapshot','interview'].map(read));
const [blogs, blogSnapshot] = await Promise.all(['blogs','blog-snapshot'].map(read));
const privacy=await read('privacy');
const catalogs=Object.fromEntries(await Promise.all(locales.map(async locale=>[locale.code,await read('i18n/'+locale.code)])));
const liveEvents=await read('live-events');
const dist = path.join(root, 'dist');
await fs.mkdir(dist, { recursive: true });
// Remove retired assets so older builds cannot ship the previous display gate.
for (const file of ['youtube-consent.js','youtube-consent-state.js']) await fs.rm(path.join(dist,'assets',file),{force:true});
await fs.cp(path.join(root, 'public'), dist, { recursive: true });
const originals = renderPages({ site, terms, videos, channels:sortChannels(channels,snapshot.channels.items), official, snapshot, interview, blogs, blogSnapshot, privacy, liveEvents });
const pages={};
for(const [file,html] of Object.entries(originals))for(const locale of locales){
  pages[(locale.prefix?locale.prefix.slice(1)+'/':'')+file]=localizePage(html,file,locale.code,catalogs.ja,catalogs[locale.code],site.baseUrl.replace(/\/$/,''));
}
// Only live-update messages are sent to browsers; long-form translations are pre-rendered.
const runtimeCatalogs=Object.fromEntries(locales.map(locale=>[locale.code,{runtime:catalogs[locale.code].runtime}]));
await fs.writeFile(path.join(dist,'assets/translations.js'),`export const catalogs=${JSON.stringify(runtimeCatalogs)};\n`);
for (const [file, html] of Object.entries(pages)) {
  await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
  await fs.writeFile(path.join(dist, file), html);
}
const base = site.baseUrl.replace(/\/$/, '');
if (base) {
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base)) throw new Error('baseUrl must be an HTTPS origin.');
  const urls = Object.keys(pages).filter(p => !p.endsWith('404.html')).map(p => `${base}/${p.replace(/index\.html$/, '')}`);
  await fs.writeFile(path.join(dist, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(url => `<url><loc>${url}</loc><lastmod>${site.updated}</lastmod></url>`).join('') + '</urlset>');
} else {
  await fs.rm(path.join(dist, 'sitemap.xml'), { force: true });
}
await fs.writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n' + (base ? `Sitemap: ${base}/sitemap.xml\n` : ''));
const publicChannels=channels.map(({channelId})=>({channelId}));
const revision=createHash('sha256').update(JSON.stringify([publicChannels,official])).digest('hex').slice(0,12);
const service=await fs.readFile(path.join(root,'src/youtube-service.mjs'),'utf8');
const youtubeRules=await fs.readFile(path.join(root,'public/assets/youtube-rules.js'),'utf8');
const blogService=await fs.readFile(path.join(root,'src/blog-service.mjs'),'utf8');
const eventDates=await fs.readFile(path.join(root,'public/assets/event-dates.js'),'utf8');
const liveService=await fs.readFile(path.join(root,'src/live-events-service.mjs'),'utf8');
const blogRevision=createHash('sha256').update(JSON.stringify(blogs)).digest('hex').slice(0,12);
const worker=youtubeRules.replace(/^export /gm,'')+'\n'+service.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\n'+blogService.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\n'+eventDates.replace(/^export /gm,'')+'\n'+liveService.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\nconst LIVE_SNAPSHOT = '+JSON.stringify({items:liveEvents.items,checkedAt:liveEvents.checkedAt,sourceUrl:liveEvents.sourceUrl,mode:'snapshot',stale:true})+';\nconst liveEventsHandler=createLiveEventsHandler(LIVE_SNAPSHOT);\nconst CONFIG = '+JSON.stringify({channels:publicChannels,official,snapshot,revision})+';\nconst BLOG_CONFIG = '+JSON.stringify({sources:blogs,snapshot:blogSnapshot,revision:blogRevision})+';\nconst youtubeHandler=createHandler(CONFIG);\nconst blogHandler=createBlogHandler(BLOG_CONFIG);\nexport default {fetch(request,env){const path=new URL(request.url).pathname;return path===\'/api/live-events\'?liveEventsHandler.fetch(request,env):path===\'/api/blogs\'?blogHandler.fetch(request,env):youtubeHandler.fetch(request,env);}};\n';
await fs.writeFile(path.join(dist,'_worker.js'),worker);
await fs.writeFile(path.join(dist,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
console.log(`Built ${Object.keys(pages).length} pages, ${terms.length} terms, ${channels.length} channels → dist/`);
