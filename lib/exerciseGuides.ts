export type MuscleId =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "traps"
  | "lats"
  | "upper_back"
  | "lower_back";

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  core: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  traps: "Traps",
  lats: "Lats",
  upper_back: "Upper back",
  lower_back: "Lower back",
};

export interface ExerciseGuide {
  steps: string[];
  cues: string[];
  mistakes: string[];
  primary: MuscleId[];
  secondary: MuscleId[];
}

const GUIDES: Record<string, ExerciseGuide> = {
  "barbell bench press": {
    steps: [
      "Lie on the bench with eyes under the bar, feet flat on the floor.",
      "Grip slightly wider than shoulder width; unrack and hold the bar over your chest.",
      "Lower the bar under control to your mid-chest, elbows about 45° from your torso.",
      "Press back up to lockout over your shoulders.",
    ],
    cues: [
      "Squeeze your shoulder blades together and keep them pinned to the bench.",
      "Slight arch in the lower back, ribs down, feet driving into the floor.",
    ],
    mistakes: [
      "Bouncing the bar off the chest.",
      "Flaring elbows straight out at 90°.",
    ],
    primary: ["chest"],
    secondary: ["triceps", "shoulders"],
  },
  "incline dumbbell press": {
    steps: [
      "Set the bench to a 30–45° incline and sit with dumbbells on your thighs.",
      "Kick the dumbbells up as you lie back, starting at shoulder level.",
      "Press up and slightly together until arms are extended.",
      "Lower under control until you feel a stretch across the upper chest.",
    ],
    cues: [
      "Keep wrists stacked over elbows the whole rep.",
      "Don't let the dumbbells drift toward your face — press over the upper chest.",
    ],
    mistakes: [
      "Setting the incline too steep, turning it into a shoulder press.",
      "Clanging the dumbbells together at the top.",
    ],
    primary: ["chest", "shoulders"],
    secondary: ["triceps"],
  },
  "dumbbell bench press": {
    steps: [
      "Lie flat with a dumbbell in each hand at chest level, palms forward.",
      "Press both dumbbells up until your arms are extended over your chest.",
      "Lower under control, slightly wider and deeper than a barbell would allow.",
    ],
    cues: [
      "Keep your shoulder blades retracted throughout.",
      "Control the stretch at the bottom — no sudden drops.",
    ],
    mistakes: [
      "Going so heavy the dumbbells wobble out of line.",
      "Cutting the range short at the bottom.",
    ],
    primary: ["chest"],
    secondary: ["triceps", "shoulders"],
  },
  "cable fly": {
    steps: [
      "Set pulleys at chest height, take a handle in each hand, and step forward.",
      "With a slight elbow bend, bring your hands together in a wide arc in front of your chest.",
      "Squeeze, then return until you feel a stretch in the chest.",
    ],
    cues: [
      "Think 'hug a barrel' — arc, don't press.",
      "Keep the elbow angle fixed; only the shoulders move.",
    ],
    mistakes: [
      "Turning it into a press by bending the elbows.",
      "Using so much weight the shoulders roll forward.",
    ],
    primary: ["chest"],
    secondary: ["shoulders"],
  },
  "push-up": {
    steps: [
      "Start in a plank, hands slightly wider than shoulders.",
      "Lower your whole body as one unit until your chest nearly touches the floor.",
      "Press back up to full arm extension.",
    ],
    cues: [
      "Body in a straight line — brace your core and squeeze your glutes.",
      "Elbows about 45° from the torso, not flared to 90°.",
    ],
    mistakes: [
      "Sagging hips or piked butt.",
      "Half reps that skip the bottom stretch.",
    ],
    primary: ["chest"],
    secondary: ["triceps", "shoulders", "core"],
  },
  dips: {
    steps: [
      "Support yourself on parallel bars with arms locked.",
      "Lean slightly forward and lower until your shoulders are just below your elbows.",
      "Press back up to lockout.",
    ],
    cues: [
      "Lean forward for chest emphasis; stay upright for triceps.",
      "Keep shoulders down away from the ears.",
    ],
    mistakes: [
      "Dropping too deep too fast and straining the shoulders.",
      "Kipping with the legs.",
    ],
    primary: ["chest", "triceps"],
    secondary: ["shoulders"],
  },
  deadlift: {
    steps: [
      "Stand with mid-foot under the bar, feet hip-width apart.",
      "Hinge down and grip just outside your legs; shins touch the bar.",
      "Brace, flatten your back, and push the floor away, standing tall.",
      "Lock out hips and knees together, then lower under control along your legs.",
    ],
    cues: [
      "Take the slack out of the bar before you pull.",
      "Chest up, lats tight — 'protect your armpits'.",
      "The bar stays in contact with your legs the whole way.",
    ],
    mistakes: [
      "Rounding the lower back under load.",
      "Jerking the bar off the floor instead of pushing through the legs.",
    ],
    primary: ["hamstrings", "glutes", "lower_back"],
    secondary: ["traps", "lats", "forearms", "quads"],
  },
  "pull-up": {
    steps: [
      "Hang from the bar with an overhand grip slightly wider than shoulders.",
      "Pull your chest toward the bar by driving your elbows down.",
      "Get your chin over the bar, then lower to a full hang.",
    ],
    cues: [
      "Start each rep from a dead hang with shoulders engaged.",
      "Lead with the chest, not the chin.",
    ],
    mistakes: [
      "Kipping or swinging.",
      "Stopping short of full extension at the bottom.",
    ],
    primary: ["lats"],
    secondary: ["biceps", "upper_back"],
  },
  "chin-up": {
    steps: [
      "Hang from the bar with an underhand, shoulder-width grip.",
      "Pull your chin over the bar, elbows driving to your ribs.",
      "Lower under control to a full hang.",
    ],
    cues: [
      "Squeeze the bar hard and keep your core braced.",
      "Think about pulling the bar to you, not you to the bar.",
    ],
    mistakes: [
      "Half reps at the top or bottom.",
      "Shrugging the shoulders up at the top.",
    ],
    primary: ["lats", "biceps"],
    secondary: ["upper_back"],
  },
  "barbell row": {
    steps: [
      "Hinge to about 45° with the bar hanging at arm's length.",
      "Pull the bar to your lower ribs, elbows tracking back.",
      "Pause briefly, then lower under control.",
    ],
    cues: [
      "Back flat and torso still — no heaving.",
      "Squeeze your shoulder blades together at the top.",
    ],
    mistakes: [
      "Standing too upright and turning it into a shrug.",
      "Using momentum from the hips on every rep.",
    ],
    primary: ["lats", "upper_back"],
    secondary: ["biceps", "lower_back"],
  },
  "dumbbell row": {
    steps: [
      "Place one knee and hand on a bench, other foot on the floor.",
      "Let the dumbbell hang, then row it to your hip.",
      "Lower to a full stretch without rotating your torso.",
    ],
    cues: [
      "Pull with the elbow, not the hand.",
      "Keep your back flat and shoulders square to the floor.",
    ],
    mistakes: [
      "Twisting the torso to hoist the weight.",
      "Rowing to the shoulder instead of the hip.",
    ],
    primary: ["lats", "upper_back"],
    secondary: ["biceps"],
  },
  "lat pulldown": {
    steps: [
      "Sit with thighs secured, grip the bar wider than shoulders.",
      "Pull the bar to your upper chest while leaning back slightly.",
      "Control the bar back up to full arm extension.",
    ],
    cues: [
      "Drive the elbows down and back.",
      "Chest up to meet the bar — don't cave forward.",
    ],
    mistakes: [
      "Pulling behind the neck.",
      "Leaning way back and rowing the weight down.",
    ],
    primary: ["lats"],
    secondary: ["biceps", "upper_back"],
  },
  "seated cable row": {
    steps: [
      "Sit tall with knees soft, grab the handle, arms extended.",
      "Pull the handle to your stomach, elbows close to the body.",
      "Squeeze your back, then let the weight stretch you forward under control.",
    ],
    cues: [
      "Torso stays near vertical — rock as little as possible.",
      "Lead the pull with your shoulder blades.",
    ],
    mistakes: [
      "Yanking with the lower back.",
      "Shoulders rolling forward at the stretch.",
    ],
    primary: ["upper_back", "lats"],
    secondary: ["biceps"],
  },
  "face pull": {
    steps: [
      "Set a rope attachment at upper-chest height.",
      "Pull the rope toward your face, splitting the ends past your ears.",
      "Finish with upper arms in line with your shoulders, then return slowly.",
    ],
    cues: [
      "Thumbs point back behind you at the finish.",
      "Keep the weight light — this is a rear-delt and posture move.",
    ],
    mistakes: [
      "Going heavy and turning it into a row.",
      "Letting the shoulders shrug up.",
    ],
    primary: ["upper_back", "shoulders"],
    secondary: ["traps"],
  },
  "barbell back squat": {
    steps: [
      "Rest the bar on your upper back and unrack; feet shoulder-width, toes slightly out.",
      "Brace, then sit down and back until hips are at or below knee level.",
      "Drive up through the whole foot back to standing.",
    ],
    cues: [
      "Big breath and brace before every rep.",
      "Knees track over the toes.",
      "Keep the bar over mid-foot the entire rep.",
    ],
    mistakes: [
      "Heels lifting or knees caving inward.",
      "Cutting depth as the weight gets heavy.",
    ],
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "core", "lower_back"],
  },
  "front squat": {
    steps: [
      "Rack the bar on your front delts, elbows high, fingertips under the bar.",
      "Squat down keeping your torso as upright as possible.",
      "Drive up, leading with the elbows.",
    ],
    cues: [
      "Elbows up! If the elbows drop, the bar rolls forward.",
      "Sit between your legs, not behind them.",
    ],
    mistakes: [
      "Letting the upper back round and dumping the bar.",
      "Rising hips-first out of the hole.",
    ],
    primary: ["quads"],
    secondary: ["glutes", "core"],
  },
  "romanian deadlift": {
    steps: [
      "Stand tall holding the bar at your hips.",
      "Push your hips back, lowering the bar down your thighs with a soft knee bend.",
      "Stop when your hamstrings are fully stretched (usually mid-shin), then drive hips forward to stand.",
    ],
    cues: [
      "It's a hinge, not a squat — knees stay mostly still.",
      "Bar drags along the legs; shoulders stay over the bar.",
    ],
    mistakes: [
      "Rounding the back to chase depth.",
      "Bending the knees more as the set gets hard.",
    ],
    primary: ["hamstrings", "glutes"],
    secondary: ["lower_back"],
  },
  "leg press": {
    steps: [
      "Sit in the machine with feet shoulder-width on the platform.",
      "Lower the platform until your knees reach about 90° or slightly deeper.",
      "Press back up without locking the knees hard.",
    ],
    cues: [
      "Keep your lower back and hips glued to the pad.",
      "Push through the whole foot, not just the toes.",
    ],
    mistakes: [
      "Going so deep the hips roll off the pad.",
      "Slamming into knee lockout at the top.",
    ],
    primary: ["quads", "glutes"],
    secondary: ["hamstrings"],
  },
  "walking lunge": {
    steps: [
      "Step forward and lower until both knees are at about 90°.",
      "Drive through the front foot to stand and step straight into the next lunge.",
    ],
    cues: [
      "Torso tall, front knee tracking over the toes.",
      "Take a long enough step that the front shin stays near vertical.",
    ],
    mistakes: [
      "Short choppy steps that slam the knee forward.",
      "Pushing off the back leg instead of the front.",
    ],
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "core"],
  },
  "bulgarian split squat": {
    steps: [
      "Stand a stride ahead of a bench and place your rear foot on it.",
      "Lower straight down until the front thigh is about parallel.",
      "Drive up through the front foot.",
    ],
    cues: [
      "Most of your weight lives on the front leg.",
      "Slight forward torso lean hits the glutes more; upright hits quads.",
    ],
    mistakes: [
      "Standing too close to the bench and tipping forward.",
      "Bouncing the rear knee off the floor.",
    ],
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "core"],
  },
  "leg extension": {
    steps: [
      "Sit with the pad on your shins and knees lined up with the machine's pivot.",
      "Extend your legs to just short of straight.",
      "Lower under control to the start.",
    ],
    cues: [
      "Pause a beat at the top and squeeze the quads.",
      "Control the negative — no dropping the stack.",
    ],
    mistakes: [
      "Swinging the weight up with hip momentum.",
      "Setting the pad too low on the ankles.",
    ],
    primary: ["quads"],
    secondary: [],
  },
  "leg curl": {
    steps: [
      "Set the pad just above your heels.",
      "Curl your heels toward your glutes.",
      "Return slowly to a full stretch.",
    ],
    cues: [
      "Keep hips pressed down (lying) or back against the pad (seated).",
      "Squeeze at the top; fight the lowering.",
    ],
    mistakes: [
      "Arching the lower back to move more weight.",
      "Short, jerky reps.",
    ],
    primary: ["hamstrings"],
    secondary: [],
  },
  "hip thrust": {
    steps: [
      "Sit with your upper back on a bench, bar over your hips (use a pad).",
      "Feet flat, drive your hips up until your torso is level.",
      "Squeeze the glutes hard at the top, then lower with control.",
    ],
    cues: [
      "Chin tucked, ribs down — finish with glutes, not lower back.",
      "Shins vertical at the top.",
    ],
    mistakes: [
      "Hyperextending the lower back at lockout.",
      "Feet too far forward, turning it into a hamstring exercise.",
    ],
    primary: ["glutes"],
    secondary: ["hamstrings"],
  },
  "standing calf raise": {
    steps: [
      "Stand with the balls of your feet on the platform, heels hanging.",
      "Lower your heels for a full stretch.",
      "Rise up onto your toes as high as possible.",
    ],
    cues: [
      "Pause at the top and at the bottom — no bouncing.",
      "Keep knees straight but not locked.",
    ],
    mistakes: [
      "Fast, bouncy partial reps.",
      "Rolling onto the outside of the feet.",
    ],
    primary: ["calves"],
    secondary: [],
  },
  "overhead press": {
    steps: [
      "Stand with the bar at your collarbones, hands just outside shoulders.",
      "Brace and press the bar straight up, pulling your head back slightly.",
      "Lock out overhead with the bar over your mid-foot; lower under control.",
    ],
    cues: [
      "Squeeze glutes and brace so you don't lean back.",
      "Push your head 'through the window' once the bar passes it.",
    ],
    mistakes: [
      "Turning it into an incline press by arching hard.",
      "Pressing the bar forward instead of straight up.",
    ],
    primary: ["shoulders"],
    secondary: ["triceps", "core"],
  },
  "seated dumbbell press": {
    steps: [
      "Sit with back support, dumbbells at shoulder height, palms forward.",
      "Press both dumbbells overhead until arms are extended.",
      "Lower under control back to shoulder level.",
    ],
    cues: [
      "Keep the ribs down — don't flare and arch.",
      "Forearms vertical under the dumbbells throughout.",
    ],
    mistakes: [
      "Banging the dumbbells together at the top.",
      "Half reps that never reach the shoulders.",
    ],
    primary: ["shoulders"],
    secondary: ["triceps"],
  },
  "lateral raise": {
    steps: [
      "Stand with dumbbells at your sides, slight elbow bend.",
      "Raise your arms out to the sides to shoulder height.",
      "Lower slowly back to your sides.",
    ],
    cues: [
      "Lead with the elbows; pinkies slightly up, like pouring water.",
      "Lighter than you think — the delt does the work, not momentum.",
    ],
    mistakes: [
      "Shrugging the traps as you lift.",
      "Swinging the torso to heave the weight up.",
    ],
    primary: ["shoulders"],
    secondary: [],
  },
  "rear delt fly": {
    steps: [
      "Hinge forward with a flat back, dumbbells hanging beneath you.",
      "Raise the weights out to the sides, leading with the elbows.",
      "Lower slowly without letting the weights swing.",
    ],
    cues: [
      "Think 'wingspan', not 'row' — arms stay long.",
      "Keep the neck neutral, gaze down.",
    ],
    mistakes: [
      "Standing up as you lift.",
      "Using the traps instead of the rear delts.",
    ],
    primary: ["shoulders", "upper_back"],
    secondary: [],
  },
  "arnold press": {
    steps: [
      "Start seated with dumbbells at shoulder height, palms facing you.",
      "Press up while rotating your palms to face forward at the top.",
      "Reverse the rotation on the way down.",
    ],
    cues: [
      "Rotate smoothly through the middle of the rep.",
      "Keep the core braced against the extra range.",
    ],
    mistakes: [
      "Arching the back at the top.",
      "Rushing the rotation and losing the path.",
    ],
    primary: ["shoulders"],
    secondary: ["triceps"],
  },
  "barbell curl": {
    steps: [
      "Stand holding the bar with an underhand, shoulder-width grip.",
      "Curl the bar to shoulder height without moving the upper arms.",
      "Lower under control to full extension.",
    ],
    cues: [
      "Elbows pinned to your sides.",
      "Squeeze at the top; take 2–3 seconds down.",
    ],
    mistakes: [
      "Swinging the hips to start the rep.",
      "Cutting extension short at the bottom.",
    ],
    primary: ["biceps"],
    secondary: ["forearms"],
  },
  "dumbbell curl": {
    steps: [
      "Stand with dumbbells at your sides, palms forward (or rotate as you lift).",
      "Curl to shoulder height, keeping upper arms still.",
      "Lower slowly to full extension.",
    ],
    cues: [
      "Control beats load — no swinging.",
      "Supinate (turn the palm up) fully at the top for a stronger squeeze.",
    ],
    mistakes: [
      "Leaning back as the set gets hard.",
      "Letting the elbows drift forward.",
    ],
    primary: ["biceps"],
    secondary: ["forearms"],
  },
  "hammer curl": {
    steps: [
      "Hold dumbbells with palms facing each other.",
      "Curl to shoulder height keeping the neutral grip.",
      "Lower under control.",
    ],
    cues: [
      "Keep wrists straight — like swinging a hammer.",
      "Elbows stay at your sides.",
    ],
    mistakes: [
      "Rocking the torso for momentum.",
      "Rushing the negative.",
    ],
    primary: ["biceps", "forearms"],
    secondary: [],
  },
  "preacher curl": {
    steps: [
      "Sit with the backs of your upper arms flat on the preacher pad.",
      "Curl the weight up, keeping arms in contact with the pad.",
      "Lower until arms are almost fully extended.",
    ],
    cues: [
      "Slow negatives — this position exposes the biceps at stretch.",
      "Keep shoulders down; don't hunch over the pad.",
    ],
    mistakes: [
      "Bouncing out of the stretched bottom position.",
      "Lifting the elbows off the pad at the top.",
    ],
    primary: ["biceps"],
    secondary: ["forearms"],
  },
  "triceps pushdown": {
    steps: [
      "Face a high pulley, grip the bar or rope, elbows tucked at your sides.",
      "Push down until arms are fully extended.",
      "Let the weight return until forearms pass parallel, elbows staying put.",
    ],
    cues: [
      "Only the forearms move — elbows are hinges, not levers.",
      "Squeeze hard at lockout.",
    ],
    mistakes: [
      "Leaning over the weight and pressing with body weight.",
      "Elbows flaring out on the way down.",
    ],
    primary: ["triceps"],
    secondary: [],
  },
  "skull crusher": {
    steps: [
      "Lie on a bench holding the bar over your chest, narrow grip.",
      "Bend at the elbows to lower the bar toward your forehead.",
      "Extend back to the start without moving the upper arms.",
    ],
    cues: [
      "Keep the upper arms angled slightly back for constant tension.",
      "Lower with total control — the name is a warning.",
    ],
    mistakes: [
      "Flaring elbows wide.",
      "Turning it into a close-grip press when tired.",
    ],
    primary: ["triceps"],
    secondary: [],
  },
  "overhead triceps extension": {
    steps: [
      "Hold the rope or dumbbell overhead, elbows close to your ears.",
      "Lower the weight behind your head by bending the elbows.",
      "Extend back to full lockout.",
    ],
    cues: [
      "Keep the elbows pointing forward, not out.",
      "Ribs down — don't arch as you extend.",
    ],
    mistakes: [
      "Elbows drifting apart under load.",
      "Cutting the stretch short.",
    ],
    primary: ["triceps"],
    secondary: [],
  },
  plank: {
    steps: [
      "Set up on forearms and toes, elbows under shoulders.",
      "Form a straight line from head to heels.",
      "Hold while breathing steadily.",
    ],
    cues: [
      "Squeeze glutes and brace the abs like taking a punch.",
      "Push the floor away through the forearms.",
    ],
    mistakes: [
      "Hips sagging or piking up.",
      "Holding your breath.",
    ],
    primary: ["core"],
    secondary: ["shoulders", "glutes"],
  },
  "hanging leg raise": {
    steps: [
      "Hang from a bar with straight arms.",
      "Raise your legs (bent or straight) until thighs pass parallel.",
      "Lower slowly without swinging.",
    ],
    cues: [
      "Tilt the pelvis up at the top — that's the ab part.",
      "Pause at the bottom to kill momentum between reps.",
    ],
    mistakes: [
      "Swinging into a kip.",
      "Only lifting the legs without curling the pelvis.",
    ],
    primary: ["core"],
    secondary: ["forearms"],
  },
  "cable crunch": {
    steps: [
      "Kneel below a high pulley holding the rope beside your head.",
      "Crunch your elbows toward your thighs by flexing the spine.",
      "Return under control until the abs are stretched.",
    ],
    cues: [
      "Hips stay still — it's a crunch, not a pulldown.",
      "Exhale hard as you crunch.",
    ],
    mistakes: [
      "Hinging at the hips with a rigid spine.",
      "Pulling with the arms.",
    ],
    primary: ["core"],
    secondary: [],
  },
  "ab wheel rollout": {
    steps: [
      "Kneel with hands on the wheel under your shoulders.",
      "Roll forward as far as you can keep your lower back from arching.",
      "Pull back to the start using your abs and lats.",
    ],
    cues: [
      "Tuck the pelvis and keep ribs down before you roll.",
      "Range grows over weeks — earn it.",
    ],
    mistakes: [
      "Letting the hips sag into an arched back.",
      "Bending the elbows to cheat the return.",
    ],
    primary: ["core"],
    secondary: ["lats", "shoulders"],
  },
  "kettlebell swing": {
    steps: [
      "Stand with the bell a foot ahead; hinge and hike it back between your legs.",
      "Snap your hips forward — the bell floats to chest height.",
      "Let it swing back into the next hinge.",
    ],
    cues: [
      "It's a hip hinge, not a squat — shins near vertical.",
      "The arms are ropes; the hips are the engine.",
    ],
    mistakes: [
      "Lifting with the arms and shoulders.",
      "Rounding the back as the bell passes between the legs.",
    ],
    primary: ["glutes", "hamstrings"],
    secondary: ["core", "shoulders", "lower_back"],
  },
  "clean and press": {
    steps: [
      "Deadlift the bar explosively, shrug, and catch it at your shoulders.",
      "Dip slightly, then press or drive the bar overhead to lockout.",
      "Lower to the shoulders, then to the floor, and reset.",
    ],
    cues: [
      "Keep the bar close on the pull — like zipping a jacket.",
      "Full hip extension before the arms bend.",
    ],
    mistakes: [
      "Reverse-curling the bar up instead of catching it.",
      "Pressing before finishing the hip drive.",
    ],
    primary: ["shoulders", "glutes", "hamstrings"],
    secondary: ["quads", "traps", "core"],
  },
  "farmer's carry": {
    steps: [
      "Deadlift a heavy dumbbell or handle in each hand.",
      "Walk with short, quick steps for the set distance or time.",
      "Set the weights down with a flat back.",
    ],
    cues: [
      "Stand tall — shoulders back and down, ribs over hips.",
      "Grip crush the handles the entire walk.",
    ],
    mistakes: [
      "Leaning to one side.",
      "Letting the shoulders round forward as grip fatigues.",
    ],
    primary: ["forearms", "traps", "core"],
    secondary: ["shoulders"],
  },
};

/** Look up the guide for an exercise by display name (case-insensitive). */
export function getExerciseGuide(name: string): ExerciseGuide | null {
  return GUIDES[name.trim().toLowerCase()] ?? null;
}

/** YouTube search link used as the video demo for any exercise. */
export function videoSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${name} exercise proper form`
  )}`;
}
