import {locales} from './locales.js?v=i18n-zh-20261125';
import {localizedPath} from './locale-core.js?v=i18n-zh-20261125';

const storageKey='toma-display-language';
const supported=code=>locales.some(locale=>locale.code===code);

export function matchBrowserLanguage(tag) {
  if(typeof tag!=='string')return;
  const parts=tag.toLowerCase().split('-');
  if(parts[0]==='zh'){
    if(parts.includes('hant'))return 'zh-Hant';
    if(parts.includes('hans'))return 'zh-Hans';
    return parts.some(part=>['tw','hk','mo'].includes(part))?'zh-Hant':'zh-Hans';
  }
  return locales.find(locale=>locale.code.toLowerCase()===parts[0])?.code;
}

export function preferredBrowserLanguage(preferences=[]) {
  for(const tag of preferences){const language=matchBrowserLanguage(tag);if(language)return language;}
  return 'en';
}

// Explicit language URLs stay shareable. Unprefixed URLs follow the browser or
// a language the visitor has chosen in this tab. Nothing is sent to a service.
export function createLanguagePreference({href,preferences=[],storage}) {
  const current=new URL(href);
  const query=current.searchParams.get('lang');
  const explicit=supported(query)?query:undefined;
  const pathLocale=locales.find(locale=>locale.prefix&&(current.pathname===locale.prefix||current.pathname.startsWith(locale.prefix+'/')))?.code;
  let saved;
  try {const value=storage?.getItem(storageKey);if(supported(value))saved=value;}catch{}
  const language=explicit||pathLocale||saved||preferredBrowserLanguage(preferences);
  const initial=new URL(current);initial.pathname=localizedPath(initial.pathname,language);
  return {
    language,
    initialHref:initial.href,
    selectLanguage(code) {
      if(!supported(code))return current.href;
      let persisted=false;
      try {if(storage){storage.setItem(storageKey,code);persisted=true;}}catch{}
      const next=new URL(current);next.pathname=localizedPath(next.pathname,code);
      if(persisted)next.searchParams.delete('lang');
      else next.searchParams.set('lang',code);
      return next.href;
    },
    localPath(path,code) {
      const localized=localizedPath(path,code);
      if(!explicit||!/^\/(?!\/)/.test(localized)||/^\/(?:api|assets)(?:\/|$)/.test(localized))return localized;
      const next=new URL(localized,current);next.searchParams.set('lang',code);
      return next.pathname+next.search+next.hash;
    },
  };
}
