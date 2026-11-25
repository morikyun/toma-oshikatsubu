import {translate,setupLanguagePicker} from './i18n.js?v=i18n-zh-20261125';
document.body.classList.add('js-ready');
setupLanguagePicker();
// Preserve glossary anchors when changing language; plain links also work without JS.
const updateLanguageLinks=()=>document.querySelectorAll('[data-language-link]').forEach(link=>{const url=new URL(link.href);url.hash=location.hash;link.href=url.href;});
updateLanguageLinks();
window.addEventListener('hashchange',updateLanguageLinks);

// Sample from the entire fan list once per page load; the full directory keeps its newest-first order.
document.querySelectorAll('[data-random-channels]').forEach(strip => {
  const links=[...strip.querySelectorAll('[data-random-channel]')];
  for (let i=links.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [links[i],links[j]]=[links[j],links[i]];
  }
  const more=strip.querySelector('.channel-strip-more');
  links.forEach((link,index)=>{
    link.hidden=index>=5;
    strip.insertBefore(link,more);
  });
});

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#site-nav');
const setMenu = open => {
  menuButton.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
};
menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (menuButton?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.matchMedia('(min-width: 1281px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[À-ž]/g, char => char.normalize('NFD').replace(/\p{M}/gu, '')).replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60)).replace(/[\s☆・ー\-]+/g, '');
document.querySelectorAll('[data-filter-group]').forEach(group => {
  const input = group.querySelector('[data-search-input]');
  const prefectureSelect = group.querySelector('[data-prefecture-filter]');
  const cards = [...group.querySelectorAll('[data-search-item]')];
  const buttons = [...group.querySelectorAll('[data-filter]')];
  const count = group.querySelector('[data-result-count]');
  const empty = group.querySelector('[data-empty-state]');
  let category = 'all';
  const apply = () => {
    const query = normalize(input.value);
    const prefecture = prefectureSelect?.value || 'all';
    let visible = 0;
    cards.forEach(card => {
      const match = (category === 'all' || card.dataset.category === category)
        && (prefecture === 'all' || card.dataset.prefecture === prefecture)
        && normalize(card.dataset.search).includes(query);
      // Only hide cards; keep the latest-video order, including after feed updates.
      card.hidden = !match;
      if (match) visible++;
    });
    count.textContent = translate(`${visible}件の${document.body.dataset.page === 'words' ? 'ことば' : 'チャンネル'}`);
    empty.hidden = visible !== 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  };
  const reset = () => {
    input.value = '';
    category = 'all';
    if (prefectureSelect) prefectureSelect.value = 'all';
    apply();
  };
  input.addEventListener('input', apply);
  prefectureSelect?.addEventListener('change', apply);
  // History navigation may restore form values after scripts have initialized.
  window.addEventListener('pageshow', () => setTimeout(apply, 0));
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; apply(); }));
  group.querySelector('[data-clear-filter]')?.addEventListener('click', () => { reset(); input.focus(); });
  const revealHash = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target && cards.includes(target)) {
      reset();
      const details = target.querySelector('details');
      if (details) details.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  };
  window.addEventListener('hashchange', revealHash);
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    // Clicking the current anchor does not fire hashchange, even if a filter hid it.
    if (link?.hash && link.hash === location.hash) revealHash();
  });
  if (location.hash) revealHash();
  apply();
});

const checklist = [...document.querySelectorAll('[data-checklist-item]')];
const updateChecklist = () => {
  const progress = document.querySelector('#checklist-progress');
  if (progress) progress.textContent = translate(`${checklist.filter(input => input.checked).length} / ${checklist.length} 確認できました`);
};
checklist.forEach(input => input.addEventListener('change', updateChecklist));
updateChecklist();

document.querySelectorAll('.video-image img').forEach(img => {
  const fail = () => { img.dataset.failed = 'true'; };
  img.addEventListener('error', fail);
  if (img.complete && img.naturalWidth === 0) fail();
});
