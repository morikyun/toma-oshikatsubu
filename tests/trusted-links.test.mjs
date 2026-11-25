import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {checkTrustedLinks} from '../scripts/trusted-links.mjs';

const read = async name => JSON.parse(await fs.readFile(new URL('../content/' + name + '.json', import.meta.url), 'utf8'));
const [site, privacy, channels] = await Promise.all(['site', 'privacy', 'channels'].map(read));
const content = () => structuredClone({site, privacy, channels});

test('approved links and Japanese handles pass, including stable channel ID URLs', () => {
  checkTrustedLinks(content());
  const input = content();
  input.channels = input.channels.map(channel => ({...channel, url: 'https://www.youtube.com/channel/' + channel.channelId}));
  checkTrustedLinks(input);
});

test('form replacements on the same provider and official link changes stop publication', () => {
  const contact = content();
  contact.privacy.contactUrl = contact.privacy.contactUrl.replace('/d/e/', '/d/e/different-');
  assert.throws(() => checkTrustedLinks(contact), /お問い合わせフォーム/);
  const membership = content();
  membership.site.membership.url = 'https://ws.formzu.net/sfgen/S000000000/';
  assert.throws(() => checkTrustedLinks(membership), /入部フォーム/);
  for (const key of Object.keys(site.links)) {
    const input = content();
    input.site.links[key] = 'https://example.org/replacement';
    assert.throws(() => checkTrustedLinks(input), /公式・運営リンク/, key);
  }
  const added = content();
  added.site.links.newDestination = 'https://example.org/';
  assert.throws(() => checkTrustedLinks(added), /公式・運営リンク/);
});

test('matching handles on lookalike domains, HTTP, ports and credential URLs are rejected', () => {
  const handlePath = '/@' + channels[0].handle;
  for (const origin of [
    'https://example.org',
    'https://www.youtube.com.example.org',
    'https://www.youtube.com@example.org',
    'https://example.org@www.youtube.com',
    'https://user:password@www.youtube.com',
    'http://www.youtube.com',
    'https://www.youtube.com:8443',
    'https://www.youtubе.com'
  ]) {
    const input = content();
    input.channels[0].url = origin + handlePath;
    assert.throws(() => checkTrustedLinks(input), /チャンネル/, origin);
  }
});

test('unexpected channel paths, queries and fragments are rejected on the real domain', () => {
  for (const path of ['/redirect?q=https://example.org', '/@someone-else', '/channel/UC' + 'x'.repeat(22), '/@' + channels[0].handle + '?redirect=example.org', '/@' + channels[0].handle + '#anything']) {
    const input = content();
    input.channels[0].url = 'https://www.youtube.com' + path;
    assert.throws(() => checkTrustedLinks(input), /チャンネル/);
  }
});
