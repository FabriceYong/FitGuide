/**
 * Counting reps from the camera: the website and the app find the body's
 * joints in each video frame (33 pose landmarks, the same numbering in
 * MediaPipe and ML Kit), and this turns a joint's angle over time into reps
 * and form cues. lib/src/core/rep_counter.dart in the app is the same.
 *
 * A rep counts when the joint bends past `down` and straightens past `up`
 * again. Coming back up after bending only part of the way gives the
 * exercise's depth cue instead of a rep.
 */

// Pose landmark numbers.
const L = {
  leftShoulder: 11, rightShoulder: 12, leftElbow: 13, rightElbow: 14, leftWrist: 15, rightWrist: 16,
  leftHip: 23, rightHip: 24, leftKnee: 25, rightKnee: 26, leftAnkle: 27, rightAnkle: 28,
};

const REP_EXERCISES = {
  squat: {
    name: 'Squats',
    // hip – knee – ankle
    joints: [[L.leftHip, L.leftKnee, L.leftAnkle], [L.rightHip, L.rightKnee, L.rightAnkle]],
    down: 100,
    up: 160,
    shallowCue: 'Go a little lower',
    setup: 'Stand side-on to the camera, about 2 metres away, so your whole body is in view.',
  },
  pushup: {
    name: 'Push-ups',
    // shoulder – elbow – wrist
    joints: [[L.leftShoulder, L.leftElbow, L.leftWrist], [L.rightShoulder, L.rightElbow, L.rightWrist]],
    down: 95,
    up: 155,
    shallowCue: 'Lower your chest a little more',
    // shoulder – hip – ankle should stay near straight.
    line: { joints: [[L.leftShoulder, L.leftHip, L.leftAnkle], [L.rightShoulder, L.rightHip, L.rightAnkle]], min: 155, cue: 'Keep your body in a straight line' },
    setup: 'Put the phone on the floor side-on to you, about 1.5 metres away.',
  },
};

/** Which camera exercise a step is, from its name ("Goblet Squats" → squat), or null. */
function repExerciseFor(name) {
  const text = String(name || '').toLowerCase();
  if (/push[\s-]?ups?\b|press[\s-]?ups?\b/.test(text)) return 'pushup';
  if (/\bsquats?\b/.test(text) && !/jump|pistol|split|sumo jump/.test(text)) return 'squat';
  return null;
}

/** The angle at b, in degrees, between a and c ({x, y} points). */
function angleAt(a, b, c) {
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  let deg = Math.abs((ab - cb) * (180 / Math.PI));
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/**
 * A joint's angle from a frame's landmarks: the side the camera sees best.
 * @param {{x:number,y:number,visibility?:number}[]} landmarks
 * @param {number[][]} sides  [a, b, c] landmark numbers for each side
 * @returns {number|null} null when neither side is clearly seen
 */
function jointAngle(landmarks, sides, minVisibility = 0.5) {
  let best = null;
  for (const [a, b, c] of sides) {
    const points = [landmarks[a], landmarks[b], landmarks[c]];
    if (points.some((p) => !p)) continue;
    const seen = Math.min(...points.map((p) => p.visibility ?? 1));
    if (seen < minVisibility || (best && best.seen >= seen)) continue;
    best = { seen, angle: angleAt(...points) };
  }
  return best ? best.angle : null;
}

/**
 * Counts reps of one exercise, a frame at a time.
 * update(landmarks) returns what happened in that frame:
 * { reps, event: 'rep' | 'shallow' | 'form' | null, cue: string | null, angle }.
 */
function createRepCounter(exercise) {
  const ex = REP_EXERCISES[exercise];
  if (!ex) throw new Error(`No camera counting for ${exercise}`);
  let reps = 0;
  let phase = 'start'; // start → up → down → up …
  let smooth = null;
  let lowest = 180;
  let formCued = false;

  function update(landmarks) {
    const raw = jointAngle(landmarks, ex.joints);
    if (raw == null) return { reps, event: null, cue: null, angle: null };
    // Smooth out jitter between frames.
    smooth = smooth == null ? raw : smooth * 0.5 + raw * 0.5;
    const angle = smooth;
    let event = null;
    let cue = null;

    if (phase === 'start') {
      if (angle >= ex.up) phase = 'up';
    } else if (phase === 'up') {
      lowest = Math.min(lowest, angle);
      if (angle <= ex.down) {
        phase = 'down';
      } else if (angle >= ex.up && lowest < ex.up - 25) {
        // Bent part of the way and came back up: not a rep.
        event = 'shallow';
        cue = ex.shallowCue;
        lowest = 180;
      } else if (angle >= ex.up) {
        lowest = 180;
      }
    } else if (phase === 'down') {
      if (ex.line && !formCued) {
        const line = jointAngle(landmarks, ex.line.joints);
        if (line != null && line < ex.line.min) {
          event = 'form';
          cue = ex.line.cue;
          formCued = true;
        }
      }
      if (angle >= ex.up) {
        reps += 1;
        phase = 'up';
        lowest = 180;
        formCued = false;
        event = 'rep';
        cue = null;
      }
    }
    return { reps, event, cue, angle: Math.round(angle) };
  }

  return { update, get reps() { return reps; } };
}

module.exports = { POSE_LANDMARKS: L, REP_EXERCISES, repExerciseFor, angleAt, jointAngle, createRepCounter };
