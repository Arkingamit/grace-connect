/**
 * Typo-Tolerant & Hinglish-Aware Fuzzy Search Utility for Grace Connect
 *
 * Implements:
 * 1. Damerau-Levenshtein Edit Distance (insertions, deletions, substitutions, transpositions)
 * 2. Hinglish Phonetic Normalization (v/w, ee/i, oo/u, sh/s, z/j, dh/d, th/t, silent vowels)
 * 3. Bidirectional Hinglish <-> English Vocabulary Mapping (e.g. prarthna <-> prayer, vachan <-> sermon)
 * 4. Multi-token word scoring with length-adaptive typo thresholds
 * 5. Prefix, Substring, and Cross-Language semantic matching
 * 6. Weighted field scoring (title, preacher/author, category, description, meta, type aliases)
 */

import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/youtube';
import { expandSearchQuery, transliterateToHinglish } from '@/lib/songSearch';

export type SearchItemType =
  | 'sermon'
  | 'series'
  | 'note'
  | 'worship'
  | 'video'
  | 'photo'
  | 'event'
  | 'announcement';

export interface SearchResultItem {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle?: string;
  description?: string;
  date?: string;
  category?: string;
  thumbnail?: string;
  href: string;
  score: number;
  isTypoMatch: boolean;
  raw: any;
}

/**
 * Calculates Damerau-Levenshtein Distance between two strings.
 * Accounts for insertions, deletions, substitutions, and adjacent transpositions.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    const aChar = a[i - 1];
    for (let j = 1; j <= bl; j++) {
      const bChar = b[j - 1];
      const cost = aChar === bChar ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && aChar === b[j - 2] && a[i - 2] === bChar) {
        min = Math.min(min, matrix[i - 2][j - 2] + cost);
      }
      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

/**
 * Normalizes text: trims, lowercases, strips noise characters while keeping letters, digits, and Indic scripts.
 */
export function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text into individual words, filtering out empty strings.
 */
export function tokenize(text?: string): string[] {
  if (!text) return [];
  return normalizeText(text).split(' ').filter(Boolean);
}

function stem(word: string): string {
  if (word.length > 3 && word.endsWith('s')) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Advanced Hinglish Phonetic Normalizer
 * Normalizes Romanized Hindi variations into a canonical phonetic form:
 * - Vowels: ee -> i, oo -> u, aa -> a, ii -> i, uu -> u
 * - Consonants: w -> v, ph -> f, sh -> s, z -> j, kh -> k, dh -> d, th -> t, bh -> b, gh -> g, jh -> j, ch -> c
 * - Schwa deletion / middle unstressed vowel compression (e.g. prarthana -> prarthna, aradhana -> aradhna)
 * - Repeated consonant collapse (e.g. maseeh -> masih, prarthnaa -> prarthna)
 */
export function normalizeHinglish(word: string): string {
  if (!word) return '';
  let w = word.toLowerCase().trim();

  // 1. Double vowels & long vowels -> single vowel
  w = w
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'i')
    .replace(/oo+/g, 'u')
    .replace(/ii+/g, 'i')
    .replace(/uu+/g, 'u');

  // 2. Consonant equivalents in Hinglish phonetics
  w = w
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/sh/g, 's')
    .replace(/z/g, 'j')
    .replace(/kh/g, 'k')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/bh/g, 'b')
    .replace(/gh/g, 'g')
    .replace(/jh/g, 'j')
    .replace(/ch/g, 'c');

  // 3. Repeated identical consonants -> single consonant
  w = w.replace(/(.)\1+/g, '$1');

  // 4. Middle vowel syncope (e.g. "aradhana" -> "aradhna", "prarthana" -> "prarthna", "suchana" -> "suchna")
  w = w.replace(/([bcdfghjklmnpqrstvwxyz])a([bcdfghjklmnpqrstvwxyz][aeiou]?)$/g, '$1$2');

  return w;
}

