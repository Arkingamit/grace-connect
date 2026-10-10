import Fuse, { type IFuseOptions } from "fuse.js";
import type { WorshipVideo } from "@/lib/types";

// ============================================================================
// 1. Script Detection & Dictionaries
// ============================================================================

export const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
export const GUJARATI_REGEX = /[\u0A80-\u0AFF]/;

export function isDevanagari(text: string): boolean {
  return DEVANAGARI_REGEX.test(text);
}

export function isGujarati(text: string): boolean {
  return GUJARATI_REGEX.test(text);
}

/**
 * High-frequency Christian and Hindi/Gujarati worship vocabulary mapping.
 * Handles colloquial Hinglish, biblical terms, and regional spellings.
 */
const HINDI_WORSHIP_MAP: Record<string, string[]> = {
  // Common worship & biblical terms
  "यीशु": ["yeshu", "eeshu", "yashu", "jesu", "jesus"],
  "येशू": ["yeshu", "eeshu", "yashu", "jesus"],
  "ईसा": ["eesa", "isa", "yeshu"],
  "मसीह": ["masih", "maseeh", "massih", "christ"],
  "प्यार": ["pyar", "pyaar", "prem", "love"],
  "प्रेम": ["prem", "prema", "pyar", "love"],
  "अनुग्रह": ["anugrah", "anugraha", "kripa", "grace"],
  "कृपा": ["kripa", "krupa", "kirpa", "anugrah", "grace"],
  "प्रभु": ["prabhu", "prabu", "lord", "god"],
  "परमेश्वर": ["parmeshwar", "parameshwar", "god"],
  "पिता": ["pita", "abba", "father"],
  "खुदा": ["khuda", "rab", "lord"],
  "रब": ["rab", "rabb", "khuda"],
  "स्तुति": ["stuti", "prashansa", "praise"],
  "आराधना": ["aaradhna", "aradhana", "worship"],
  "महिमा": ["mahima", "glory"],
  "धन्यवाद": ["dhanyawad", "dhanyavad", "shukriya", "thanks"],
  "शुक्रिया": ["shukriya", "dhanyawad", "thanks"],
  "पवित्र": ["pavitra", "pawitra", "holy"],
  "आत्मा": ["aatma", "atma", "spirit"],
  "शांति": ["shanti", "peace"],
  "आनंद": ["aanand", "anand", "joy"],
  "जीवन": ["jeevan", "jivan", "life"],
  "जिंदा": ["zinda", "jinda", "alive"],
  "सामर्थ": ["samarth", "shakti", "power"],
  "शक्ति": ["shakti", "samarth", "power"],
  "राजा": ["raja", "king"],
  "मुक्तिदाता": ["muktidata", "trandata", "savior"],
  "उद्धारकर्ता": ["uddharkarta", "uddhar", "savior"],
  "उद्धार": ["uddhar", "mukti", "salvation"],
  "मुक्ति": ["mukti", "chhutkara", "freedom"],
  "छुटकारा": ["chhutkara", "mukti", "freedom"],
  "विश्वास": ["vishwas", "faith"],
  "आशा": ["aasha", "asha", "hope"],
  "हालेलूयाह": ["hallelujah", "haleluya", "alleluia"],
  "हालेलुयाह": ["hallelujah", "haleluya", "alleluia"],
  "होसन्ना": ["hosanna", "hosana"],
  "क्रूस": ["kroos", "krus", "cross"],
  "लहू": ["lahu", "rakt", "blood"],
  "रक्त": ["rakt", "lahu", "blood"],
  "गीत": ["geet", "gana", "song"],
  "गाना": ["gana", "geet", "song"],
  "गाओ": ["gao", "sing"],
  "गाऊं": ["gaun", "gaao", "sing"],
  "तेरी": ["teri", "tere", "tera"],
  "मेरी": ["meri", "mere", "mera"],
  "हम": ["hum", "ham", "we"],
  "जय": ["jai", "jay", "victory"],
  "विजय": ["vijay", "jeet", "victory"],
  "राजाओं का राजा": ["rajaon ka raja", "king of kings"],
  "प्रभुओं का प्रभु": ["prabhuon ka prabhu", "lord of lords"],
};

