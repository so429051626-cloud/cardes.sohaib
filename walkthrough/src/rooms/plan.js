// Floor plan (section 6). Plan axes: +X east, +Y north; three.js x = X, z = -Y.
// Coordinates are inner wall faces. Zero-thickness shared faces in the brief
// (A|B, B|C, B|E, E|F) were given a 0.15 m wall by moving the smaller room's
// face, see DECISIONS.md.

export const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

const WALL = '#EAE9E6';
const CEIL = '#F3F3F1';

export const ZONES = [
  {
    id: 'A', name: 'الاستقبال', poly: rect(0, 7, -6, -0.15), h: 3.15,
    floor: 'recFloor', wallC: '#8C9691', ceilC: CEIL, ext: ['W', 'S', 'E'],
    ceil: { h0: 3.0, fields: [{ inset: 0.6, h1: 3.15, cove: { c: '#ffe2bf', i: 1.0 } }] },
    windows: [
      { side: 'W', a: -5.75, b: -0.45, sill: 0, head: 2.95, mull: 1.1, drape: false },
      { side: 'S', a: 0.35, b: 6.6, sill: 0, head: 2.95, mull: 1.25, drape: false },
    ],
  },
  {
    id: 'B', name: 'الصالة', poly: rect(0, 7, 0, 15), h: 3.2,
    floor: 'creamFloor', wallC: WALL, ceilC: CEIL, ext: ['N'],
    ceil: { h0: 2.95, fields: [{ inset: 0.55, h1: 3.2, coveSides: ['W', 'E'], cove: { c: '#ffd9ae', i: 1.1 } }] },
    windows: [{ side: 'N', a: 0.25, b: 6.75, sill: 0, head: 2.95, mull: 1.3, sheer: true, drape: true }],
    probe: [3.5, 7.5, 1.6],
    sub: [{ y0: 8.6, name: 'السفرة' }],
  },
  {
    id: 'C', name: 'المطبخ', poly: rect(-6, -0.15, 9, 15), h: 3.15,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['W'],
    ceil: { h0: 3.0, fields: [{ rect: [-5.2, -0.8, 10, 14], h1: 3.15, cove: { c: '#eef3fb', i: 0.8 } }] },
    windows: [{ side: 'W', a: 10.2, b: 11.6, sill: 1.05, head: 2.05, mull: 0 }],
    probe: [-3.0, 12.0, 1.6],
  },
  {
    id: 'D', name: 'غرفة المؤونة', poly: rect(-6, -0.6, 15.15, 17.35), h: 2.8,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['N', 'W', 'E'],
    ceil: { h0: 2.8 },
    windows: [{ side: 'E', a: 15.85, b: 16.65, sill: 1.3, head: 1.9, mull: 0 }],
  },
  {
    id: 'E', name: 'مدخل الجناح', poly: rect(-3, -0.15, 3.6, 8.85), h: 2.8,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: [],
    ceil: { h0: 2.8 },
    windows: [],
  },
  {
    id: 'F', name: 'الجناح الرئيسي', poly: rect(-9.5, -3.15, -0.5, 6.1), h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['W', 'S'],
    ceil: { h0: 2.85, fields: [{ inset: 0.5, h1: 3.0, cove: { c: '#fff2e2', i: 0.9 } }] },
    windows: [
      { side: 'W', a: -0.3, b: 0.7, sill: 0, head: 2.8, mull: 0, sheer: true, drape: true },
      { side: 'W', a: 4.9, b: 5.9, sill: 0, head: 2.8, mull: 0, sheer: true, drape: true },
    ],
    probe: [-6.3, 2.8, 1.6],
  },
  {
    id: 'F1', name: 'حمام الجناح', poly: rect(-9.5, -6.6, 6.25, 8.85), h: 2.7,
    floor: 'bathFloor', wallMat: 'wallTile', wallC: '#ffffff', ceilC: CEIL, ext: ['W', 'N'],
    ceil: { h0: 2.7 },
    windows: [{ side: 'W', a: 7.75, b: 8.45, sill: 1.75, head: 2.3, mull: 0 }],
    probe: [-8.0, 7.5, 1.5],
  },
  {
    id: 'G', name: 'الممر', poly: rect(7.15, 31, 8.6, 10.2), h: 2.8,
    floor: 'marbleFloorL', wallC: WALL, ceilC: CEIL, ext: ['E'],
    ceil: { h0: 2.8 },
    windows: [{ side: 'E', a: 8.8, b: 10.0, sill: 0.6, head: 2.2, mull: 0, sheer: true }],
    probe: [16.0, 9.4, 1.5],
    probes: [[11, 9.4], [19, 9.4], [27, 9.4]],
  },
  {
    id: 'H', name: 'غرفة نوم 2', poly: [[7.15, 3.55], [11.8, 3.55], [11.8, 6.1], [9.75, 6.1], [9.75, 8.45], [7.15, 8.45]], h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['S'],
    ceil: { h0: 3.0 },
    windows: [{ side: 'S', a: 7.35, b: 8.25, sill: 0, head: 2.85, mull: 0, sheer: true, drape: true }],
    probe: [9.0, 5.2, 1.6],
  },
  {
    id: 'H1', name: 'الحمّام', poly: rect(9.9, 11.8, 6.25, 8.45), h: 2.7,
    floor: 'bathFloor', wallMat: 'wallTile', wallC: '#ffffff', ceilC: CEIL, ext: [],
    ceil: { h0: 2.7 },
    windows: [],
  },
  {
    id: 'I', name: 'غرفة نوم 3', poly: rect(9.6, 14.4, 10.35, 15.4), h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['N'],
    ceil: { h0: 3.0 },
    windows: [{ side: 'N', a: 12.05, b: 12.5, sill: 0, head: 2.85, mull: 0, drape: true }],
  },
  {
    id: 'K', name: 'غرفة نوم 4', poly: rect(16.0, 20.8, 3.55, 8.45), h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['S'],
    ceil: { h0: 3.0 },
    windows: [{ side: 'S', a: 17.45, b: 18.05, sill: 0, head: 2.85, mull: 0, drape: true }],
  },
  {
    id: 'L', name: 'المكتب', poly: rect(16.4, 22.6, 10.35, 15.4), h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['N'],
    ceil: { h0: 3.0 },
    windows: [{ side: 'N', a: 16.8, b: 19.6, sill: 0, head: 2.85, mull: 1.4, sheer: true, drape: true }],
  },
  {
    id: 'M', name: 'غرفة نوم 5', poly: rect(24.6, 29.4, 3.55, 8.45), h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['S'],
    ceil: { h0: 3.0 },
    windows: [{ side: 'S', a: 24.75, b: 25.5, sill: 0, head: 2.85, mull: 0, sheer: true, drape: true }],
  },
  {
    id: 'N', name: 'غرفة نوم 6', poly: [[25.8, 10.35], [31, 10.35], [31, 12.65], [28.65, 12.65], [28.65, 15.4], [25.8, 15.4]], h: 3.0,
    floor: 'marbleFloor', wallC: WALL, ceilC: CEIL, ext: ['E', 'N'],
    ceil: { h0: 3.0 },
    windows: [{ side: 'E', a: 10.5, b: 12.5, sill: 0, head: 2.85, mull: 1.0, sheer: true, drape: true }],
    probe: [27.2, 12.6, 1.6],
  },
  {
    id: 'N1', name: 'الحمّام', poly: rect(28.8, 31, 12.8, 15.4), h: 2.7,
    floor: 'bathFloor', wallMat: 'wallTile', wallC: '#ffffff', ceilC: CEIL, ext: ['E', 'N'],
    ceil: { h0: 2.7 },
    windows: [
      { side: 'N', a: 29.9, b: 31.0, sill: 1.2, head: 1.8, mull: 0 },
      { side: 'E', a: 14.3, b: 15.4, sill: 1.2, head: 1.8, mull: 0 },
    ],
  },
];

