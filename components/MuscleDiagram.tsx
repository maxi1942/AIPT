import type { MuscleId } from "@/lib/exerciseGuides";
import { capsulePath, type Pt } from "@/lib/figure";

type Level = "primary" | "secondary" | "none";

const NEUTRAL = "#46464e";
const OUTLINE = "#1c1c21";
const PRIMARY = "#34d399";
const SECONDARY = "rgba(52, 211, 153, 0.38)";

function fillFor(level: Level): string {
  if (level === "primary") return PRIMARY;
  if (level === "secondary") return SECONDARY;
  return NEUTRAL;
}

/**
 * Front + back body diagram with the muscles worked by an exercise
 * highlighted (solid = primary, translucent = secondary). Limbs are drawn as
 * tapered capsules so the figure reads as a body rather than a wireframe.
 */
export default function MuscleDiagram({
  primary,
  secondary,
}: {
  primary: MuscleId[];
  secondary: MuscleId[];
}) {
  const level = (m: MuscleId): Level =>
    primary.includes(m)
      ? "primary"
      : secondary.includes(m)
        ? "secondary"
        : "none";

  return (
    <div className="flex items-start justify-center gap-6">
      <figure className="text-center">
        <FrontBody level={level} />
        <figcaption className="mt-1 text-xs text-zinc-500">Front</figcaption>
      </figure>
      <figure className="text-center">
        <BackBody level={level} />
        <figcaption className="mt-1 text-xs text-zinc-500">Back</figcaption>
      </figure>
    </div>
  );
}

function Limb({ a, b, ra, rb, fill }: { a: Pt; b: Pt; ra: number; rb: number; fill: string }) {
  return (
    <path
      d={capsulePath(a, b, ra, rb)}
      fill={fill}
      stroke={OUTLINE}
      strokeWidth={0.7}
    />
  );
}

function HeadNeck() {
  return (
    <>
      <circle cx="50" cy="13" r="9" fill={NEUTRAL} stroke={OUTLINE} strokeWidth={0.7} />
      <rect x="45" y="21" width="10" height="7" rx="2.5" fill={NEUTRAL} />
    </>
  );
}

function Torso() {
  return (
    <path
      d="M31,30 C38,25 62,25 69,30 C70,44 68,58 63,74 C58,82 42,82 37,74 C32,58 30,44 31,30 Z"
      fill={NEUTRAL}
      stroke={OUTLINE}
      strokeWidth={0.7}
    />
  );
}

function Pelvis() {
  return (
    <path
      d="M37,77 C42,84 58,84 63,77 L61,93 C55,98 45,98 39,93 Z"
      fill={NEUTRAL}
      stroke={OUTLINE}
      strokeWidth={0.7}
    />
  );
}

function Feet() {
  return (
    <>
      <ellipse cx="40" cy="163" rx="4.5" ry="2.5" fill={NEUTRAL} />
      <ellipse cx="60" cy="163" rx="4.5" ry="2.5" fill={NEUTRAL} />
    </>
  );
}

function FrontBody({ level }: { level: (m: MuscleId) => Level }) {
  const shoulders = fillFor(level("shoulders"));
  const biceps = fillFor(level("biceps"));
  const forearms = fillFor(level("forearms"));
  const quads = fillFor(level("quads"));

  return (
    <svg viewBox="0 0 100 172" width="96" height="165" aria-hidden>
      <HeadNeck />
      <Torso />
      <Pelvis />

      {/* legs — thigh capsule is the quads */}
      <Limb a={[43, 86]} b={[41, 122]} ra={6.4} rb={4.4} fill={quads} />
      <Limb a={[57, 86]} b={[59, 122]} ra={6.4} rb={4.4} fill={quads} />
      <Limb a={[41, 122]} b={[42, 156]} ra={3.9} rb={2.6} fill={NEUTRAL} />
      <Limb a={[59, 122]} b={[58, 156]} ra={3.9} rb={2.6} fill={NEUTRAL} />
      <Feet />

      {/* arms */}
      <Limb a={[30, 36]} b={[23, 55]} ra={3.7} rb={2.9} fill={biceps} />
      <Limb a={[70, 36]} b={[77, 55]} ra={3.7} rb={2.9} fill={biceps} />
      <Limb a={[23, 55]} b={[19, 74]} ra={2.8} rb={2.1} fill={forearms} />
      <Limb a={[77, 55]} b={[81, 74]} ra={2.8} rb={2.1} fill={forearms} />

      {/* deltoids */}
      <circle cx="30" cy="34" r="6.8" fill={shoulders} stroke={OUTLINE} strokeWidth={0.7} />
      <circle cx="70" cy="34" r="6.8" fill={shoulders} stroke={OUTLINE} strokeWidth={0.7} />

      {/* chest */}
      <ellipse cx="41" cy="45" rx="9" ry="7.5" fill={fillFor(level("chest"))} stroke={OUTLINE} strokeWidth={0.7} />
      <ellipse cx="59" cy="45" rx="9" ry="7.5" fill={fillFor(level("chest"))} stroke={OUTLINE} strokeWidth={0.7} />

      {/* abs */}
      <rect x="42" y="55" width="16" height="24" rx="6" fill={fillFor(level("core"))} stroke={OUTLINE} strokeWidth={0.7} />
    </svg>
  );
}

