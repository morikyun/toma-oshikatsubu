import {createTranslator} from '../../public/assets/locale-core.js';
// Japanese pages keep the existing rendered fragments and paths unchanged.
export const japaneseLocale={translate:createTranslator({}, {},'ja').text,localizeFragment:value=>value,localPath:value=>value};
