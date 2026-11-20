const rows = (ends, labels) =>
  ends.map((max, i) => ({ min: i ? ends[i - 1] + 1 : 1, max, value: labels[i] }));
const equal = (labels) =>
  rows(
    labels.map((_, i) => Math.floor(((i + 1) * 100) / labels.length)),
    labels,
  );
const war = [
  'Arrogance',
  'Carelessness',
  'Chaos',
  'Cowardice',
  'Cruel',
  'Cynical',
  'Liar',
  'Deviance',
  'Envy',
  'Fanaticism',
  'Fatalism',
  'Hatred',
  'Heresy',
  'Hypocrisy',
  'Impatience',
  'Laziness',
  'Martyrdom',
  'Pessimism',
  'Prideful',
  'Rebellion',
  'Sarcasm',
  'Superstitious',
  'Tyranny',
  'Yearning',
  'Vainglorious',
];
const peace = [
  'Adaptation',
  'Ambition',
  'Evolution',
  'Authority',
  'Honest',
  'Charity',
  'Compassion',
  'Cunning',
  'Curiosity',
  'Diplomacy',
  'Duty',
  'Ferocity',
  'Gentility',
  'Gravitas',
  'Heroism',
  'Honesty',
  'Humility',
  'Mystery',
  'Love',
  'Romanticism',
  'Skepticism',
  'Sophistication',
  'Spirituality',
  'Security',
  'Wisdom',
];
// Page 30 prints 93–96 followed by 96–100. First printed match resolves 96.
const alignment = (labels) =>
  labels.map((value, i) => ({ min: i === 24 ? 96 : i * 4 + 1, max: i === 24 ? 100 : (i + 1) * 4, value }));
export const CREATION_TABLES = {
  profession: {
    label: 'Profession',
    page: 17,
    rows: equal(['Deceiver', 'Demolition', 'Infiltrator', 'Saboteur', 'Support']),
  },
  stature: { label: 'Stature', page: 23, rows: rows([33, 67, 100], ['Short', 'Average', 'Tall']) },
  build: { label: 'Build', page: 23, rows: equal(['Frail', 'Slender', 'Average', 'Athletic', 'Heavyset']) },
  complexion: {
    label: 'Complexion',
    page: 23,
    rows: equal([
      'Albino',
      'Dark Brown',
      'Dark Tan',
      'Ebony',
      'Fair',
      'Freckled',
      'Light Brown',
      'Light Tan',
      'Pale',
      'Vitiligo',
    ]),
  },
  hairLength: {
    label: 'Hair Length',
    page: 23,
    rows: rows([16, 33, 50, 67, 83, 100], ['Cropped', 'Long', 'Medium', 'Near-Shaved', 'Short', 'Very Long']),
  },
  hairStyle: {
    label: 'Hair Style',
    page: 23,
    rows: rows([16, 33, 50, 67, 83, 100], ['Braided', 'Curly', 'Natural', 'Straight', 'Textured', 'Wavy']),
  },
  hairColor: {
    label: 'Hair Color',
    page: 23,
    rows: equal(['Auburn', 'Black', 'Blonde', 'White/Silver', 'Red']),
  },
  eyes: {
    label: 'Eyes',
    page: 23,
    rows: equal([
      'Bright',
      'Deep-Set',
      'Fiery',
      'Icy',
      'Innocent',
      'Kindly',
      'Large',
      'Mournful',
      'Small',
      'Stormy',
    ]),
  },
  nature: {
    label: 'Chakra Nature',
    page: 29,
    rows: rows(
      [12, 24, 36, 49, 62, 75, 88, 100],
      ['Water', 'Fire', 'Wind', 'Lightning', 'Earth', 'Yin', 'Yang', 'Undiscovered'],
    ),
  },
  war: { label: 'War Alignment', page: 30, rows: alignment(war) },
  peace: { label: 'Peace Alignment', page: 30, rows: alignment(peace) },
};
export const PROFESSION_ATTRIBUTES = {
  Deceiver: 'fellowship',
  Demolition: 'combat',
  Infiltrator: 'perception',
  Saboteur: 'willpower',
  Support: 'intelligence',
};
export function tableResult(key, total) {
  if (!Number.isInteger(total) || total < 1 || total > 100) throw Error('Table rolls must be 1–100.');
  const row = CREATION_TABLES[key]?.rows.find((row) => total >= row.min && total <= row.max);
  if (!row) throw Error('Unknown creation table.');
  return row.value;
}
export const isDraftTechnique = (item) =>
  (item.system ?? {}).configured === false || (item.system ?? {}).contentStatus === 'draft';
export const TECHNIQUE_XP = { E: 100, D: 200, C: 300, B: 400, A: 500, S: 600 };
export function techniqueLearningCost(item, nature) {
  const s = item.system ?? {},
    base = s.xpCost ?? TECHNIQUE_XP[s.jutsuRank];
  if (!Number.isInteger(base) || base < 0) return null;
  const own = String(nature ?? '')
    .toLowerCase()
    .split(/[,/;+]|\band\b/)
    .map((s) => s.trim())
    .filter((s) => s && s !== 'undiscovered');
  const elements = String(s.nature ?? '')
    .toLowerCase()
    .split(/[,/;+]|\band\b/)
    .map((s) => s.trim());
  const discounted = own.some((n) => elements.includes(n));
  return { base, cost: discounted ? Math.ceil(base / 2) : base, discounted };
}
