const blogEscape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blogDate = (value,withTime=false) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',...(withTime?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'Asia/Tokyo'}).format(new Date(value)) : '未確認';
export function blogArticles(item, account, {limit=3,compact=false}={}) {
  const count = [2,3].includes(Number(limit)) ? Number(limit) : 3;
  const articles = (item?.articles || []).filter(article => {
    if (!['tomasource','tomastaff','osikatutoma'].includes(account) || !article.title || !Number.isFinite(Date.parse(article.publishedAt))) return false;
    try { const url=new URL(article.url); return url.origin==='https://ameblo.jp' && !url.username && !url.password && new RegExp(`^/${account}/entry-\\d+\\.html$`).test(url.pathname); } catch { return false; }
  }).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,count);
  if (!articles.length) return `<p class="blog-empty">${item?.status==='empty'?'RSSに掲載された記事はありません。':'記事を取得できませんでした。'}最新の情報はブログからご覧ください。</p>`;
  return `<ul class="blog-posts">${articles.map(article=>`<li><a href="${blogEscape(article.url)}" target="_blank" rel="noopener noreferrer"><span><time datetime="${blogEscape(article.publishedAt)}">${blogDate(article.publishedAt)} 公開</time><span class="blog-post-title" translate="no">${blogEscape(article.title)}</span></span>${compact?'':'<span class="blog-post-arrow" aria-hidden="true">↗</span>'}<span class="sr-only">（アメブロ・新しいタブ）</span></a></li>`).join('')}</ul>`;
}
export function blogStatus(item, saved=false) {
  const label=item?.status==='unavailable'?'更新を確認できないため、前回取得した記事を表示':saved?'保存済みの記事を表示':'RSSから取得';
  return `${label} ／ 確認：${blogDate(item?.checkedAt,true)}（日本時間）`;
}
export function blogSection(sources, snapshot) {
  sources = sources.filter(source => ['tomasource','tomastaff'].includes(source.id));
  const index = new Map((snapshot.items || []).map(item=>[item.id,item]));
  return `<section class="section container blog-section" id="blogs"><div class="section-heading"><div><p class="eyebrow">LATEST FROM THE BLOGS</p><h2>ブログから届く、最新のお便り。</h2></div></div><p class="section-lead">とおまさんの言葉と、スタッフからのお知らせ。新しい記事をそれぞれ3件ずつ。</p><div class="blog-grid">${sources.map(source=>`<article class="blog-card" data-blog-id="${blogEscape(source.id)}"><header><p class="eyebrow">${blogEscape(source.label)}</p><h3>${blogEscape(source.name)}</h3><p class="blog-description">${blogEscape(source.description)}</p></header><div data-blog-articles>${blogArticles(index.get(source.id),source.id)}</div><p class="blog-status" data-blog-status aria-live="polite">${blogStatus(index.get(source.id),true)}</p><a class="text-link" href="${blogEscape(source.url)}" target="_blank" rel="noopener noreferrer">ブログをもっと読む <span aria-hidden="true">↗</span><span class="sr-only">（アメブロ・新しいタブ）</span></a></article>`).join('')}</div><p class="editor-note">記事の公開日を表示しています。「本日」などの表現や日程は、記事が書かれた時点の情報です。最新の案内はリンク先でご確認ください。</p></section>`;
}

export function communityBlogSection(sources, snapshot, limit=3) {
  const source = sources.find(source => source.id === 'osikatutoma');
  if (!source) return '';
  const item = (snapshot.items || []).find(item => item.id === source.id);
  return `<section class="container community-blog" id="club-journal" aria-labelledby="club-journal-title" data-blog-id="${blogEscape(source.id)}" data-blog-limit="${limit===2?2:3}" data-blog-layout="compact"><div class="community-blog-heading"><div><p class="eyebrow">${blogEscape(source.label)}</p><h2 id="club-journal-title">推し活部の活動だより</h2></div><a class="button button-outline" href="${blogEscape(source.url)}" target="_blank" rel="noopener noreferrer">ブログをもっと読む<span class="sr-only">（推し活部のアメブロ・新しいタブ）</span></a></div><p class="community-blog-lead">${blogEscape(source.description)}</p><div data-blog-articles>${blogArticles(item,source.id,{limit,compact:true})}</div><p class="blog-status" data-blog-status aria-live="polite">${blogStatus(item,true)}</p></section>`;
}
