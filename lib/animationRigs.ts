/**
 * Stylized stick-figure animation rigs for exercise demonstrations.
 *
 * Each rig is a set of named joints with two keyframe poses (start and end
 * of the movement); the renderer interpolates between them in a loop.
 * Coordinates live in a 0–100 viewBox, ground at y≈90, lifter facing right.
 */

export type Point = [number, number];
export type Pose = Record<string, Point>;

export interface StaticShape {
  type: "line" | "rect";
  /** line: [x1, y1, x2, y2] — rect: [x, y, width, height] */
  coords: [number, number, number, number];
}

export type WeightType = "plate" | "bigplate" | "dumbbell" | "wheel" | "handle";

export interface Rig {
  /** Pairs of joint names to connect with limb strokes. */
  links: Array<[string, string]>;
  /** Joint that carries the head circle. */
  head: string;
  /** Joints that carry a weight (plate/dumbbell) circle. */
  weights?: string[];
  /** What kind of equipment to draw at the weight joints. */
  weightType?: WeightType;
  /** Non-moving scenery: floor, bench, bar to hang from. */
  staticShapes?: StaticShape[];
  /** Keyframes; the loop runs A → B → A with easing. */
  poses: [Pose, Pose];
  /** Seconds for a full A → B → A cycle. */
  dur?: number;
}

/** Equipment style per rig (rigs without weights are omitted). */
const RIG_WEIGHT_TYPE: Record<string, WeightType> = {
  squat: "plate",
  hinge: "bigplate",
  lunge: "dumbbell",
  bench: "plate",
  ohp: "plate",
  row: "plate",
  curl: "dumbbell",
  triceps: "handle",
  lateral: "dumbbell",
  legext: "handle",
  legcurl: "handle",
  hipthrust: "plate",
  calfraise: "dumbbell",
  carry: "dumbbell",
  rollout: "wheel",
};

const FLOOR: StaticShape = { type: "line", coords: [8, 91, 92, 91] };