const GUJARATI_WORSHIP_MAP: Record<string, string[]> = {
  "ઈસુ": ["isu", "yeshu", "eeshu", "jesus"],
  "ખ્રિસ્ત": ["khrist", "christ", "masih"],
  "પ્રેમ": ["prem", "pyar", "love"],
  "કૃપા": ["krupa", "kripa", "anugrah", "grace"],
  "પ્રભુ": ["prabhu", "prabu", "lord"],
  "ઈશ્વર": ["ishwar", "god"],
  "પિતા": ["pita", "bapa", "father"],
  "સ્તુતિ": ["stuti", "praise"],
  "આરાધના": ["aaradhna", "aradhana", "worship"],
  "મહિમા": ["mahima", "glory"],
  "આભાર": ["aabhar", "dhanyawad", "thanks"],
  "પવિત્ર": ["pavitra", "holy"],
  "આત્મા": ["aatma", "atma", "spirit"],
  "શાંતિ": ["shanti", "peace"],
  "આનંદ": ["aanand", "anand", "joy"],
  "જીવન": ["jeevan", "jivan", "life"],
  "શક્તિ": ["shakti", "power"],
  "રાજા": ["raja", "king"],
  "તારણહાર": ["taranhar", "savior"],
  "તારણ": ["taran", "salvation"],
  "વિશ્વાસ": ["vishwas", "faith"],
  "હાલેલુયાહ": ["hallelujah", "haleluya"],
  "ગીત": ["geet", "song"],
  "ગાઓ": ["gao", "sing"],
  "તારું": ["taaru", "taara", "teri"],
  "મારું": ["maaru", "maara", "meri"],
  "અમે": ["ame", "hum"],
  "જય": ["jay", "jai", "victory"],
};

// Character transliteration tables for phonetics
const DEVANAGARI_CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gya",
  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f",
};

const DEVANAGARI_VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "an", "अः": "ah",
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ँ": "n", "ः": "h",
  "्": "", // Halant: suppresses inherent 'a'
};

const GUJARATI_CONSONANTS: Record<string, string> = {
  "ક": "k", "ખ": "kh", "ગ": "g", "ઘ": "gh", "ઙ": "ng",
  "ચ": "ch", "છ": "chh", "જ": "j", "ઝ": "z", "ઞ": "ny",
  "ટ": "t", "ઠ": "th", "ડ": "d", "ઢ": "dh", "ણ": "n",
  "ત": "t", "થ": "th", "દ": "d", "ધ": "dh", "ન": "n",
  "પ": "p", "ફ": "ph", "બ": "b", "ભ": "bh", "મ": "m",
  "ય": "y", "ર": "r", "લ": "l", "વ": "v", "શ": "sh", "ષ": "sh", "સ": "s", "હ": "h", "ળ": "l",
  "ક્ષ": "ksh", "જ્ઞ": "gna",
};

const GUJARATI_VOWELS: Record<string, string> = {
  "અ": "a", "આ": "aa", "ઇ": "i", "ઈ": "ee", "ઉ": "u", "ઊ": "oo",
  "ઋ": "ri", "એ": "e", "ઐ": "ai", "ઓ": "o", "ઔ": "au", "અં": "an", "અઃ": "ah",
};

const GUJARATI_MATRAS: Record<string, string> = {
  "ા": "a", "િ": "i", "ી": "ee", "ુ": "u", "ૂ": "oo", "ૃ": "ri",
  "ે": "e", "ૈ": "ai", "ો": "o", "ૌ": "au", "ં": "n", "ઃ": "h",
  "્": "",
};

