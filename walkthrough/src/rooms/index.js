// Room builders keyed by zone id. Each receives the Zone and places
// furniture, decor and lights from data.
import { daylight } from './common.js';
import { buildA, buildB } from './hall.js';
import { buildC, buildD, buildE } from './kitchen.js';

const basic = (o) => (z) => daylight(z, o);

export const ROOMS = {
  A: buildA, B: buildB, C: buildC, D: buildD, E: buildE,
  F: basic(), F1: basic({ sun: false }),
  G: basic({ sun: false }), H: basic(), H1: () => {}, I: basic(), K: basic(), L: basic(), M: basic(), N: basic(), N1: basic({ sun: false }),
};
