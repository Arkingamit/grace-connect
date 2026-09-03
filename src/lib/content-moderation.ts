/**
 * Objectionable-content screening for member-submitted text (App Store
 * guideline 1.2). Anything flagged here is rejected before it is stored, on top
 * of the moderator approval every prayer request already goes through.
 */

/**
 * Slurs, explicit sexual content, and profanity.
 *
 * Deliberately excludes words with genuine pastoral use — a member may ask for
 * prayer about suicide, abuse, or illness, and those requests must go through.
 * Moderator approval is the second line of defence for anything borderline.
 */
const BLOCKED_TERMS = [
  'anal', 'arsehole', 'asshole', 'bastard', 'bestiality', 'bitch', 'blowjob',
  'bollocks', 'bukkake', 'chink', 'clit', 'cocksucker', 'coon', 'cunt',
  'dildo', 'dyke', 'fag', 'faggot', 'fellatio', 'fuck', 'fucker',
  'fucking', 'gangbang', 'handjob', 'hentai', 'jerkoff', 'jizz', 'kike',
  'kys', 'masturbate', 'motherfucker', 'nigga', 'nigger',
  'paki', 'pedo', 'porn', 'porno', 'pussy',
  'retard', 'rimjob', 'shit', 'slut', 'spic',
  'threesome', 'tits', 'towelhead', 'tranny', 'twat', 'whore',
  'wank', 'wetback',
];

/** Direct threats and harassment that may not contain a single blocked word. */
const BLOCKED_PHRASES = [
  'kill yourself',
  'kill you',
  'i will kill',
  'go die',
  'you should die',
  'hope you die',
  'burn in hell',
];

/** Leetspeak folding (sh1t, f@g) while keeping punctuation so word boundaries survive. */
function foldLeetspeak(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches a term at word boundaries, tolerating separators between its letters
 * (f.u.c.k, f-u-c-k) and common suffixes. Boundaries are what keep innocent
 * words such as "Scunthorpe" or "assassin" from being flagged.
 */
function buildTermPattern(term: string): RegExp {
  const spaced = term
    .split('')
    .map(escapeRegex)
    .join('[\\W_]*');
  return new RegExp(`\\b${spaced}(?:s|es|ed|er|ers|ing|in)?\\b`, 'i');
}

const TERM_PATTERNS = BLOCKED_TERMS.map((term) => ({ term, pattern: buildTermPattern(term) }));

const PHRASE_PATTERNS = BLOCKED_PHRASES.map((phrase) => ({
  term: phrase,
  pattern: new RegExp(phrase.split(/\s+/).map(escapeRegex).join('[\\W_]+'), 'i'),
}));

export interface ModerationResult {
  ok: boolean;
  /** Member-facing reason. Never echoes the matched term back. */
  reason?: string;
  /** Matched terms, for the moderation log only. */
  matches?: string[];
}

export function screenContent(...parts: Array<string | undefined | null>): ModerationResult {
  const raw = parts.filter(Boolean).join(' ');
  if (!raw.trim()) return { ok: true };

  const folded = foldLeetspeak(raw);
  const matches = [...TERM_PATTERNS, ...PHRASE_PATTERNS]
    .filter(({ pattern }) => pattern.test(folded))
    .map(({ term }) => term);

  if (matches.length === 0) return { ok: true };

  return {
    ok: false,
    reason:
      'This submission looks like it contains offensive or abusive language. ' +
      'Grace Connect has zero tolerance for objectionable content. Please reword it and try again.',
    matches,
  };
}