// Reverse Roman to Devanagari / Gujarati dictionary for query expansion
const ROMAN_TO_INDIC_MAP: Record<string, { dev: string; guj: string }> = {
  "yeshu": { dev: "यीशु", guj: "ઈસુ" },
  "yashu": { dev: "यीशु", guj: "ઈસુ" },
  "eeshu": { dev: "यीशु", guj: "ઈસુ" },
  "jesus": { dev: "यीशु", guj: "ઈસુ" },
  "pyar": { dev: "प्यार", guj: "પ્રેમ" },
  "pyaar": { dev: "प्यार", guj: "પ્રેમ" },
  "prem": { dev: "प्रेम", guj: "પ્રેમ" },
  "anugrah": { dev: "अनुग्रह", guj: "કૃપા" },
  "anugraha": { dev: "अनुग्रह", guj: "કૃપા" },
  "kripa": { dev: "कृपा", guj: "કૃપા" },
  "krupa": { dev: "कृपा", guj: "કૃપા" },
  "masih": { dev: "मसीह", guj: "ખ્રિસ્ત" },
  "maseeh": { dev: "मसीह", guj: "ખ્રિસ્ત" },
  "prabhu": { dev: "प्रभु", guj: "પ્રભુ" },
  "prabu": { dev: "प्रभु", guj: "પ્રભુ" },
  "stuti": { dev: "स्तुति", guj: "સ્તુતિ" },
  "aradhana": { dev: "आराधना", guj: "આરાધના" },
  "aaradhna": { dev: "आराधना", guj: "આરાધના" },
  "dhanyawad": { dev: "धन्यवाद", guj: "આભાર" },
  "dhanyavad": { dev: "धन्यवाद", guj: "આભાર" },
  "pavitra": { dev: "पवित्र", guj: "પવિત્ર" },
  "shanti": { dev: "शांति", guj: "શાંતિ" },
  "jeevan": { dev: "जीवन", guj: "જીવન" },
  "jivan": { dev: "जीवन", guj: "જીવન" },
  "zinda": { dev: "जिंदा", guj: "જીવંત" },
  "samarth": { dev: "सामर्थ", guj: "શક્તિ" },
  "raja": { dev: "राजा", guj: "રાજા" },
  "hallelujah": { dev: "हालेलूयाह", guj: "હાલેલુયાહ" },
  "haleluya": { dev: "हालेलूयाह", guj: "હાલેલુયાહ" },
  "geet": { dev: "गीत", guj: "ગીત" },
  "gao": { dev: "गाओ", guj: "ગાઓ" },
  "khuda": { dev: "खुदा", guj: "પ્રભુ" },
  "kroos": { dev: "क्रूस", guj: "ક્રોસ" },
  "krus": { dev: "क्रूस", guj: "ક્રોસ" },
  "lahu": { dev: "लहू", guj: "રક્ત" },
  "mukti": { dev: "मुक्ति", guj: "મુક્તિ" },
  "uddhar": { dev: "उद्धार", guj: "તારણ" },
  "pita": { dev: "पिता", guj: "પિતા" },
  "parmeshwar": { dev: "परमेश्वर", guj: "ઈશ્વર" },
};

// ============================================================================
// 2. Transliteration Functions
// ============================================================================

/**
 * Transliterates Devanagari text into informal phonetic Hinglish.
 */
export function devanagariToHinglish(text: string): string {
  if (!text) return "";

  // 1. Direct word replacements for worship vocabulary
  let result = text;
  for (const [hindiWord, romanVariants] of Object.entries(HINDI_WORSHIP_MAP)) {
    if (result.includes(hindiWord)) {
      result = result.split(hindiWord).join(romanVariants[0] + " ");
    }
  }

  // 2. Character-by-character phonetic conversion
  const chars = Array.from(result);
  let output = "";

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1] || "";

    if (DEVANAGARI_VOWELS[ch]) {
      output += DEVANAGARI_VOWELS[ch];
    } else if (DEVANAGARI_CONSONANTS[ch]) {
      output += DEVANAGARI_CONSONANTS[ch];
      // In Devanagari, consonants have an implicit 'a' unless followed by a matra, halant, or end of word
      if (!DEVANAGARI_MATRAS[next] && next !== "्" && next !== " " && next !== "") {
        output += "a";
      }
    } else if (DEVANAGARI_MATRAS[ch] !== undefined) {
      output += DEVANAGARI_MATRAS[ch];
    } else {
      output += ch;
    }
  }

  return output.replace(/\s+/g, " ").trim();
}

/**
 * Transliterates Gujarati text into informal phonetic Roman (Gujlish/Hinglish).
 */
export function gujaratiToHinglish(text: string): string {
  if (!text) return "";

  // 1. Direct word replacements for Gujarati worship vocabulary
  let result = text;
  for (const [gujWord, romanVariants] of Object.entries(GUJARATI_WORSHIP_MAP)) {
    if (result.includes(gujWord)) {
      result = result.split(gujWord).join(romanVariants[0] + " ");
    }
  }

  // 2. Character-by-character phonetic conversion
  const chars = Array.from(result);
  let output = "";

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1] || "";

    if (GUJARATI_VOWELS[ch]) {
      output += GUJARATI_VOWELS[ch];
    } else if (GUJARATI_CONSONANTS[ch]) {
      output += GUJARATI_CONSONANTS[ch];
      if (!GUJARATI_MATRAS[next] && next !== "્" && next !== " " && next !== "") {
        output += "a";
      }
    } else if (GUJARATI_MATRAS[ch] !== undefined) {
      output += GUJARATI_MATRAS[ch];
    } else {
      output += ch;
    }
  }

  return output.replace(/\s+/g, " ").trim();
}

