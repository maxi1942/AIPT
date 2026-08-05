import type { MuscleId } from "@/lib/exerciseGuides";

type Level = "primary" | "secondary" | "none";

const NEUTRAL = "#3f3f46";
const OUTLINE = "#27272a";
const PRIMARY = "#34d399";
const SECONDARY = "rgba(52, 211, 153, 0.35)";

function fillFor(level: Level): string {
  if (level === "primary") return PRIMARY;
  if (level === "secondary") return SECONDARY;
  return NEUTRAL;
}

/**
 * Stylized front + back body diagram with the muscles worked by an exercise
 * highlighted (solid = primary, translucent = secondary).
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

function FrontBody({ level }: { level: (m: MuscleId) => Level }) {
  return (
    <svg viewBox="0 0 100 210" width="96" height="202" aria-hidden>
      {/* head + neck */}
      <circle cx="50" cy="13" r="9" fill={NEUTRAL} stroke={OUTLINE} />
      <rect x="45" y="21" width="10" height="7" rx="2" fill={NEUTRAL} />

      {/* torso base */}
      <path
        d="M32 30 Q50 24 68 30 L66 78 Q50 86 34 78 Z"
        fill={NEUTRAL}
        stroke={OUTLINE}
      />

      {/* shoulders (front delts) */}
      <ellipse cx="29" cy="35" rx="8" ry="6.5" fill={fillFor(level("shoulders"))} stroke={OUTLINE} />
      <ellipse cx="71" cy="35" rx="8" ry="6.5" fill={fillFor(level("shoulders"))} stroke={OUTLINE} />

      {/* chest */}
      <ellipse cx="41" cy="44" rx="9.5" ry="7.5" fill={fillFor(level("chest"))} stroke={OUTLINE} />
      <ellipse cx="59" cy="44" rx="9.5" ry="7.5" fill={fillFor(level("chest"))} stroke={OUTLINE} />

      {/* abs / core */}
      <rect x="42" y="54" width="16" height="24" rx="4" fill={fillFor(level("core"))} stroke={OUTLINE} />

      {/* biceps */}
      <ellipse cx="24" cy="53" rx="5" ry="9" fill={fillFor(level("biceps"))} stroke={OUTLINE} />
      <ellipse cx="76" cy="53" rx="5" ry="9" fill={fillFor(level("biceps"))} stroke={OUTLINE} />

      {/* forearms */}
      <ellipse cx="20" cy="73" rx="4" ry="10" fill={fillFor(level("forearms"))} stroke={OUTLINE} />
      <ellipse cx="80" cy="73" rx="4" ry="10" fill={fillFor(level("forearms"))} stroke={OUTLINE} />

      {/* pelvis */}
      <path d="M35 80 Q50 88 65 80 L62 95 Q50 100 38 95 Z" fill={NEUTRAL} stroke={OUTLINE} />

      {/* quads */}
      <ellipse cx="42" cy="115" rx="7.5" ry="20" fill={fillFor(level("quads"))} stroke={OUTLINE} />
      <ellipse cx="58" cy="115" rx="7.5" ry="20" fill={fillFor(level("quads"))} stroke={OUTLINE} />

      {/* lower legs (front — shins, neutral) */}
      <ellipse cx="43" cy="160" rx="5" ry="17" fill={NEUTRAL} stroke={OUTLINE} />
      <ellipse cx="57" cy="160" rx="5" ry="17" fill={NEUTRAL} stroke={OUTLINE} />

      {/* feet */}
      <ellipse cx="43" cy="182" rx="5" ry="3" fill={NEUTRAL} />
      <ellipse cx="57" cy="182" rx="5" ry="3" fill={NEUTRAL} />
    </svg>
  );
}

function BackBody({ level }: { level: (m: MuscleId) => Level }) {
  return (
    <svg viewBox="0 0 100 210" width="96" height="202" aria-hidden>
      {/* head + neck */}
      <circle cx="50" cy="13" r="9" fill={NEUTRAL} stroke={OUTLINE} />
      <rect x="45" y="21" width="10" height="7" rx="2" fill={NEUTRAL} />

      {/* torso base */}
      <path
        d="M32 30 Q50 24 68 30 L66 78 Q50 86 34 78 Z"
        fill={NEUTRAL}
        stroke={OUTLINE}
      />

      {/* traps */}
      <path
        d="M40 28 Q50 24 60 28 L56 40 Q50 43 44 40 Z"
        fill={fillFor(level("traps"))}
        stroke={OUTLINE}
      />

      {/* rear shoulders */}
      <ellipse cx="29" cy="35" rx="8" ry="6.5" fill={fillFor(level("shoulders"))} stroke={OUTLINE} />
      <ellipse cx="71" cy="35" rx="8" ry="6.5" fill={fillFor(level("shoulders"))} stroke={OUTLINE} />

      {/* upper back (between shoulder blades) */}
      <rect x="41" y="41" width="18" height="12" rx="3" fill={fillFor(level("upper_back"))} stroke={OUTLINE} />

      {/* lats */}
      <path
        d="M36 44 L42 55 L44 70 L37 66 Z"
        fill={fillFor(level("lats"))}
        stroke={OUTLINE}
      />
      <path
        d="M64 44 L58 55 L56 70 L63 66 Z"
        fill={fillFor(level("lats"))}
        stroke={OUTLINE}
      />

      {/* lower back */}
      <rect x="44" y="64" width="12" height="13" rx="3" fill={fillFor(level("lower_back"))} stroke={OUTLINE} />

      {/* triceps */}
      <ellipse cx="24" cy="53" rx="5" ry="9" fill={fillFor(level("triceps"))} stroke={OUTLINE} />
      <ellipse cx="76" cy="53" rx="5" ry="9" fill={fillFor(level("triceps"))} stroke={OUTLINE} />

      {/* forearms */}
      <ellipse cx="20" cy="73" rx="4" ry="10" fill={fillFor(level("forearms"))} stroke={OUTLINE} />
      <ellipse cx="80" cy="73" rx="4" ry="10" fill={fillFor(level("forearms"))} stroke={OUTLINE} />

      {/* glutes */}
      <ellipse cx="43" cy="88" rx="8" ry="7" fill={fillFor(level("glutes"))} stroke={OUTLINE} />
      <ellipse cx="57" cy="88" rx="8" ry="7" fill={fillFor(level("glutes"))} stroke={OUTLINE} />

      {/* hamstrings */}
      <ellipse cx="42" cy="115" rx="7" ry="18" fill={fillFor(level("hamstrings"))} stroke={OUTLINE} />
      <ellipse cx="58" cy="115" rx="7" ry="18" fill={fillFor(level("hamstrings"))} stroke={OUTLINE} />

      {/* calves */}
      <ellipse cx="43" cy="155" rx="5.5" ry="13" fill={fillFor(level("calves"))} stroke={OUTLINE} />
      <ellipse cx="57" cy="155" rx="5.5" ry="13" fill={fillFor(level("calves"))} stroke={OUTLINE} />

      {/* feet */}
      <ellipse cx="43" cy="182" rx="5" ry="3" fill={NEUTRAL} />
      <ellipse cx="57" cy="182" rx="5" ry="3" fill={NEUTRAL} />
    </svg>
  );
}
