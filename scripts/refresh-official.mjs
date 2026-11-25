import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchOfficialVideos} from '../src/youtube-service.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if (!process.env.YOUTUBE_API_KEY) {
  console.error('Set YOUTUBE_API_KEY in the environment to refresh official videos.');
  process.exitCode=1;
} else {
  const read=async name=>JSON.parse(await fs.readFile(path.join(root,'content',name+'.json'),'utf8'));
  const [official,snapshot]=await Promise.all(['official-channels','youtube-snapshot'].map(read));
  try {
    snapshot.officialVideos=await fetchOfficialVideos(official,process.env.YOUTUBE_API_KEY);
    await fs.writeFile(path.join(root,'content/youtube-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
    console.log(`Updated official videos: ${snapshot.officialVideos.items.length} published matches.`);
  } catch {
    console.error('Official video update unavailable; the previous snapshot was kept.');
    process.exitCode=1;
  }
}
