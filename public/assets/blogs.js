import {translate,localizeFragment,localPath} from './i18n.js?v=i18n-zh-20261125';
import {blogArticles,blogStatus} from './blog-views.js?v=i18n-zh-20261125';
const blogCards=[...document.querySelectorAll('[data-blog-id]')];
if (blogCards.length) {
  fetch('/api/blogs',{signal:AbortSignal.timeout(15000),cache:'no-cache'})
    .then(response=>{if (!response.ok) throw new Error('BLOG_UPDATE_UNAVAILABLE'); return response.json();})
    .then(data=>{
      if (!Array.isArray(data.items)) throw new Error('INVALID_BLOG_RESPONSE');
      const index=new Map(data.items.map(item=>[item.id,item]));
      for (const card of blogCards) {
        const item=index.get(card.dataset.blogId);
        if (!item || !Array.isArray(item.articles)) throw new Error('MISSING_BLOG');
        card.querySelector('[data-blog-articles]').innerHTML=localizeFragment(blogArticles(item,card.dataset.blogId,{limit:card.dataset.blogLimit,compact:card.dataset.blogLayout==='compact'}));
        card.querySelector('[data-blog-status]').textContent=translate(blogStatus(item));
      }
    }).catch(()=>{
      for (const card of blogCards) card.querySelector('[data-blog-status]').textContent=translate('更新を確認できないため、保存済みの記事を表示しています。最新の記事はブログからご覧ください。');
    });
}
