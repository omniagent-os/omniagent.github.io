/**
 * Lightweight language detector — no external dependencies.
 * Detects language from user text via Unicode script ranges (CJK, Arabic, etc.)
 * and common word frequency scoring for Latin-script languages.
 */

export interface DetectedLanguage {
  code: string;       // ISO 639-1
  name: string;       // English name
  nativeName: string; // Name in the language itself
  flag: string;       // Emoji flag
  systemInstruction: string; // Ready-to-use instruction for the AI
}

const LANG_META: Record<string, Omit<DetectedLanguage, 'code' | 'systemInstruction'>> = {
  en: { name: 'English',    nativeName: 'English',    flag: '🇬🇧' },
  fr: { name: 'French',     nativeName: 'Français',   flag: '🇫🇷' },
  es: { name: 'Spanish',    nativeName: 'Español',    flag: '🇪🇸' },
  de: { name: 'German',     nativeName: 'Deutsch',    flag: '🇩🇪' },
  it: { name: 'Italian',    nativeName: 'Italiano',   flag: '🇮🇹' },
  pt: { name: 'Portuguese', nativeName: 'Português',  flag: '🇧🇷' },
  nl: { name: 'Dutch',      nativeName: 'Nederlands', flag: '🇳🇱' },
  pl: { name: 'Polish',     nativeName: 'Polski',     flag: '🇵🇱' },
  tr: { name: 'Turkish',    nativeName: 'Türkçe',     flag: '🇹🇷' },
  zh: { name: 'Chinese',    nativeName: '中文',        flag: '🇨🇳' },
  ja: { name: 'Japanese',   nativeName: '日本語',      flag: '🇯🇵' },
  ko: { name: 'Korean',     nativeName: '한국어',      flag: '🇰🇷' },
  ar: { name: 'Arabic',     nativeName: 'العربية',    flag: '🇸🇦' },
  ru: { name: 'Russian',    nativeName: 'Русский',    flag: '🇷🇺' },
  hi: { name: 'Hindi',      nativeName: 'हिन्दी',      flag: '🇮🇳' },
};

// Common stopwords / indicator words per language (Latin script only)
const LATIN_PATTERNS: Record<string, string[]> = {
  fr: [
    'je','tu','il','elle','nous','vous','ils','elles','est','sont','les','des',
    'une','qui','que','dans','avec','pour','sur','pas','ne','en','et','ou',
    'mais','donc','car','comment','pourquoi','quoi','très','tout','plus',
    'bien','aussi','même','fait','être','avoir','faire','mon','ma','mes',
    'ton','ta','tes','son','sa','ses','notre','votre','leur','leurs','ce',
    'cette','ces','cet','quand','quel','quelle','comme','si','dont',
  ],
  es: [
    'yo','tu','el','ella','nosotros','ellos','ellas','es','son','los','las',
    'del','una','que','con','para','por','sobre','en','y','o','pero','como',
    'donde','cuando','muy','mas','bien','todo','este','esta','estos','estas',
    'ese','ser','estar','hacer','tener','hay','no','si','también','porque',
    'ese','esa','eso','cuándo','quién','qué','cómo','cuál',
  ],
  de: [
    'ich','du','er','sie','wir','ihr','ist','sind','die','der','das','den',
    'dem','des','ein','eine','nicht','und','oder','aber','wie','wo','wann',
    'auch','sehr','gut','mit','von','auf','für','zu','an','in','im','bei',
    'nach','aus','durch','noch','schon','sich','haben','sein','werden',
    'können','machen','wenn','dann','hier','dort','ja','nein','was','wer',
  ],
  it: [
    'io','tu','lui','lei','noi','voi','loro','sono','il','lo','la','gli',
    'le','un','una','del','della','che','con','per','su','in','e','o','ma',
    'come','dove','quando','molto','tutto','anche','questo','questa','questi',
    'queste','essere','avere','fare','non','più','bene','questo','quella',
    'però','perché','così','già','se','chi','cosa',
  ],
  pt: [
    'eu','tu','ele','ela','nós','eles','elas','é','são','os','as','um','uma',
    'que','com','para','por','sobre','em','e','ou','mas','como','onde',
    'quando','muito','tudo','também','este','esta','estes','estas','esse',
    'ser','estar','fazer','ter','não','mais','bem','já','se','quem','porque',
    'isso','aqui','você','vocês','meu','minha','seu','sua',
  ],
  nl: [
    'ik','jij','hij','zij','wij','jullie','is','zijn','de','het','een','van',
    'in','op','met','voor','naar','en','of','maar','hoe','waar','wanneer',
    'ook','niet','wel','nog','al','dit','dat','deze','die','hebben','worden',
    'kunnen','maken','hier','daar','ja','nee','wat','wie','waarom',
  ],
  pl: [
    'ja','ty','on','ona','my','wy','oni','jest','są','nie','tak','ale','czy',
    'jak','gdzie','kiedy','co','który','która','które','tego','tej','tym',
    'przez','więcej','już','jeszcze','tylko','też','bardzo','dobrze','ten',
    'ta','to','się','być','mieć','robić','że','po','na','do','od','przy',
  ],
  tr: [
    'ben','sen','o','biz','siz','onlar','bu','şu','bir','ile','için','ve',
    'da','de','mi','mu','mı','çok','daha','iyi','nasıl','nerede','ne',
    'olan','var','yok','ama','her','gibi','kadar','sonra','önce','ise',
  ],
};