/**
 * Bilingual Hinglish Christian Vocabulary Dictionary
 * Maps Hinglish terms (and common phonetic misspellings) to English and Hindi concepts.
 */
export const HINGLISH_DICTIONARY: Record<string, string[]> = {
  // --- Worship & Praise ---
  aradhna: ['worship', 'praise', 'song', 'music', 'aaradhna', 'aradhana', 'stuti', 'mahima', 'geet', 'gana'],
  aradhana: ['worship', 'praise', 'song', 'music', 'aaradhna', 'aradhna', 'stuti', 'mahima', 'geet'],
  aaradhna: ['worship', 'praise', 'song', 'music', 'aradhna', 'aradhana', 'stuti'],
  upasna: ['worship', 'praise', 'service', 'upasana', 'aradhna'],
  upasana: ['worship', 'praise', 'service', 'upasna', 'aradhna'],
  stuti: ['praise', 'worship', 'prashansa', 'mahima', 'glory', 'song'],
  mahima: ['glory', 'praise', 'worship', 'stuti', 'honor'],
  prashansa: ['praise', 'worship', 'stuti'],
  dhanyawad: ['thanks', 'thanksgiving', 'dhanyavad', 'shukriya', 'praise', 'gratitude'],
  dhanyavad: ['thanks', 'thanksgiving', 'dhanyawad', 'shukriya', 'praise'],
  shukriya: ['thanks', 'thanksgiving', 'dhanyawad'],
  geet: ['song', 'music', 'worship', 'gana', 'gaana', 'bhajan'],
  git: ['song', 'music', 'worship', 'geet', 'gana'],
  gana: ['song', 'music', 'worship', 'geet', 'gaana'],
  gaana: ['song', 'music', 'worship', 'geet', 'gana'],
  bhajan: ['song', 'worship', 'geet', 'praise'],

  // --- Sermon, Preaching & Word ---
  vachan: ['sermon', 'message', 'preaching', 'word', 'wachan', 'bachan', 'updesh', 'sandesh', 'kalam', 'scripture'],
  wachan: ['sermon', 'message', 'preaching', 'word', 'vachan', 'bachan', 'updesh', 'sandesh'],
  bachan: ['sermon', 'message', 'preaching', 'word', 'vachan', 'wachan', 'updesh'],
  updesh: ['sermon', 'message', 'preaching', 'vachan', 'updes', 'sandesh', 'teaching'],
  updes: ['sermon', 'message', 'preaching', 'vachan', 'updesh'],
  sandesh: ['message', 'sermon', 'preaching', 'vachan', 'sandes'],
  sandes: ['message', 'sermon', 'preaching', 'vachan', 'sandesh'],
  kalam: ['word', 'sermon', 'message', 'scripture', 'vachan'],
  prachar: ['preaching', 'sermon', 'message', 'gospel'],
  shiksha: ['teaching', 'notes', 'lesson', 'study', 'vachan'],

  // --- Prayer ---
  prarthna: ['prayer', 'pray', 'prarthana', 'prathna', 'dua', 'binti', 'vinati', 'intercession'],
  prarthana: ['prayer', 'pray', 'prarthna', 'prathna', 'dua', 'binti', 'vinati'],
  prathna: ['prayer', 'pray', 'prarthna', 'prarthana', 'dua'],
  dua: ['prayer', 'pray', 'prarthna', 'binti'],
  binti: ['prayer', 'request', 'prarthna', 'dua'],
  vinati: ['prayer', 'supplication', 'prarthna'],

  // --- Jesus, God, Savior, Spirit ---
  yeshu: ['jesus', 'christ', 'masih', 'lord', 'yishu', 'eeshu', 'prabhu', 'savior'],
  yishu: ['jesus', 'christ', 'masih', 'yeshu', 'eeshu'],
  eeshu: ['jesus', 'christ', 'masih', 'yeshu'],
  yesu: ['jesus', 'christ', 'yeshu'],
  masih: ['christ', 'jesus', 'yeshu', 'maseeh', 'messiah'],
  maseeh: ['christ', 'jesus', 'yeshu', 'masih'],
  prabhu: ['lord', 'god', 'jesus', 'yeshu', 'parmeshwar', 'master'],
  khuda: ['god', 'lord', 'rab', 'parmeshwar', 'father'],
  parmeshwar: ['god', 'lord', 'almighty', 'prabhu', 'khuda'],
  pavitra: ['holy', 'sacred', 'pure', 'pawitra', 'spirit'],
  pawitra: ['holy', 'sacred', 'pavitra', 'spirit'],
  atma: ['spirit', 'soul', 'aatma', 'holy spirit'],
  aatma: ['spirit', 'soul', 'atma', 'holy spirit'],
  anugrah: ['grace', 'mercy', 'anugraha', 'kripa', 'kirpa', 'blessing'],
  anugraha: ['grace', 'mercy', 'anugrah', 'kripa', 'blessing'],
  kripa: ['grace', 'mercy', 'kirpa', 'krupa', 'anugrah'],
  kirpa: ['grace', 'mercy', 'kripa', 'anugrah'],
  ashish: ['blessing', 'aashish', 'blessed', 'anugrah'],
  aashish: ['blessing', 'ashish', 'blessed'],
  jeevan: ['life', 'jivan', 'living', 'eternal', 'zinda'],
  jivan: ['life', 'jeevan', 'living', 'zinda'],
  zinda: ['alive', 'living', 'jinda', 'resurrection'],
  jinda: ['alive', 'living', 'zinda'],
  vishwas: ['faith', 'belief', 'vishwaas', 'wishwas', 'iman'],
  wishwas: ['faith', 'belief', 'vishwas'],
  vishwaas: ['faith', 'belief', 'vishwas'],
  shanti: ['peace', 'shaanti', 'calm'],
  shaanti: ['peace', 'shanti'],
  anand: ['joy', 'happiness', 'aanand', 'bliss'],
  aanand: ['joy', 'happiness', 'anand'],
  mukti: ['salvation', 'freedom', 'chhutkara', 'uddhar'],
  chhutkara: ['freedom', 'deliverance', 'mukti', 'salvation'],
  uddhar: ['salvation', 'deliverance', 'udhar', 'mukti'],
  udhar: ['salvation', 'deliverance', 'uddhar', 'mukti'],
  kroos: ['cross', 'crucifixion', 'krus'],
  krus: ['cross', 'crucifixion', 'kroos'],
  lahu: ['blood', 'sacrifice', 'lahoo', 'rakt'],
  rakt: ['blood', 'sacrifice', 'lahu'],
  punarutthan: ['resurrection', 'punruthan', 'alive', 'zinda'],
  punruthan: ['resurrection', 'punarutthan', 'alive'],

  // --- Events, Gathering, Fellowship ---
  karyakram: ['event', 'events', 'program', 'gathering', 'utsav', 'sabha', 'service'],
  utsav: ['celebration', 'festival', 'event', 'karyakram'],
  sangati: ['fellowship', 'gathering', 'community', 'sabha', 'milan'],
  sabha: ['meeting', 'service', 'gathering', 'assembly', 'sangati'],
  milan: ['meeting', 'gathering', 'fellowship', 'sangati'],
  samagam: ['convention', 'conference', 'gathering', 'event'],
  sewa: ['service', 'ministry', 'worship', 'help'],

  // --- Announcements & Notices ---
  suchna: ['announcement', 'notice', 'news', 'update', 'suchana', 'sochna', 'samachar'],
  suchana: ['announcement', 'notice', 'news', 'suchna', 'samachar'],
  sochna: ['announcement', 'notice', 'news', 'suchna'],
  samachar: ['news', 'announcement', 'gospel', 'update'],
  ghoshna: ['announcement', 'proclamation', 'declaration'],
  khabar: ['news', 'update', 'announcement'],

  // --- Notes & Study ---
  adhyayan: ['study', 'bible study', 'notes', 'handout', 'lesson'],
  patra: ['handout', 'letter', 'notes', 'bulletin', 'pdf'],
  likhit: ['written', 'notes', 'handout'],

  // --- Photos & Gallery ---
  tasveer: ['photo', 'photos', 'picture', 'pictures', 'gallery', 'album', 'tasvir', 'tasveere'],
  tasvir: ['photo', 'photos', 'picture', 'gallery', 'album', 'tasveer'],
  tasveere: ['photos', 'pictures', 'gallery', 'album', 'tasveeren', 'tasveer'],
  tasveeren: ['photos', 'pictures', 'gallery', 'album', 'tasveere'],
  chitra: ['picture', 'photos', 'gallery', 'image'],

  // --- Youth & Church ---
  yuva: ['youth', 'young adults', 'young', 'jawan'],
  jawan: ['youth', 'young adults', 'yuva'],
  mandli: ['church', 'congregation', 'fellowship', 'campus'],
  girja: ['church', 'campus', 'girjaghar'],
  girjaghar: ['church', 'campus', 'girja'],

  // --- Baptism & Communion ---
  baptisma: ['baptism', 'bapstisma', 'baptize'],
  bapstisma: ['baptism', 'baptisma', 'baptize'],
  roti: ['bread', 'communion', 'prabhu bhoj'],
};

