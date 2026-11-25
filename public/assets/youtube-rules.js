export function liveEnjoymentTitle(title) {
  const normalized=String(title || '').normalize('NFKC');
  return normalized.includes('楽しみ方') && /ライブ|\blive\b/i.test(normalized);
}
