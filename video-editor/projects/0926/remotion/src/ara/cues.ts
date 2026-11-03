// Cue frames (30fps) from the real voice-over in CapCut draft 1016-v1, counted from the start of the
// worm-a overlay (timeline 63.067s). Frames 424-539 sit under Anthropic's chart in the edit and are cut out:
// the render is split into worm-a (0-423) and worm-b (540-799).
export const CUES = {
  realTest: 4, // "Then the real test"
  eight: 51, // "8 sealed-off"
  android: 108, // "pretending to be"
  patientZero: 170, // "put the AI worm"
  find: 256, // "find the next"
  getIn: 293, // "get in"
  copy: 306, // "copy itself"
  run: 333, // "get an AI"
  again: 378, // "Then do it"
  onlyOne: 540, // worm-b starts (after "only one. GLM 5.2" under the chart)
  propagate: 543, // "successfully propagated"
  allEight: 701, // "to all 8"
  runs: 737, // "in 4 out of 5"
} as const;
export const DURATION = 800;
export const CHART_GAP = [424, 540] as const; // hidden under the chart in the edit