function buildResult(code: string): DetectedLanguage {
  const meta = LANG_META[code] ?? LANG_META['en'];
  return {
    code,
    ...meta,
    systemInstruction: buildInstruction(code, meta.name, meta.nativeName),
  };
}

function buildInstruction(code: string, name: string, nativeName: string): string {
  if (code === 'en') {
    return 'Respond in English. Be clear, concise, and thorough.';
  }
  return (
    `IMPORTANT: The user is writing in ${name} (${nativeName}). ` +
    `You MUST respond exclusively in ${name}. ` +
    `Every word of your response — including technical terms, examples, and code comments — ` +
    `must be in ${name}. Do not switch to English or any other language under any circumstances. ` +
    `Maintain ${name} throughout the entire conversation.`
  );
}

/**
 * Detect the language of `text`.
 * Returns an object with code, name, flag, and a ready-to-use AI system instruction.
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length < 3) return buildResult('en');

  // ── Non-Latin script detection (fast, Unicode ranges) ──────────────
  if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text)) return buildResult('zh');
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text))                return buildResult('ja');
  if (/[\uac00-\ud7af]/.test(text))                             return buildResult('ko');
  if (/[\u0600-\u06ff\u0750-\u077f]/.test(text))                return buildResult('ar');
  if (/[\u0400-\u04ff]/.test(text))                             return buildResult('ru');
  if (/[\u0900-\u097f]/.test(text))                             return buildResult('hi');

  // ── Latin-script scoring ────────────────────────────────────────────
  const words = text.toLowerCase().match(/\b[a-zàáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿœšžß]{2,}\b/g) ?? [];

  if (words.length === 0) return buildResult('en');

  const scores: Record<string, number> = {};
  for (const word of words) {
    for (const [lang, list] of Object.entries(LATIN_PATTERNS)) {
      if (list.includes(word)) {
        scores[lang] = (scores[lang] ?? 0) + 1;
      }
    }
  }

  // Need at least 2 matching words to be confident
  const winner = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .find(([, score]) => score >= 2);

  return buildResult(winner ? winner[0] : 'en');
}

/** Returns the emoji flag for a language code (fallback 🌐) */
export function langFlag(code: string): string {
  return LANG_META[code]?.flag ?? '🌐';
}

export const DEFAULT_LANGUAGE = buildResult('en');