function BackBody({ level }: { level: (m: MuscleId) => Level }) {
  const shoulders = fillFor(level("shoulders"));
  const triceps = fillFor(level("triceps"));
  const forearms = fillFor(level("forearms"));
  const hamstrings = fillFor(level("hamstrings"));
  const calves = fillFor(level("calves"));

  return (
    <svg viewBox="0 0 100 172" width="96" height="165" aria-hidden>
      <HeadNeck />
      <Torso />

      {/* traps */}
      <path
        d="M40,27 Q50,23 60,27 L56,41 Q50,44 44,41 Z"
        fill={fillFor(level("traps"))}
        stroke={OUTLINE}
        strokeWidth={0.7}
      />

      {/* upper back */}
      <rect x="40" y="42" width="20" height="13" rx="4" fill={fillFor(level("upper_back"))} stroke={OUTLINE} strokeWidth={0.7} />

      {/* lats */}
      <path d="M36,45 L43,57 L45,72 L37,67 Z" fill={fillFor(level("lats"))} stroke={OUTLINE} strokeWidth={0.7} />
      <path d="M64,45 L57,57 L55,72 L63,67 Z" fill={fillFor(level("lats"))} stroke={OUTLINE} strokeWidth={0.7} />

      {/* lower back */}
      <rect x="44" y="63" width="12" height="14" rx="3.5" fill={fillFor(level("lower_back"))} stroke={OUTLINE} strokeWidth={0.7} />

      {/* glutes */}
      <ellipse cx="43" cy="86" rx="8" ry="7" fill={fillFor(level("glutes"))} stroke={OUTLINE} strokeWidth={0.7} />
      <ellipse cx="57" cy="86" rx="8" ry="7" fill={fillFor(level("glutes"))} stroke={OUTLINE} strokeWidth={0.7} />

      {/* legs — thigh capsule is the hamstrings, shin is the calves */}
      <Limb a={[43, 92]} b={[41, 124]} ra={6} rb={4.3} fill={hamstrings} />
      <Limb a={[57, 92]} b={[59, 124]} ra={6} rb={4.3} fill={hamstrings} />
      <Limb a={[41, 124]} b={[42, 156]} ra={3.9} rb={2.6} fill={calves} />
      <Limb a={[59, 124]} b={[58, 156]} ra={3.9} rb={2.6} fill={calves} />
      <Feet />

      {/* arms — upper arm is the triceps from behind */}
      <Limb a={[30, 36]} b={[23, 55]} ra={3.7} rb={2.9} fill={triceps} />
      <Limb a={[70, 36]} b={[77, 55]} ra={3.7} rb={2.9} fill={triceps} />
      <Limb a={[23, 55]} b={[19, 74]} ra={2.8} rb={2.1} fill={forearms} />
      <Limb a={[77, 55]} b={[81, 74]} ra={2.8} rb={2.1} fill={forearms} />

      {/* rear deltoids */}
      <circle cx="30" cy="34" r="6.8" fill={shoulders} stroke={OUTLINE} strokeWidth={0.7} />
      <circle cx="70" cy="34" r="6.8" fill={shoulders} stroke={OUTLINE} strokeWidth={0.7} />
    </svg>
  );
}