/**
 * Expands Hinglish query tokens into semantic synonyms, English equivalents, and typo corrections.
 */
export function expandHinglishQuery(query: string): string[] {
  const norm = normalizeText(query);
  if (!norm) return [];

  const tokens = norm.split(' ').filter(Boolean);
  const expansions = new Set<string>();

  // Helper to lookup dictionary with exact, normalized, or edit-distance match
  const lookupDictionary = (tok: string) => {
    // 1. Direct key match
    if (HINGLISH_DICTIONARY[tok]) {
      HINGLISH_DICTIONARY[tok].forEach((s) => expansions.add(s));
      return;
    }

    // 2. Hinglish normalized key match
    const tokHing = normalizeHinglish(tok);
    for (const [key, values] of Object.entries(HINGLISH_DICTIONARY)) {
      if (normalizeHinglish(key) === tokHing) {
        values.forEach((s) => expansions.add(s));
        expansions.add(key);
        return;
      }
    }

    // 3. Typo-tolerant dictionary key match (e.g. user typed "prathna" -> matches "prarthna")
    if (tok.length >= 4) {
      let bestDist = Infinity;
      let bestKey: string | null = null;
      for (const key of Object.keys(HINGLISH_DICTIONARY)) {
        const d1 = damerauLevenshtein(tok, key);
        const d2 = damerauLevenshtein(tokHing, normalizeHinglish(key));
        const minD = Math.min(d1, d2);
        if (minD < bestDist && minD <= (tok.length >= 6 ? 2 : 1)) {
          bestDist = minD;
          bestKey = key;
        }
      }

      if (bestKey && HINGLISH_DICTIONARY[bestKey]) {
        HINGLISH_DICTIONARY[bestKey].forEach((s) => expansions.add(s));
        expansions.add(bestKey);
      }
    }
  };

  // Full query lookup
  lookupDictionary(norm);

  // Individual token lookups
  for (const t of tokens) {
    lookupDictionary(t);
  }

  return Array.from(expansions);
}

