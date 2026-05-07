export interface TarotCard {
  name: string;
  arcana: "Major" | "Minor";
  meaning: string;
}

export const TAROT_CARDS: TarotCard[] = [
  { name: "The Fool", arcana: "Major", meaning: "New beginnings, optimism, trust in life." },
  { name: "The Magician", arcana: "Major", meaning: "Action, the power to manifest." },
  { name: "The High Priestess", arcana: "Major", meaning: "Inaction, going within, the subconscious." },
  { name: "The Empress", arcana: "Major", meaning: "Abundance, nurturing, fertility." },
  { name: "The Emperor", arcana: "Major", meaning: "Structure, stability, rules and power." },
  { name: "The Hierophant", arcana: "Major", meaning: "Institutions, tradition, society and its rules." },
  { name: "The Lovers", arcana: "Major", meaning: "Relationships, choices, aligning with values." },
  { name: "The Chariot", arcana: "Major", meaning: "Direction, control, willpower." },
  { name: "Strength", arcana: "Major", meaning: "Self-control, patience, gentle power." },
  { name: "The Hermit", arcana: "Major", meaning: "Analysis, solitude, going within." },
  { name: "Wheel of Fortune", arcana: "Major", meaning: "Change, fate, fortune." },
  { name: "Justice", arcana: "Major", meaning: "Cause and effect, clarity, truth." },
  { name: "The Hanged Man", arcana: "Major", meaning: "Sacrifice, release, a new perspective." },
  { name: "Death", arcana: "Major", meaning: "Endings, change, transformations." },
  { name: "Temperance", arcana: "Major", meaning: "Balance, moderation, patience." },
  { name: "The Devil", arcana: "Major", meaning: "Addiction, enslavement, fears." },
  { name: "The Tower", arcana: "Major", meaning: "Destruction, abrupt change, lightning strike." },
  { name: "The Star", arcana: "Major", meaning: "Hope, inspiration, being serene." },
  { name: "The Moon", arcana: "Major", meaning: "Illusions, fear, anxiety, subconscious." },
  { name: "The Sun", arcana: "Major", meaning: "Success, happiness, all will be well." },
  { name: "Judgement", arcana: "Major", meaning: "Rebirth, inner-calling, reckoning." },
  { name: "The World", arcana: "Major", meaning: "Completion, integration, travel." },
];

export function getRandomTarotCard(): TarotCard {
  return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
}
