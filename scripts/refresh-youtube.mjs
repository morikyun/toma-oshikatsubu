import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchChannelUpdates, fetchSchedule, fetchOfficialVideos } from '../src/youtube-service.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async n=>JSON.parse(await fs.readFile(path.join(root,'content',n+'.json'),'utf8'));
const [channels,official,old]=await Promise.all(['channels','official-channels','youtube-snapshot'].map(read));
const result={...old,channels:await fetchChannelUpdates(channels,old.channels),schedule:old.schedule};
if (process.env.YOUTUBE_API_KEY) {
  try {result.schedule=await fetchSchedule(official,process.env.YOUTUBE_API_KEY);} catch {console.error('Schedule update unavailable; kept previous snapshot.');}
  try {result.officialVideos=await fetchOfficialVideos(official,process.env.YOUTUBE_API_KEY);} catch {console.error('Official video update unavailable; kept previous snapshot.');}
}
await fs.writeFile(path.join(root,'content/youtube-snapshot.json'),JSON.stringify(result,null,2)+'\n');
console.log(`YouTube snapshot: ${result.channels.items.filter(c=>c.status!=='unavailable').length}/${channels.length} channel feeds refreshed. Schedule: ${result.schedule.mode}.`);
