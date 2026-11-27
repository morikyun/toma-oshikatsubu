import {translate} from './i18n.js?v=relay-20261127';
import {eventIsCurrent} from './event-dates.js';

const status=document.querySelector('[data-relay-copy-status]');
document.querySelectorAll('[data-relay-copy]').forEach(button=>{
  const target=document.getElementById(button.dataset.relayCopy);
  if(!target)return;
  button.hidden=false;
  button.addEventListener('click',async()=>{
    try {
      await navigator.clipboard.writeText(target.innerText.trim());
      status.textContent=translate('コピーしました。あなたの言葉に変えて、いつものSNSに投稿してください。');
      button.textContent=translate('コピーしました');
    } catch {
      const range=document.createRange();range.selectNodeContents(target);
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      status.textContent=translate('コピーできなかったため、文章を選択しました。手動でコピーしてください。');
      button.textContent=translate('文章を選択しました');
    }
  });
});
function updatePeriod(){
  const notice=document.querySelector('[data-relay-closed]');
  if(notice)notice.hidden=eventIsCurrent('2026-12-22');
}
updatePeriod();
window.addEventListener('pageshow',updatePeriod);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updatePeriod();});
