import {createTranslator} from './locale-core.js?v=i18n-zh-20261125';
import {localeFor} from './locales.js?v=i18n-zh-20261125';
import {catalogs} from './translations.js?v=fan-retry-20261126';
import {createLanguagePreference} from './language-preference.js?v=i18n-zh-20261125';
export const language=localeFor(document.documentElement.lang).code;
let storage;
try {storage=window.sessionStorage;}catch{}
const navigation=createLanguagePreference({href:window.location.href,preferences:navigator.languages?.length?navigator.languages:[navigator.language],storage});
if(navigation.initialHref!==window.location.href)window.location.replace(navigation.initialHref);
const translator=createTranslator(catalogs.ja,catalogs[language],language);
export const translate=translator.text;
export const localPath=url=>navigation.localPath(url,language);
export function setupLanguagePicker(){
  const picker=document.querySelector('[data-language-select]');
  if(picker){
    picker.value=language;
    picker.addEventListener('change',()=>{
      const href=navigation.selectLanguage(picker.value);
      if(href!==window.location.href)window.location.assign(href);
    });
  }
  // Preserve an explicit fallback choice when browser storage is unavailable.
  document.querySelectorAll('a[href^="/"]').forEach(link=>{
    if(!link.hasAttribute('data-language-link'))link.setAttribute('href',localPath(link.getAttribute('href')));
  });
}
export function localizeFragment(html) {
  if(language==='ja')return html;
  const template=document.createElement('template');template.innerHTML=html;
  function visit(node,skip=false){
    if(node.nodeType===3){if(!skip)node.nodeValue=translate(node.nodeValue);return;}
    if(node.nodeType===1){
      skip=skip||node.getAttribute('translate')==='no'||['SCRIPT','STYLE'].includes(node.tagName);
      if(!skip)for(const name of ['aria-label','alt','title','placeholder'])if(node.hasAttribute(name))node.setAttribute(name,translate(node.getAttribute(name)));
      if(node.tagName==='A'&&node.hasAttribute('href'))node.setAttribute('href',localPath(node.getAttribute('href')));
    }
    for(const child of node.childNodes)visit(child,skip);
  }
  visit(template.content);return template.innerHTML;
}