export const RIGS: Record<string, Rig> = {
  squat: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["shoulder"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [44, 40], hand: [48, 33],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [56, 74], hip: [42, 71],
        shoulder: [50, 52], head: [53, 44], elbow: [44, 60], hand: [47, 53],
      },
    ],
  },

  hinge: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [49, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [51, 45], hand: [52, 57],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [52, 74], hip: [43, 63],
        shoulder: [61, 50], head: [67, 47], elbow: [60, 62], hand: [58, 73],
      },
    ],
  },

  lunge: {
    links: [
      ["ankleF", "kneeF"],
      ["kneeF", "hip"],
      ["ankleB", "kneeB"],
      ["kneeB", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankleF: [58, 90], kneeF: [57, 73], ankleB: [38, 89], kneeB: [43, 73],
        hip: [48, 56], shoulder: [48, 34], head: [50, 26],
        elbow: [48, 46], hand: [48, 58],
      },
      {
        ankleF: [58, 90], kneeF: [58, 74], ankleB: [37, 90], kneeB: [40, 85],
        hip: [48, 68], shoulder: [48, 46], head: [50, 38],
        elbow: [48, 57], hand: [48, 68],
      },
    ],
  },

  bench: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR, { type: "rect", coords: [38, 72, 42, 5] }],
    poses: [
      {
        ankle: [28, 90], knee: [33, 74], hip: [48, 70], shoulder: [64, 69],
        head: [73, 68], elbow: [64, 57], hand: [64, 45],
      },
      {
        ankle: [28, 90], knee: [33, 74], hip: [48, 70], shoulder: [64, 69],
        head: [73, 68], elbow: [58, 68], hand: [61, 58],
      },
    ],
  },

  pushup: {
    links: [
      ["toe", "kneeish"],
      ["kneeish", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    staticShapes: [FLOOR],
    poses: [
      {
        toe: [22, 89], kneeish: [33, 81], hip: [44, 72], shoulder: [62, 60],
        head: [70, 55], elbow: [63, 74], hand: [64, 89],
      },
      {
        toe: [22, 89], kneeish: [33, 84], hip: [43, 80], shoulder: [61, 76],
        head: [69, 71], elbow: [73, 80], hand: [64, 89],
      },
    ],
  },

  dip: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    staticShapes: [
      { type: "line", coords: [42, 62, 78, 62] },
      { type: "line", coords: [74, 62, 74, 90] },
    ],
    poses: [
      {
        ankle: [42, 86], knee: [50, 80], hip: [56, 66], shoulder: [59, 47],
        head: [62, 39], elbow: [60, 55], hand: [60, 62],
      },
      {
        ankle: [40, 90], knee: [48, 86], hip: [55, 76], shoulder: [58, 57],
        head: [61, 49], elbow: [68, 58], hand: [60, 62],
      },
    ],
  },

  ohp: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [53, 42], hand: [55, 33],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [53, 25], elbow: [52, 23], hand: [53, 13],
      },
    ],
  },

  pullup: {
    links: [
      ["hand", "elbow"],
      ["elbow", "shoulder"],
      ["shoulder", "hip"],
      ["hip", "knee"],
      ["knee", "ankle"],
    ],
    head: "head",
    staticShapes: [
      { type: "line", coords: [28, 16, 76, 16] },
      { type: "line", coords: [30, 16, 30, 8] },
      { type: "line", coords: [74, 16, 74, 8] },
    ],
    poses: [
      {
        hand: [52, 16], elbow: [52, 24], shoulder: [52, 33], head: [55, 27],
        hip: [50, 55], knee: [48, 72], ankle: [43, 83],
      },
      {
        hand: [52, 16], elbow: [60, 23], shoulder: [53, 21], head: [56, 13],
        hip: [50, 42], knee: [46, 58], ankle: [41, 69],
      },
    ],
  },

  row: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [52, 74], hip: [44, 63],
        shoulder: [60, 49], head: [66, 46], elbow: [60, 61], hand: [60, 72],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [52, 74], hip: [44, 63],
        shoulder: [60, 49], head: [66, 46], elbow: [67, 58], hand: [59, 57],
      },
    ],
  },

  curl: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [51, 45], hand: [52, 57],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [51, 45], hand: [59, 37],
      },
    ],
  },

  triceps: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR, { type: "line", coords: [60, 8, 58, 38] }],
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [51, 45], hand: [59, 39],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [51, 45], hand: [57, 57],
      },
    ],
  },

  lateral: {
    links: [
      ["ankleL", "kneeL"],
      ["kneeL", "hip"],
      ["ankleR", "kneeR"],
      ["kneeR", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbowL"],
      ["elbowL", "handL"],
      ["shoulder", "elbowR"],
      ["elbowR", "handR"],
    ],
    head: "head",
    weights: ["handL", "handR"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankleL: [44, 90], kneeL: [46, 74], ankleR: [56, 90], kneeR: [54, 74],
        hip: [50, 58], shoulder: [50, 38], head: [50, 29],
        elbowL: [44, 48], handL: [42, 58], elbowR: [56, 48], handR: [58, 58],
      },
      {
        ankleL: [44, 90], kneeL: [46, 74], ankleR: [56, 90], kneeR: [54, 74],
        hip: [50, 58], shoulder: [50, 38], head: [50, 29],
        elbowL: [40, 39], handL: [30, 38], elbowR: [60, 39], handR: [70, 38],
      },
    ],
  },

  legext: {
    links: [
      ["hip", "knee"],
      ["knee", "ankle"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
    ],
    head: "head",
    weights: ["ankle"],
    staticShapes: [FLOOR, { type: "rect", coords: [30, 66, 20, 24] }],
    poses: [
      {
        hip: [44, 64], knee: [60, 64], ankle: [61, 80],
        shoulder: [42, 42], head: [44, 33], elbow: [44, 54],
      },
      {
        hip: [44, 64], knee: [60, 64], ankle: [75, 67],
        shoulder: [42, 42], head: [44, 33], elbow: [44, 54],
      },
    ],
  },

  legcurl: {
    links: [
      ["ankleS", "kneeS"],
      ["kneeS", "hip"],
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    weights: ["ankle"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankleS: [53, 90], kneeS: [52, 72], ankle: [48, 90], knee: [49, 72],
        hip: [50, 54], shoulder: [50, 32], head: [52, 24],
        elbow: [50, 45], hand: [50, 57],
      },
      {
        ankleS: [53, 90], kneeS: [52, 72], ankle: [39, 78], knee: [49, 72],
        hip: [50, 54], shoulder: [50, 32], head: [52, 24],
        elbow: [50, 45], hand: [50, 57],
      },
    ],
  },

  hipthrust: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
    ],
    head: "head",
    weights: ["hip"],
    staticShapes: [FLOOR, { type: "rect", coords: [16, 62, 18, 28] }],
    poses: [
      {
        ankle: [64, 90], knee: [61, 71], hip: [48, 80], shoulder: [35, 63],
        head: [30, 56],
      },
      {
        ankle: [64, 90], knee: [62, 68], hip: [50, 64], shoulder: [35, 63],
        head: [30, 56],
      },
    ],
  },

  calfraise: {
    links: [
      ["toe", "ankle"],
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        toe: [58, 90], ankle: [50, 89], knee: [50, 71], hip: [50, 53],
        shoulder: [50, 31], head: [52, 23], elbow: [50, 44], hand: [50, 56],
      },
      {
        toe: [58, 90], ankle: [51, 83], knee: [50, 65], hip: [50, 47],
        shoulder: [50, 25], head: [52, 17], elbow: [50, 38], hand: [50, 50],
      },
    ],
  },

  plank: {
    links: [
      ["toe", "kneeish"],
      ["kneeish", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    staticShapes: [FLOOR],
    dur: 3.2,
    poses: [
      {
        toe: [22, 89], kneeish: [34, 83], hip: [45, 76], shoulder: [61, 69],
        head: [69, 64], elbow: [61, 89], hand: [71, 89],
      },
      {
        toe: [22, 89], kneeish: [34, 82], hip: [45, 74], shoulder: [61, 68],
        head: [69, 63], elbow: [61, 89], hand: [71, 89],
      },
    ],
  },

  legraise: {
    links: [
      ["hand", "elbow"],
      ["elbow", "shoulder"],
      ["shoulder", "hip"],
      ["hip", "knee"],
      ["knee", "ankle"],
    ],
    head: "head",
    staticShapes: [
      { type: "line", coords: [28, 16, 76, 16] },
      { type: "line", coords: [30, 16, 30, 8] },
      { type: "line", coords: [74, 16, 74, 8] },
    ],
    poses: [
      {
        hand: [52, 16], elbow: [52, 24], shoulder: [52, 33], head: [55, 26],
        hip: [50, 55], knee: [50, 71], ankle: [50, 87],
      },
      {
        hand: [52, 16], elbow: [52, 24], shoulder: [52, 33], head: [55, 26],
        hip: [50, 55], knee: [62, 55], ankle: [75, 58],
      },
    ],
  },

  crunch: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "hand"],
    ],
    head: "head",
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [32, 90], knee: [44, 89], hip: [46, 76], shoulder: [52, 56],
        head: [56, 49], hand: [58, 52],
      },
      {
        ankle: [32, 90], knee: [44, 89], hip: [46, 76], shoulder: [59, 68],
        head: [62, 62], hand: [64, 64],
      },
    ],
  },

  rollout: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    poses: [
      {
        ankle: [30, 90], knee: [44, 88], hip: [47, 76], shoulder: [54, 58],
        head: [58, 50], elbow: [56, 72], hand: [58, 86],
      },
      {
        ankle: [30, 90], knee: [44, 88], hip: [51, 80], shoulder: [64, 70],
        head: [70, 64], elbow: [72, 78], hand: [80, 86],
      },
    ],
  },

  carry: {
    links: [
      ["ankle", "knee"],
      ["knee", "hip"],
      ["hip", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "hand"],
      ["ankle", "toe"],
    ],
    head: "head",
    weights: ["hand"],
    staticShapes: [FLOOR],
    dur: 1.6,
    poses: [
      {
        ankle: [50, 90], toe: [58, 90], knee: [50, 72], hip: [50, 54],
        shoulder: [50, 32], head: [52, 24], elbow: [50, 45], hand: [50, 57],
      },
      {
        ankle: [50, 90], toe: [58, 90], knee: [51, 73], hip: [50, 56],
        shoulder: [50, 34], head: [52, 26], elbow: [50, 47], hand: [50, 59],
      },
    ],
  },
};

