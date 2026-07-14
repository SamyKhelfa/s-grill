const ICONS: Record<string, string> = {
  Sashimis: "🐟",
  Makis: "🍙",
  Sushis: "🍣",
  "Nos specialites": "⭐",
  Entrees: "🥟",
  "Plats du chef": "🍲",
  Brochettes: "🍢",
  Boissons: "🍵",
};

const FALLBACK_ICON = "🍽️";

export function categoryIcon(name: string): string {
  return ICONS[name] ?? FALLBACK_ICON;
}

const ACCENTS = ["shu", "gold"] as const;
export type CategoryAccent = (typeof ACCENTS)[number];

export function categoryAccent(index: number): CategoryAccent {
  return ACCENTS[index % ACCENTS.length];
}
