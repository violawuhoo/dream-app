export interface TarotCard {
  id: number;
  name: string;
  meaning: string;
}

export const cards: TarotCard[] = [
  { id: 0,  name: "The Fool",           meaning: "New beginnings, optimism, trust in life." },
  { id: 1,  name: "The Magician",       meaning: "Action, the power to manifest." },
  { id: 2,  name: "The High Priestess", meaning: "Inaction, going within, the subconscious." },
  { id: 3,  name: "The Empress",        meaning: "Abundance, nurturing, fertility." },
  { id: 4,  name: "The Emperor",        meaning: "Structure, stability, rules and power." },
  { id: 5,  name: "The Hierophant",     meaning: "Institutions, tradition, society and its rules." },
  { id: 6,  name: "The Lovers",         meaning: "Relationships, choices, aligning with values." },
  { id: 7,  name: "The Chariot",        meaning: "Direction, control, willpower." },
  { id: 8,  name: "Strength",           meaning: "Self-control, patience, gentle power." },
  { id: 9,  name: "The Hermit",         meaning: "Analysis, solitude, going within." },
  { id: 10, name: "Wheel of Fortune",   meaning: "Change, fate, fortune." },
  { id: 11, name: "Justice",            meaning: "Cause and effect, clarity, truth." },
  { id: 12, name: "The Hanged Man",     meaning: "Sacrifice, release, a new perspective." },
  { id: 13, name: "Death",              meaning: "Endings, change, transformations." },
  { id: 14, name: "Temperance",         meaning: "Balance, moderation, patience." },
  { id: 15, name: "The Devil",          meaning: "Addiction, enslavement, fears." },
  { id: 16, name: "The Tower",          meaning: "Destruction, abrupt change, lightning strike." },
  { id: 17, name: "The Star",           meaning: "Hope, inspiration, being serene." },
  { id: 18, name: "The Moon",           meaning: "Illusions, fear, anxiety, subconscious." },
  { id: 19, name: "The Sun",            meaning: "Success, happiness, all will be well." },
  { id: 20, name: "Judgement",          meaning: "Rebirth, inner-calling, reckoning." },
  { id: 21, name: "The World",          meaning: "Completion, integration, travel." },
];

export function getRandomTarotCard(): TarotCard {
  return cards[Math.floor(Math.random() * cards.length)];
}

console.assert(cards.length === 22, "Tarot must have 22 cards");
