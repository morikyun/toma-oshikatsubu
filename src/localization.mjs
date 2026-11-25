import {parse,parseFragment,serialize} from 'parse5';
import {createHash} from 'node:crypto';
import {createTranslator,hasJapanese,localizedPath} from '../public/assets/locale-core.js';
import {locales,localeFor} from '../public/assets/locales.js';
export const messageId=value=>'text_'+createHash('sha256').update(value).digest('hex').slice(0,12);
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const set=(node,name,value)=>{const a=node.attrs.find(a=>a.name===name);if(a)a.value=value;else node.attrs.push({name,value});};
export function walk(node,callback,skip=false){
  skip=skip||attr(node,'translate')==='no'||['script','style','svg'].includes(node.tagName);
  callback(node,skip);
  for(const child of node.childNodes||[])walk(child,callback,skip);
  if(node.content)walk(node.content,callback,skip);
}
export function collectMessages(pages,ja={},en={}){
  const found=new Map();const {lookup}=createTranslator({runtime:ja.runtime},{runtime:en.runtime});
  for(const [file,html] of Object.entries(pages))walk(parse(html,{scriptingEnabled:false}),(node,skip)=>{
    if(skip)return;
    const values=node.nodeName==='#text'?[node.value]:(node.attrs||[]).filter(a=>['alt','title','aria-label','placeholder'].includes(a.name)||(a.name==='content'&&['description','og:title','og:description','og:site_name','og:image:alt','twitter:title','twitter:description','twitter:image:alt'].includes(attr(node,'name')||attr(node,'property')))).map(a=>a.value);
    for(const raw of values){const value=raw.trim();if(hasJapanese(value)&&!lookup(value).known){const key=messageId(value);if(!found.has(key))found.set(key,{source:value,pages:[]});found.get(key).pages.push(file);}}
  });
  return found;
}
export function localizePage(html,file,language,ja,target,base){
  const doc=parse(html,{scriptingEnabled:false});const tr=createTranslator(ja,target,language),missing=new Set();
  const locale=localeFor(language);
  const translate=value=>{if(!tr.lookup(value).known)missing.add(value.trim());return tr.text(value);};
  const path='/'+file.replace(/index\.html$/,'');
  walk(doc,(node,skip)=>{
    if(node.tagName==='html')set(node,'lang',language);
    if(node.nodeName==='#text'){if(!skip&&language!=='ja')node.value=translate(node.value);return;}
    if(!node.attrs)return;
    if(!skip&&language!=='ja')for(const a of node.attrs){
      if(['alt','title','aria-label','placeholder'].includes(a.name)||(a.name==='content'&&['description','og:title','og:description','og:site_name','og:image:alt','twitter:title','twitter:description','twitter:image:alt'].includes(attr(node,'name')||attr(node,'property'))))a.value=translate(a.value);
    }
    if(node.tagName==='a'&&attr(node,'href'))set(node,'href',localizedPath(attr(node,'href'),language));
    if(attr(node,'rel')==='canonical')set(node,'href',base+localizedPath(path,language));
    if(attr(node,'property')==='og:url')set(node,'content',base+localizedPath(path,language));
    if(attr(node,'property')==='og:locale')set(node,'content',locale.ogLocale);
    if(node.tagName==='head'){
      const extra=parseFragment(locales.map(item=>`<link rel="alternate" hreflang="${item.code}" href="${base+localizedPath(path,item.code)}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${base+path}">`);
      node.childNodes.push(...extra.childNodes);
    }
  });
  // A hidden line break must not join English words (e.g. “A littleglossary”).
  const breaks=[];
  if(language==='en')walk(doc,(node,skip)=>{if(!skip&&['br','wbr'].includes(node.tagName))breaks.push(node);});
  for(const node of breaks){
    const siblings=node.parentNode?.childNodes||[],index=siblings.indexOf(node);
    const edgeText=(item,last)=>{
      if(item?.nodeName==='#text')return item;
      const children=item?.childNodes||[];
      for(const child of last?[...children].reverse():children){const text=edgeText(child,last);if(text)return text;}
    };
    const before=edgeText(siblings[index-1],true),after=edgeText(siblings[index+1],false);
    const hasSpaceBefore=siblings[index-1]?.nodeName==='#text'&&/\s$/.test(before?.value||'');
    const hasSpaceAfter=siblings[index+1]?.nodeName==='#text'&&/^\s/.test(after?.value||'');
    if(before?.value.trim()&&after?.value.trim()&&!hasSpaceBefore&&!hasSpaceAfter){
      siblings.splice(index,0,{nodeName:'#text',value:' ',parentNode:node.parentNode});
    }
  }
  // The selected option reflects this URL; the browser chooses an initial route.
  walk(doc,node=>{
    if(attr(node,'class')?.split(' ').includes('header-inner')){
      const switcher=parseFragment(`<label class="language-control"><span class="sr-only">${locale.navigationLabel}</span><svg class="language-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"></path></svg><select data-language-select aria-label="${locale.navigationLabel}">${locales.map(item=>`<option value="${item.code}" lang="${item.code}"${language===item.code?' selected':''}>${item.label}</option>`).join('')}</select></label><noscript><nav class="language-fallback" aria-label="${locale.navigationLabel}">${locales.map(item=>`<a data-language-link href="${localizedPath(path,item.code)}" lang="${item.code}" hreflang="${item.code}"${language===item.code?' aria-current="true"':''}>${item.label}</a>`).join('')}</nav></noscript>`,{scriptingEnabled:false});
      node.childNodes.push(...switcher.childNodes);
    }
    if(language!=='ja'&&attr(node,'data-search')!==undefined){
      const values=[];walk(node,n=>{if(n.nodeName==='#text')values.push(n.value);});
      const text=values.join(' ');set(node,'data-search',attr(node,'data-search')+' '+text);
      if(attr(node,'data-base-search')!==undefined){
        const baseValues=[];
        const gather=n=>{if(attr(n,'data-channel-latest')!==undefined)return;if(n.nodeName==='#text')baseValues.push(n.value);for(const child of n.childNodes||[])gather(child);};
        gather(node);set(node,'data-base-search',attr(node,'data-base-search')+' '+baseValues.join(' '));
      }
    }
  });
  if(missing.size)throw new Error(`Missing ${locale.label} translations in ${file}:\n${[...missing].join('\n')}`);
  return serialize(doc);
}
