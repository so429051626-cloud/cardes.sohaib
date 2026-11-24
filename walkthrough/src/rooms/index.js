// Room builders keyed by zone id. Each receives the Zone and places
// furniture, decor and lights from data.
import { buildA, buildB } from './hall.js';
import { buildC, buildD, buildE } from './kitchen.js';
import { buildF, buildF1 } from './master.js';
import { buildG, buildH, buildH1, buildI, buildK, buildM, buildN, buildN1, buildL } from './bedrooms.js';

export const ROOMS = {
  A: buildA, B: buildB, C: buildC, D: buildD, E: buildE, F: buildF, F1: buildF1,
  G: buildG, H: buildH, H1: buildH1, I: buildI, K: buildK, L: buildL, M: buildM, N: buildN, N1: buildN1,
};
