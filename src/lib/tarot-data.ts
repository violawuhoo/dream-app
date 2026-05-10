export interface TarotCard {
  name: string;
  arcana: "Major" | "Minor";
  meaning: string;
  image: string;
}

export const TAROT_CARDS: TarotCard[] = [
  { name: "The Fool", arcana: "Major", meaning: "New beginnings, optimism, trust in life.", image: "/images/tarot/cards/00_THE_FOOL.png" },
  { name: "The Magician", arcana: "Major", meaning: "Action, the power to manifest.", image: "/images/tarot/cards/01_THE_MAGICIAN.png" },
  { name: "The High Priestess", arcana: "Major", meaning: "Inaction, going within, the subconscious.", image: "/images/tarot/cards/02_THE_HIGH_PRIESTESS.png" },
  { name: "The Empress", arcana: "Major", meaning: "Abundance, nurturing, fertility.", image: "/images/tarot/cards/03_THE_EMPRESS.png" },
  { name: "The Emperor", arcana: "Major", meaning: "Structure, stability, rules and power.", image: "/images/tarot/cards/04_THE_EMPEROR.png" },
  { name: "The Hierophant", arcana: "Major", meaning: "Institutions, tradition, society and its rules.", image: "/images/tarot/cards/05_THE_HIEROPHANT.png" },
  { name: "The Lovers", arcana: "Major", meaning: "Relationships, choices, aligning with values.", image: "/images/tarot/cards/06_THE_LOVERS.png" },
  { name: "The Chariot", arcana: "Major", meaning: "Direction, control, willpower.", image: "/images/tarot/cards/07_THE_CHARIOT.png" },
  { name: "Strength", arcana: "Major", meaning: "Self-control, patience, gentle power.", image: "/images/tarot/cards/08_STRENGTH.png" },
  { name: "The Hermit", arcana: "Major", meaning: "Analysis, solitude, going within.", image: "/images/tarot/cards/09_THE_HERMIT.png" },
  { name: "Wheel of Fortune", arcana: "Major", meaning: "Change, fate, fortune.", image: "/images/tarot/cards/10_WHEEL_OF_FORTUNE.png" },
  { name: "Justice", arcana: "Major", meaning: "Cause and effect, clarity, truth.", image: "/images/tarot/cards/11_JUSTICE.png" },
  { name: "The Hanged Man", arcana: "Major", meaning: "Sacrifice, release, a new perspective.", image: "/images/tarot/cards/12_THE_HANGED_MAN.png" },
  { name: "Death", arcana: "Major", meaning: "Endings, change, transformations.", image: "/images/tarot/cards/13_DEATH.png" },
  { name: "Temperance", arcana: "Major", meaning: "Balance, moderation, patience.", image: "/images/tarot/cards/14_TEMPERANCE.png" },
  { name: "The Devil", arcana: "Major", meaning: "Addiction, enslavement, fears.", image: "/images/tarot/cards/15_THE_DEVIL.png" },
  { name: "The Tower", arcana: "Major", meaning: "Destruction, abrupt change, lightning strike.", image: "/images/tarot/cards/16_THE_TOWER.png" },
  { name: "The Star", arcana: "Major", meaning: "Hope, inspiration, being serene.", image: "/images/tarot/cards/17_THE_STAR.png" },
  { name: "The Moon", arcana: "Major", meaning: "Illusions, fear, anxiety, subconscious.", image: "/images/tarot/cards/18_THE_MOON.png" },
  { name: "The Sun", arcana: "Major", meaning: "Success, happiness, all will be well.", image: "/images/tarot/cards/19_THE_SUN.png" },
  { name: "Judgement", arcana: "Major", meaning: "Rebirth, inner-calling, reckoning.", image: "/images/tarot/cards/20_JUDGEMENT.png" },
  { name: "The World", arcana: "Major", meaning: "Completion, integration, travel.", image: "/images/tarot/cards/21_THE_WORLD.png" },
];

export function getRandomTarotCard(): TarotCard {
  return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
}