/**
 * Determines whether a query token matches a target word, allowing Hinglish phonetic variations and typos.
 */
export function matchToken(
  qToken: string,
  tToken: string
): { isMatch: boolean; score: number; isTypo: boolean } {
  if (qToken === tToken) {
    return { isMatch: true, score: 1.0, isTypo: false };
  }

  const qStem = stem(qToken);
  const tStem = stem(tToken);

  if (qStem === tStem || qToken === tStem || qStem === tToken) {
    return { isMatch: true, score: 0.98, isTypo: false };
  }

  // Exact prefix match (e.g. "serm" -> "sermon", "bapt" -> "baptism", "aradh" -> "aradhna")
  if (qToken.length >= 3 && (tToken.startsWith(qToken) || tStem.startsWith(qStem))) {
    const ratio = qToken.length / tToken.length;
    return { isMatch: true, score: 0.92 + 0.06 * ratio, isTypo: false };
  }

  // Exact substring match
  if (qToken.length >= 4 && (tToken.includes(qToken) || tStem.includes(qStem))) {
    const ratio = qToken.length / tToken.length;
    return { isMatch: true, score: 0.88 + 0.05 * ratio, isTypo: false };
  }

  // Phonetic soundalike match in English & Hinglish (e.g. "foto" <-> "photo", "wachan" <-> "vachan")
  const qHing = normalizeHinglish(qStem);
  const tHing = normalizeHinglish(tStem);
  if (qHing === tHing) {
    return { isMatch: true, score: 0.96, isTypo: true };
  }

  // Prefix match on Hinglish normalized tokens
  if (qHing.length >= 3 && tHing.startsWith(qHing)) {
    const ratio = qHing.length / tHing.length;
    return { isMatch: true, score: 0.90 + 0.05 * ratio, isTypo: true };
  }

  // Adaptive typo tolerance based on query token length
  const qLen = qToken.length;
  const tLen = tToken.length;

  if (qLen <= 2) {
    return { isMatch: false, score: 0, isTypo: false };
  }

  // Allow up to 2 edits for words with 5+ chars ONLY if phonetic starting sound matches; otherwise allow at most 1 edit
  const sameStart = qHing[0] === tHing[0] || qToken[0] === tToken[0];
  const maxAllowedDistance = sameStart && (qLen >= 5 || tLen >= 5) ? 2 : 1;

  // Quick length cutoff
  if (
    Math.abs(qLen - tLen) > maxAllowedDistance &&
    Math.abs(qStem.length - tStem.length) > maxAllowedDistance &&
    Math.abs(qHing.length - tHing.length) > maxAllowedDistance
  ) {
    return { isMatch: false, score: 0, isTypo: false };
  }

  // Check distance on raw words, stemmed roots, and Hinglish normalized forms
  const rawDist = damerauLevenshtein(qToken, tToken);
  const stemDist = damerauLevenshtein(qStem, tStem);
  const hingDist = damerauLevenshtein(qHing, tHing);
  const dist = Math.min(rawDist, stemDist, hingDist);

  if (dist <= maxAllowedDistance) {
    const maxLen = Math.max(qLen, tLen, qHing.length, tHing.length);
    const score = 1 - dist / maxLen;
    // Require at least ~60% match similarity
    if (score >= 0.60) {
      return { isMatch: true, score: score * 0.90, isTypo: true };
    }
  }

  return { isMatch: false, score: 0, isTypo: false };
}