/** Which rig demonstrates each built-in exercise (lowercase name → rig id). */
const EXERCISE_RIG: Record<string, keyof typeof RIGS> = {
  "barbell bench press": "bench",
  "incline dumbbell press": "bench",
  "dumbbell bench press": "bench",
  "cable fly": "bench",
  "push-up": "pushup",
  dips: "dip",
  deadlift: "hinge",
  "pull-up": "pullup",
  "chin-up": "pullup",
  "barbell row": "row",
  "dumbbell row": "row",
  "lat pulldown": "pullup",
  "seated cable row": "row",
  "face pull": "row",
  "barbell back squat": "squat",
  "front squat": "squat",
  "romanian deadlift": "hinge",
  "leg press": "legext",
  "walking lunge": "lunge",
  "bulgarian split squat": "lunge",
  "leg extension": "legext",
  "leg curl": "legcurl",
  "hip thrust": "hipthrust",
  "standing calf raise": "calfraise",
  "overhead press": "ohp",
  "seated dumbbell press": "ohp",
  "lateral raise": "lateral",
  "rear delt fly": "lateral",
  "arnold press": "ohp",
  "barbell curl": "curl",
  "dumbbell curl": "curl",
  "hammer curl": "curl",
  "preacher curl": "curl",
  "triceps pushdown": "triceps",
  "skull crusher": "triceps",
  "overhead triceps extension": "triceps",
  plank: "plank",
  "hanging leg raise": "legraise",
  "cable crunch": "crunch",
  "ab wheel rollout": "rollout",
  "kettlebell swing": "hinge",
  "clean and press": "ohp",
  "farmer's carry": "carry",
};

export function getRigForExercise(name: string): Rig | null {
  const rigId = EXERCISE_RIG[name.trim().toLowerCase()];
  if (!rigId) return null;
  return { ...RIGS[rigId], weightType: RIG_WEIGHT_TYPE[rigId] };
}
