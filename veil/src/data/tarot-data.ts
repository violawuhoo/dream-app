export interface TarotCard {
  id: number;
  name: string;
  meaning: string;
  image: ReturnType<typeof require>;
}

export const cards: TarotCard[] = [
  { id: 0,  name: "The Fool",           meaning: "New beginnings, optimism, trust in life.",           image: require("../../assets/tarot/cards/00_THE_FOOL.png") },
  { id: 1,  name: "The Magician",       meaning: "Action, the power to manifest.",                     image: require("../../assets/tarot/cards/01_THE_MAGICIAN.png") },
  { id: 2,  name: "The High Priestess", meaning: "Inaction, going within, the subconscious.",          image: require("../../assets/tarot/cards/02_THE_HIGH_PRIESTESS.png") },
  { id: 3,  name: "The Empress",        meaning: "Abundance, nurturing, fertility.",                   image: require("../../assets/tarot/cards/03_THE_EMPRESS.png") },
  { id: 4,  name: "The Emperor",        meaning: "Structure, stability, rules and power.",             image: require("../../assets/tarot/cards/04_THE_EMPEROR.png") },
  { id: 5,  name: "The Hierophant",     meaning: "Institutions, tradition, society and its rules.",    image: require("../../assets/tarot/cards/05_THE_HIEROPHANT.png") },
  { id: 6,  name: "The Lovers",         meaning: "Relationships, choices, aligning with values.",      image: require("../../assets/tarot/cards/06_THE_LOVERS.png") },
  { id: 7,  name: "The Chariot",        meaning: "Direction, control, willpower.",                     image: require("../../assets/tarot/cards/07_THE_CHARIOT.png") },
  { id: 8,  name: "Strength",           meaning: "Self-control, patience, gentle power.",              image: require("../../assets/tarot/cards/08_STRENGTH.png") },
  { id: 9,  name: "The Hermit",         meaning: "Analysis, solitude, going within.",                  image: require("../../assets/tarot/cards/09_THE_HERMIT.png") },
  { id: 10, name: "Wheel of Fortune",   meaning: "Change, fate, fortune.",                             image: require("../../assets/tarot/cards/10_WHEEL_OF_FORTUNE.png") },
  { id: 11, name: "Justice",            meaning: "Cause and effect, clarity, truth.",                  image: require("../../assets/tarot/cards/11_JUSTICE.png") },
  { id: 12, name: "The Hanged Man",     meaning: "Sacrifice, release, a new perspective.",             image: require("../../assets/tarot/cards/12_THE_HANGED_MAN.png") },
  { id: 13, name: "Death",              meaning: "Endings, change, transformations.",                  image: require("../../assets/tarot/cards/13_DEATH.png") },
  { id: 14, name: "Temperance",         meaning: "Balance, moderation, patience.",                     image: require("../../assets/tarot/cards/14_TEMPERANCE.png") },
  { id: 15, name: "The Devil",          meaning: "Addiction, enslavement, fears.",                     image: require("../../assets/tarot/cards/15_THE_DEVIL.png") },
  { id: 16, name: "The Tower",          meaning: "Destruction, abrupt change, lightning strike.",      image: require("../../assets/tarot/cards/16_THE_TOWER.png") },
  { id: 17, name: "The Star",           meaning: "Hope, inspiration, being serene.",                   image: require("../../assets/tarot/cards/17_THE_STAR.png") },
  { id: 18, name: "The Moon",           meaning: "Illusions, fear, anxiety, subconscious.",            image: require("../../assets/tarot/cards/18_THE_MOON.png") },
  { id: 19, name: "The Sun",            meaning: "Success, happiness, all will be well.",              image: require("../../assets/tarot/cards/19_THE_SUN.png") },
  { id: 20, name: "Judgement",          meaning: "Rebirth, inner-calling, reckoning.",                 image: require("../../assets/tarot/cards/20_JUDGEMENT.png") },
  { id: 21, name: "The World",          meaning: "Completion, integration, travel.",                   image: require("../../assets/tarot/cards/21_THE_WORLD.png") },
];

export const CARD_BACK = require("../../assets/tarot/tarot_card_back.png");

export function getRandomTarotCard(): TarotCard {
  return cards[Math.floor(Math.random() * cards.length)];
}

console.assert(cards.length === 22, "Tarot must have 22 cards");
