import fs from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {collectMessages} from '../src/localization.mjs';
import {locales} from '../public/assets/locales.js';
const read=async name=>JSON.parse(await fs.readFile(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const [site,terms,videos,channels,official,snapshot,interview,blogs,blogSnapshot,privacy,liveEvents]=await Promise.all(['site','terms','videos','channels','official-channels','youtube-snapshot','interview','blogs','blog-snapshot','privacy','live-events'].map(read));
const catalogs=Object.fromEntries(await Promise.all(locales.map(async locale=>[locale.code,await read('i18n/'+locale.code)])));
const {ja,en}=catalogs;
const pages=renderPages({site,terms,videos,channels,official,snapshot,interview,blogs,blogSnapshot,privacy,liveEvents});
const current=collectMessages(pages,ja,en);
// Keep inactive messages too: date-limited features may reappear in a future build.
for(const [id,{source}] of current)ja.messages[id]=source;
const pending=[];
for(const group of ['messages','runtime'])for(const [id,source] of Object.entries(ja[group])){
  const languages=[];
  for(const locale of locales.filter(locale=>locale.code!=='ja')){
    const catalog=catalogs[locale.code];
    if(!(id in catalog[group]))catalog[group][id]='';
    if(!catalog[group][id].trim())languages.push(locale.code);
  }
  if(languages.length)pending.push({id,group,source,languages,pages:[...new Set(current.get(id)?.pages||[])]});
}
for(const [lang,data] of Object.entries(catalogs))await fs.writeFile(new URL('../content/i18n/'+lang+'.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
await fs.mkdir(new URL('../research/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../research/i18n-pending.json',import.meta.url),JSON.stringify(pending,null,2)+'\n');
console.log(`${current.size} current messages; ${pending.length} need translation. See research/i18n-pending.json.`);