// Openings between zones. line = wall centre coordinate, axis = which plan
// coordinate is constant along the wall. leaf: groove | panel | pivot | none.
export const OPENINGS = [
  { a: 'A', b: 'B', axis: 'y', line: -0.075, from: 3.7, to: 5.5, head: 2.6, leaf: 'pivot', into: 'B' },
  { a: 'B', b: 'E', axis: 'x', line: -0.075, from: 6.6, to: 7.8, head: 2.4, leaf: 'none', casing: 'oak' },
  { a: 'B', b: 'C', axis: 'x', line: -0.075, from: 10.0, to: 13.2, head: 2.75, leaf: 'none', casing: 'plain' },
  { a: 'B', b: 'G', axis: 'x', line: 7.075, from: 8.6, to: 10.2, head: 2.4, leaf: 'none', casing: 'oak' },
  { a: 'E', b: 'F', axis: 'x', line: -3.075, from: 4.0, to: 4.9, head: 2.2, leaf: 'groove', into: 'F', hinge: 'min' },
  { a: 'C', b: 'D', axis: 'y', line: 15.075, from: -4.2, to: -3.3, head: 2.2, leaf: 'groove', into: 'D', hinge: 'min' },
  { a: 'F', b: 'F1', axis: 'y', line: 6.175, from: -7.5, to: -6.6, head: 2.2, leaf: 'groove', into: 'F1', hinge: 'max', angle: 88 },
  { a: 'G', b: 'H', axis: 'y', line: 8.525, from: 7.6, to: 8.5, head: 2.2, leaf: 'panel', into: 'H', hinge: 'min' },
  { a: 'H', b: 'H1', axis: 'x', line: 9.825, from: 6.5, to: 7.4, head: 2.2, leaf: 'groove', into: 'H1', hinge: 'min' },
  { a: 'G', b: 'I', axis: 'y', line: 10.275, from: 10.3, to: 11.2, head: 2.2, leaf: 'panel', into: 'I', hinge: 'min' },
  { a: 'G', b: 'K', axis: 'y', line: 8.525, from: 16.4, to: 17.3, head: 2.2, leaf: 'panel', into: 'K', hinge: 'min' },
  { a: 'G', b: 'L', axis: 'y', line: 10.275, from: 17.0, to: 17.9, head: 2.2, leaf: 'groove', into: 'L', hinge: 'min' },
  { a: 'G', b: 'M', axis: 'y', line: 8.525, from: 25.2, to: 26.1, head: 2.2, leaf: 'panel', into: 'M', hinge: 'min' },
  { a: 'G', b: 'N', axis: 'y', line: 10.275, from: 26.4, to: 27.3, head: 2.2, leaf: 'panel', into: 'N', hinge: 'min' },
  { a: 'N', b: 'N1', axis: 'x', line: 28.725, from: 13.1, to: 14.0, head: 2.2, leaf: 'groove', into: 'N1', hinge: 'min' },
];

// Closed doors on walls (to unvisited spaces): zone, side, from, to, leaf
export const CLOSED_DOORS = [
  { zone: 'F', side: 'N', from: -6.0, to: -5.2, leaf: 'groove' },
  { zone: 'G', side: 'N', from: 8.1, to: 9.0, leaf: 'panel' },
  { zone: 'G', side: 'N', from: 14.95, to: 15.85, leaf: 'panel' },
  { zone: 'G', side: 'N', from: 23.7, to: 24.6, leaf: 'panel' },
  { zone: 'G', side: 'S', from: 22.2, to: 23.1, leaf: 'panel' },
  { zone: 'G', side: 'S', from: 29.8, to: 30.7, leaf: 'panel' },
];

export const BOUNDS = { x0: -10.2, x1: 31.6, y0: -6.6, y1: 18.0 };
