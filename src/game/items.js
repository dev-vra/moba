// Shop items (flat stat sticks, one of each, 6 slots) and progression tables.
// stats: atk, hp, speed (mult), armor (damage reduction), crit (chance), steal (lifesteal), haste (cooldown reduction), eregen (energy/s), tower (damage mult vs towers)
export const ITEMS = [
  { id: 'lamina', name: 'Lâmina de Fase', cost: 450, icon: 'M5 27 22 10l4-6 2 2-6 4L5 27Z', stats: { atk: 18 }, desc: '+18 Ataque' },
  { id: 'nucleo', name: 'Núcleo Criogênico', cost: 500, icon: 'M16 3 27 9v14L16 29 5 23V9Zm0 7-5 3v6l5 3 5-3v-6Z', stats: { hp: 340 }, desc: '+340 Vida' },
  { id: 'solas', name: 'Solas Magnéticas', cost: 350, icon: 'M6 22h14l6-4v6H6Zm2-4 4-10h5l1 8', stats: { speed: 0.08 }, desc: '+8% Velocidade' },
  { id: 'celula', name: 'Célula de Íons', cost: 400, icon: 'M11 5h10v3h3v19H8V8h3Zm6 7-4 7h3l-1 5 4-7h-3Z', stats: { eregen: 3.5, haste: 0.1 }, desc: '+70% regeneração de energia · −10% recarga' },
  { id: 'placa', name: 'Placa de Quarentena', cost: 550, icon: 'M16 3 27 7v9c0 7-5 11-11 13C10 27 5 23 5 16V7Z', stats: { armor: 0.14, hp: 120 }, desc: '−14% dano recebido · +120 Vida' },
  { id: 'demolidor', name: 'Demolidor de Antenas', cost: 700, icon: 'M14 4h4l1 9 6 14H7l6-14Zm-3 15h10', stats: { tower: 0.6, hp: 200 }, desc: '+60% dano a torres · +200 Vida' },
  { id: 'sifao', name: 'Sifão de Sinal', cost: 750, icon: 'M16 4c5 6 8 10 8 15a8 8 0 0 1-16 0c0-5 3-9 8-15Zm-3 15a3 3 0 0 0 3 3', stats: { atk: 14, steal: 0.12 }, desc: '+14 Ataque · 12% roubo de vida' },
  { id: 'fio', name: 'Fio Monomolecular', cost: 800, icon: 'M4 28 28 4M9 9l14 14M20 6l6 6M6 20l6 6', stats: { atk: 30, crit: 0.18 }, desc: '+30 Ataque · 18% chance de crítico' },
  { id: 'sobrecarga', name: 'Sobrecarga AXIOM', cost: 900, icon: 'M18 3 7 18h7l-2 11 13-16h-8Z', stats: { atk: 20, haste: 0.22 }, desc: '+20 Ataque · −22% recarga' },
];
export const MAX_LEVEL = 12, ULT_LEVEL = 4, SLOTS = 6;
export const xpNeed = (lvl) => 200 + 95 * (lvl - 1);
export const REWARD = {                         // per kind: xp for being nearby, gold for the last hit
  hoste: [58, 21], saque: [58, 21], drone: [40, 17], arq: [40, 17], eco: [105, 42], cao: [62, 28], faisca: [70, 32], colosso: [300, 130], anciao: [300, 130],
};
export const BASE = { hp: 2200, atk: 118, speed: 7.4, eregen: 5, hpLvl: 165, atkLvl: 8 };
