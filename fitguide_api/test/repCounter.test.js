const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { angleAt, createRepCounter, jointAngle, repExerciseFor, POSE_LANDMARKS: L } = require('@fitguide/shared/repCounter');

/** Landmarks with the left knee bent to `knee` degrees and the body line at `line`. */
function frame({ knee = 180, elbow = 180, line = 180, visibility = 0.9 } = {}) {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
  const bend = (a, b, c, deg) => {
    points[b] = { x: 0, y: 0, visibility };
    points[a] = { x: 1, y: 0, visibility };
    points[c] = { x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180), visibility };
  };
  bend(L.leftHip, L.leftKnee, L.leftAnkle, knee);
  bend(L.leftShoulder, L.leftElbow, L.leftWrist, elbow);
  // Shoulder – hip – ankle for the push-up body line (hip at the origin of its own copy).
  const line3 = [{ x: 1, y: 0, visibility }, { x: 0, y: 0, visibility }, { x: Math.cos((line * Math.PI) / 180), y: Math.sin((line * Math.PI) / 180), visibility }];
  return { points, line: line3 };
}

/** Feed a counter a sequence of angles (several frames each, as video would). */
function run(exercise, angles, key) {
  const counter = createRepCounter(exercise);
  const events = [];
  for (const a of angles) {
    for (let i = 0; i < 4; i++) {
      const r = counter.update(frame({ [key]: a }).points);
      if (r.event) events.push(r.cue ? `${r.event}: ${r.cue}` : r.event);
    }
  }
  return { reps: counter.reps, events };
}

describe('camera rep counting', () => {
  it('measures a joint angle', () => {
    assert.equal(Math.round(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })), 90);
    assert.equal(Math.round(jointAngle(frame({ knee: 120 }).points, [[L.leftHip, L.leftKnee, L.leftAnkle]])), 120);
    // Not seen clearly: no angle.
    assert.equal(jointAngle(frame({ visibility: 0.2 }).points, [[L.leftHip, L.leftKnee, L.leftAnkle]]), null);
  });

  it('counts full squats', () => {
    const { reps, events } = run('squat', [175, 140, 90, 85, 140, 175, 120, 88, 170, 178], 'knee');
    assert.equal(reps, 2);
    assert.deepEqual(events, ['rep', 'rep']);
  });

  it('does not count a half squat, and says to go lower', () => {
    const { reps, events } = run('squat', [175, 130, 120, 175, 90, 175], 'knee');
    assert.equal(reps, 1);
    assert.deepEqual(events, ['shallow: Go a little lower', 'rep']);
  });

  it('waits for the person to stand up before counting', () => {
    // Starting already bent (sitting down) doesn't count a rep.
    assert.equal(run('squat', [80, 90, 170, 80, 175], 'knee').reps, 1);
  });

  it('counts push-ups', () => {
    assert.equal(run('pushup', [170, 80, 170, 85, 165], 'elbow').reps, 2);
  });

  it('says when the hips sag at the bottom of a push-up, once a rep', () => {
    /** Elbow bent to `elbow`, with the shoulder–hip–ankle line at `line` degrees. */
    const pushup = (elbow, line) => {
      const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.1 }));
      const rad = (d) => (d * Math.PI) / 180;
      points[L.leftElbow] = { x: 0, y: 0, visibility: 0.9 };
      points[L.leftShoulder] = { x: 1, y: 0, visibility: 0.9 };
      points[L.leftWrist] = { x: Math.cos(rad(elbow)), y: Math.sin(rad(elbow)), visibility: 0.9 };
      points[L.leftHip] = { x: 2, y: 0, visibility: 0.9 };
      points[L.leftAnkle] = { x: 2 + Math.cos(rad(180 - line)), y: Math.sin(rad(180 - line)), visibility: 0.9 };
      return points;
    };
    const counter = createRepCounter('pushup');
    const cues = [];
    for (const [elbow, line] of [[170, 178], [80, 140], [80, 140], [170, 178], [80, 175], [170, 178]]) {
      for (let i = 0; i < 4; i++) {
        const r = counter.update(pushup(elbow, line));
        if (r.event === 'form') cues.push(r.cue);
      }
    }
    assert.equal(counter.reps, 2);
    assert.deepEqual(cues, ['Keep your body in a straight line']);
  });

  it('knows which steps it can count', () => {
    assert.equal(repExerciseFor('Goblet Squats'), 'squat');
    assert.equal(repExerciseFor('Bodyweight squat'), 'squat');
    assert.equal(repExerciseFor('Jump Squats'), null);
    assert.equal(repExerciseFor('Push-Ups'), 'pushup');
    assert.equal(repExerciseFor('Incline press-up'), 'pushup');
    assert.equal(repExerciseFor('Plank'), null);
  });
});