/**
 * Universal auto-mapper: converts Devanagari or Gujarati to Hinglish Roman text.
 */
export function transliterateToHinglish(text: string): string {
  if (!text) return "";
  let processed = text;
  if (isDevanagari(processed)) {
    processed = devanagariToHinglish(processed);
  }
  if (isGujarati(processed)) {
    processed = gujaratiToHinglish(processed);
  }
  return processed;
}

/**
 * Normalizes Roman phonetic spelling variants in Hinglish (e.g., ee <-> i, oo <-> u, v <-> w, etc.)
 */
export function normalizePhoneticVariants(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase().trim();
  const variants = new Set<string>([lower]);

  // Vowels
  variants.add(lower.replace(/ee/g, "i").replace(/oo/g, "u").replace(/aa/g, "a"));
  variants.add(lower.replace(/i/g, "ee").replace(/u/g, "oo").replace(/a/g, "aa"));

  // Consonants (v <-> w, sh <-> s, z <-> j)
  variants.add(lower.replace(/v/g, "w"));
  variants.add(lower.replace(/w/g, "v"));
  variants.add(lower.replace(/sh/g, "s"));
  variants.add(lower.replace(/z/g, "j"));
  variants.add(lower.replace(/j/g, "z"));

  return Array.from(variants);
}

/**
 * Expands a search query into multi-script and phonetic variants:
 * e.g. "yeshu" -> ["yeshu", "यीशु", "ઈસુ", "eeshu", "yashu", ...]
 */
export function expandSearchQuery(query: string): string[] {
  if (!query) return [];
  const clean = query.trim().toLowerCase();
  const expanded = new Set<string>([clean]);

  // If query is Devanagari or Gujarati, get its Romanized version
  if (isDevanagari(clean) || isGujarati(clean)) {
    const roman = transliterateToHinglish(clean);
    if (roman) expanded.add(roman.toLowerCase());
  } else {
    // If query is Roman / Hinglish, check for mapped Indic terms
    const tokens = clean.split(/\s+/);
    for (const token of tokens) {
      if (ROMAN_TO_INDIC_MAP[token]) {
        expanded.add(ROMAN_TO_INDIC_MAP[token].dev);
        expanded.add(ROMAN_TO_INDIC_MAP[token].guj);
      }
    }

    // Direct multi-word check
    if (ROMAN_TO_INDIC_MAP[clean]) {
      expanded.add(ROMAN_TO_INDIC_MAP[clean].dev);
      expanded.add(ROMAN_TO_INDIC_MAP[clean].guj);
    }

    // Also add normalized phonetics (e.g. yeshu / eeshu, pyar / pyaar)
    for (const v of normalizePhoneticVariants(clean)) {
      expanded.add(v);
    }
  }

  return Array.from(expanded);
}

// ============================================================================
// 3. Enriched Song Document Interface for Fuse.js
// ============================================================================

export interface EnrichedSong<T = WorshipVideo> {
  original: T;
  title: string;
  artist: string;
  album: string;
  categories: string[];
  lyrics?: string;
  // Enriched fields for multi-script & typo-tolerant Bitap matching:
  transliteratedTitle: string;
  transliteratedArtist: string;
  transliteratedLyrics?: string;
  indicTitleKeywords: string[];
  phoneticKeywords: string[];
}

/**
 * Enriches a song item with multi-script transliterations and phonetic variants.
 */