/**
 * Matches an expanded dictionary synonym against a target token.
 * Prevents double-blurring (i.e. does not apply loose typos onto already-expanded synonyms).
 */
export function matchSynonymToken(
  vTok: string,
  aTok: string
): { isMatch: boolean; score: number } {
  if (vTok === aTok) return { isMatch: true, score: 0.95 };
  if (stem(vTok) === stem(aTok)) return { isMatch: true, score: 0.92 };
  const vHing = normalizeHinglish(vTok);
  const aHing = normalizeHinglish(aTok);
  if (vHing === aHing) return { isMatch: true, score: 0.90 };
  if (vTok.length >= 4 && (aTok.startsWith(vTok) || vTok.startsWith(aTok))) {
    return { isMatch: true, score: 0.88 };
  }
  return { isMatch: false, score: 0 };
}

export interface MatchableFields {
  title: string;
  subtitle?: string;
  category?: string;
  description?: string;
  meta?: string[];
  typeAlias?: string[];
}

/**
 * Scores an item against a user query, supporting multi-token fuzzy matching, Hinglish synonyms, and typos.
 */
export function scoreItem(
  rawQuery: string,
  fields: MatchableFields
): { isMatch: boolean; score: number; isTypoMatch: boolean } {
  const normQuery = normalizeText(rawQuery);
  if (!normQuery) {
    return { isMatch: true, score: 1.0, isTypoMatch: false };
  }

  // Expand query with multi-script, phonetic & Hinglish variants
  const songVariants = expandSearchQuery(rawQuery);
  const hinglishExpansions = expandHinglishQuery(rawQuery);
  const allVariants = Array.from(new Set([...songVariants, ...hinglishExpansions]));

  const titleNorm = normalizeText(fields.title);
  const fullText = normalizeText(
    `${fields.title} ${fields.subtitle || ''} ${fields.category || ''} ${fields.description || ''} ${(fields.meta || []).join(' ')} ${(fields.typeAlias || []).join(' ')}`
  );

  // 1. Direct full substring match on title
  if (titleNorm.includes(normQuery)) {
    const isExact = titleNorm === normQuery;
    return {
      isMatch: true,
      score: isExact ? 1.0 : 0.95,
      isTypoMatch: false,
    };
  }

  // 2. Direct full substring match across all text
  if (fullText.includes(normQuery)) {
    return {
      isMatch: true,
      score: 0.88,
      isTypoMatch: false,
    };
  }

  // 3. Multi-token fuzzy matching
  const qTokens = tokenize(normQuery);
  if (qTokens.length === 0) return { isMatch: false, score: 0, isTypoMatch: false };

  const titleTokens = tokenize(fields.title);
  const allTokens = tokenize(fullText);

  let totalScore = 0;
  let hasTypo = false;
  let matchedTokensCount = 0;

  for (const qTok of qTokens) {
    let bestTokenScore = 0;
    let tokenIsTypo = false;

    // Check title tokens first (higher weight)
    for (const tTok of titleTokens) {
      const match = matchToken(qTok, tTok);
      if (match.isMatch && match.score > bestTokenScore) {
        bestTokenScore = match.score * 1.15; // 15% title boost
        tokenIsTypo = match.isTypo;
      }
    }

    // Check remaining tokens
    for (const aTok of allTokens) {
      const match = matchToken(qTok, aTok);
      if (match.isMatch && match.score > bestTokenScore) {
        bestTokenScore = match.score;
        tokenIsTypo = match.isTypo;
      }
    }

    // Check Hinglish and multi-script query expansions using strict synonym matching
    if (bestTokenScore < 0.75) {
      for (const variant of allVariants) {
        const vTokens = tokenize(variant);
        for (const vTok of vTokens) {
          for (const aTok of allTokens) {
            const match = matchSynonymToken(vTok, aTok);
            if (match.isMatch && match.score > bestTokenScore) {
              bestTokenScore = match.score;
              tokenIsTypo = true; // Flag as transliteration/Hinglish match
            }
          }
        }
      }
    }

    if (bestTokenScore > 0.5) {
      matchedTokensCount++;
      totalScore += bestTokenScore;
      if (tokenIsTypo) hasTypo = true;
    }
  }

  // Must match ALL tokens (for multi-word queries like "christmas event"),
  // or at least 70% of tokens for longer queries (3+ words)
  const requiredMatches = qTokens.length <= 2 ? qTokens.length : Math.ceil(qTokens.length * 0.70);

  if (matchedTokensCount >= requiredMatches) {
    const finalScore = totalScore / qTokens.length;
    return {
      isMatch: true,
      score: Math.min(finalScore, 0.98),
      isTypoMatch: hasTypo,
    };
  }

  return { isMatch: false, score: 0, isTypoMatch: false };
}
