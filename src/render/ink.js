// Objetos com traço HQ forte (heróis, mobs, minions, torres). O resto do mundo recebe traço leve.
export const HEAVY = new Set();
export const inkHeavy = (o) => { HEAVY.add(o); return o; };
