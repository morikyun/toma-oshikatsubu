// Shared by the build and browser. Translation files contain text, never HTML.
import {locales,localeFor} from './locales.js?v=i18n-zh-20261125';
const quote = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const hasJapanese = value => /[\u3040-\u30ff\u3400-\u9fff]/u.test(value);
export function createTranslator(ja, target, language='en') {
  const originals={...ja.messages,...ja.runtime};
  const translations={...target.messages,...target.runtime};
  const exact=new Map(), patterns=[];
  for(const [key,source] of Object.entries(originals)) {
    const target=translations[key];
    if(typeof target!=='string'||!target.trim())continue;
    const names=[...source.matchAll(/\{([a-zA-Z]+)\}/g)].map(m=>m[1]);
    if(!names.length){exact.set(source,target);continue;}
    let expression='',last=0;
    for(const match of source.matchAll(/\{([a-zA-Z]+)\}/g)) {
      expression+=quote(source.slice(last,match.index));
      expression+=['count','total','done','themes','year'].includes(match[1])?'(\\d+)':match[1]==='date'?'([0-9/: .年月日-]+|未確認)':'([\\s\\S]+?)';
      last=match.index+match[0].length;
    }
    patterns.push({regex:new RegExp('^'+expression+quote(source.slice(last))+'$'),names,target});
  }
  const lookup=value=>{
    const source=String(value??'').trim();
    if(language==='ja')return {value:source,known:true};
    if(exact.has(source))return {value:exact.get(source),known:true};
    for(const rule of patterns){
      const match=source.match(rule.regex);if(!match)continue;
      const values=Object.fromEntries(rule.names.map((name,i)=>[name,match[i+1]]));
      if(values.date)values.date=localizedDate(values.date,language);
      let value=rule.target.replace(/\{([a-zA-Z]+)\}/g,(_,name)=>values[name]??'');
      if(values.count==='1')value=value.replace(/^1 glossary entries$/,'1 glossary entry').replace(/^1 channels$/,'1 channel').replace(/^1 live events$/,'1 live event');
      return {value,known:true};
    }
    return {value:source,known:!hasJapanese(source)};
  };
  const text=value=>String(value??'').replace(/^(\s*)([\s\S]*?)(\s*)$/,(_,before,body,after)=>before+lookup(body).value+after);
  return {text,lookup};
}
export function englishDate(value) {
  if(value==='未確認')return 'not yet checked';
  const match=value.trim().match(/^(\d{4})[\/年.-](\d{1,2})[\/月.-](\d{1,2})日?(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(!match)return value;
  const [,year,month,day,hour,minute]=match;
  const date=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
  return new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(date)+(hour?`, ${hour.padStart(2,'0')}:${minute}`:'');
}
export function localizedDate(value,language='en') {
  if(language==='en')return englishDate(value);
  if(!language.startsWith('zh-'))return value;
  if(value==='未確認')return language==='zh-Hans'?'尚未确认':'尚未確認';
  const match=value.trim().match(/^(\d{4})[\/年.-](\d{1,2})[\/月.-](\d{1,2})日?(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(!match)return value;
  const [,year,month,day,hour,minute]=match;
  return `${year}年${Number(month)}月${Number(day)}日`+(hour?` ${hour.padStart(2,'0')}:${minute}`:'');
}
export function localizedPath(url,language='en') {
  if(!/^\/(?!\/)/.test(url)||/^\/(?:assets|api)(?:\/|$)/.test(url))return url;
  const previous=locales.find(locale=>locale.prefix&&(url===locale.prefix||url.startsWith(locale.prefix+'/')||url.startsWith(locale.prefix+'?')||url.startsWith(locale.prefix+'#')));
  const path=previous?url.slice(previous.prefix.length):url;
  return localeFor(language).prefix+(path.startsWith('/')?path:'/'+path);
}
