import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredBrowserLanguage,createLanguagePreference} from '../public/assets/language-preference.js';

test('browser language matching handles both Chinese scripts and falls back to English',()=>{
  for(const [preferences,expected] of [
    [['ja-JP'],'ja'],[['en-GB'],'en'],[['zh-CN'],'zh-Hans'],[['zh-SG'],'zh-Hans'],
    [['zh-TW'],'zh-Hant'],[['zh-HK'],'zh-Hant'],[['zh-MO'],'zh-Hant'],
    [['zh-Hant-CN'],'zh-Hant'],[['zh-Hans-HK'],'zh-Hans'],[['zh'],'zh-Hans'],
    [['fr-FR','ja-JP'],'ja'],[['ko-KR','es-ES','fr-FR'],'en'],[[],'en'],[[undefined],'en'],
  ])assert.equal(preferredBrowserLanguage(preferences),expected,JSON.stringify(preferences));
});

test('automatic language selection preserves the page, query and glossary anchor',()=>{
  const nav=createLanguagePreference({href:'https://site.example/words/?q=music#emerald',preferences:['zh-TW']});
  assert.equal(nav.initialHref,'https://site.example/zh-hant/words/?q=music#emerald');
  const fallback=createLanguagePreference({href:'https://site.example/live/',preferences:['ko-KR']});
  assert.equal(fallback.initialHref,'https://site.example/en/live/');
  const explicit=createLanguagePreference({href:'https://site.example/zh-hans/live/',preferences:['ja-JP']});
  assert.equal(explicit.initialHref,'https://site.example/zh-hans/live/');
});

test('manual choices persist in the tab and override browser defaults on unprefixed URLs',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  const first=createLanguagePreference({href:'https://site.example/en/words/#emerald',preferences:['en-US'],storage});
  assert.equal(first.selectLanguage('ja'),'https://site.example/words/#emerald');
  assert.equal(data.size,1);
  const next=createLanguagePreference({href:'https://site.example/live/',preferences:['en-US'],storage});
  assert.equal(next.language,'ja');assert.equal(next.initialHref,'https://site.example/live/');
  assert.equal(next.selectLanguage('invalid'),'https://site.example/live/');
});

test('manual language selection still works when storage is blocked, without changing media or API URLs',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  const nav=createLanguagePreference({href:'https://site.example/en/words/?q=music#emerald',preferences:['en-US'],storage});
  const href=nav.selectLanguage('ja');
  assert.equal(href,'https://site.example/words/?q=music&lang=ja#emerald');
  const next=createLanguagePreference({href,preferences:['en-US'],storage});
  assert.equal(next.language,'ja');assert.equal(next.initialHref,href);
  assert.equal(next.localPath('/live/#checklist','ja'),'/live/?lang=ja#checklist');
  for(const value of ['/api/blogs','/assets/site.js','#main','https://www.youtube.com/watch?v=wtxo_t21t7w'])assert.equal(next.localPath(value,'ja'),value);
});
