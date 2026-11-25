// Shared language metadata for page generation, navigation and browser matching.
export const locales = [
  {code:'ja',prefix:'',label:'日本語',navigationLabel:'言語の切り替え',ogLocale:'ja_JP'},
  {code:'en',prefix:'/en',label:'English',navigationLabel:'Language',ogLocale:'en_US'},
  {code:'zh-Hans',prefix:'/zh-hans',label:'简体中文',navigationLabel:'切换语言',ogLocale:'zh_CN'},
  {code:'zh-Hant',prefix:'/zh-hant',label:'繁體中文',navigationLabel:'切換語言',ogLocale:'zh_TW'},
];
export const localeFor = language => locales.find(locale=>locale.code===language) || locales[0];