export function enrichSongItem<T extends Partial<WorshipVideo>>(song: T): EnrichedSong<T> {
  const title = song.title || "";
  const artist = song.artist || "";
  const album = song.album || "";
  const categories = song.categories || [];
  const lyrics = (song as any).lyrics || "";

  // Compute transliterated versions
  const transliteratedTitle = transliterateToHinglish(title);
  const transliteratedArtist = transliterateToHinglish(artist);
  const transliteratedLyrics = lyrics ? transliterateToHinglish(lyrics) : "";

  // Extract phonetic & indic keywords
  const indicKeywords: string[] = [];
  const phoneticKeywords: string[] = [];

  // Check Roman tokens in title against reverse map
  const romanTokens = `${transliteratedTitle} ${title}`.toLowerCase().split(/[\s,.-]+/);
  for (const token of romanTokens) {
    if (ROMAN_TO_INDIC_MAP[token]) {
      indicKeywords.push(ROMAN_TO_INDIC_MAP[token].dev);
      indicKeywords.push(ROMAN_TO_INDIC_MAP[token].guj);
    }
    const variants = normalizePhoneticVariants(token);
    phoneticKeywords.push(...variants);
  }

  return {
    original: song as T,
    title,
    artist,
    album,
    categories,
    lyrics,
    transliteratedTitle,
    transliteratedArtist,
    transliteratedLyrics,
    indicTitleKeywords: Array.from(new Set(indicKeywords)),
    phoneticKeywords: Array.from(new Set(phoneticKeywords)),
  };
}

// ============================================================================
// 4. Fuse.js Fuzzy Matching Configuration & Engine
// ============================================================================

export const DEFAULT_FUSE_OPTIONS: IFuseOptions<EnrichedSong<any>> = {
  includeScore: true,
  shouldSort: true,
  // 0.38 allows Bitap typo tolerance (e.g. anugrah <-> anugraha, yeshu <-> yashu)
  threshold: 0.38,
  distance: 100,
  minMatchCharLength: 2,
  ignoreLocation: true,
  useExtendedSearch: false,
  keys: [
    { name: "title", weight: 0.4 },
    { name: "transliteratedTitle", weight: 0.35 },
    { name: "indicTitleKeywords", weight: 0.3 },
    { name: "phoneticKeywords", weight: 0.25 },
    { name: "artist", weight: 0.2 },
    { name: "transliteratedArtist", weight: 0.15 },
    { name: "album", weight: 0.15 },
    { name: "categories", weight: 0.1 },
    { name: "lyrics", weight: 0.1 },
    { name: "transliteratedLyrics", weight: 0.08 },
  ],
};

export class SongSearchEngine<T extends Partial<WorshipVideo>> {
  private enrichedSongs: EnrichedSong<T>[] = [];
  private fuse: Fuse<EnrichedSong<T>>;

  constructor(songs: T[], customOptions?: IFuseOptions<EnrichedSong<T>>) {
    this.enrichedSongs = songs.map(enrichSongItem);
    const options = { ...DEFAULT_FUSE_OPTIONS, ...customOptions } as IFuseOptions<EnrichedSong<T>>;
    this.fuse = new Fuse(this.enrichedSongs, options);
  }

  /**
   * Performs typo-tolerant fuzzy search using the Bitap algorithm across
   * English, Devanagari (Hindi), and Gujarati scripts.
   */
  public search(query: string, maxResults?: number): T[] {
    const q = query.trim();
    if (!q) {
      return this.enrichedSongs.map((s) => s.original);
    }

    // Expand query across scripts (e.g. "yeshu" -> "यीशु", "pyar" -> "प्यार")
    const queryVariants = expandSearchQuery(q);

    // Collect and merge ranked results
    const scoreMap = new Map<T, number>();

    for (const variant of queryVariants) {
      const results = this.fuse.search(variant);
      for (const res of results) {
        const score = res.score ?? 0.5;
        const currentBest = scoreMap.get(res.item.original);
        if (currentBest === undefined || score < currentBest) {
          scoreMap.set(res.item.original, score);
        }
      }
    }

    // Sort by best (lowest) fuzzy matching score
    const sorted = Array.from(scoreMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([song]) => song);

    return maxResults ? sorted.slice(0, maxResults) : sorted;
  }

  /**
   * Replaces current song dataset in memory.
   */
  public updateData(songs: T[]) {
    this.enrichedSongs = songs.map(enrichSongItem);
    this.fuse.setCollection(this.enrichedSongs);
  }
}

/**
 * Standalone search helper for song arrays.
 */
export function searchSongs<T extends Partial<WorshipVideo>>(
  songs: T[],
  query: string,
  options?: IFuseOptions<EnrichedSong<T>>
): T[] {
  if (!query || !query.trim()) return songs;
  const engine = new SongSearchEngine(songs, options);
  return engine.search(query);
}
