import { describe, expect, it } from "vitest";
import {
  MISSIONS,
  STAGE_IDS,
  STAGE_CORPORA,
  UI_STRINGS,
  RANK_BLURBS,
  createMission,
  advance,
  stageProgress,
  missionProgress,
  elapsedSeconds,
  keysPerSecond,
  rank,
  totalKeys,
  titleFor,
  loadStats,
  saveClear,
} from "../public/mission.js";

function storageStub() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe("missions data", () => {
  it("has 3 missions with EN and JA copy", () => {
    expect(MISSIONS.length).toBe(3);
    for (const m of MISSIONS) {
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.keysPerStage.length).toBe(3);
      for (const k of m.keysPerStage) expect(k).toBeGreaterThan(0);
      expect(m.en.name.length).toBeGreaterThan(4);
      expect(m.ja.name.length).toBeGreaterThan(2);
      expect(m.en.brief.length).toBeGreaterThan(10);
      expect(m.ja.brief.length).toBeGreaterThan(6);
    }
  });

  it("stage corpora exist for all three stages", () => {
    for (const stage of STAGE_IDS) {
      expect(STAGE_CORPORA[stage].length).toBeGreaterThan(80);
    }
  });
});

describe("mission flow", () => {
  it("starts at stage 0 with zero keys", () => {
    const state = createMission("mainframe");
    expect(state.stageIndex).toBe(0);
    expect(state.keysThisStage).toBe(0);
    expect(state.keystrokes).toBe(0);
    expect(state.finishedAt).toBeNull();
  });

  it("clears stage 1 after 70 keys, advancing to stage 1", () => {
    let state = createMission("mainframe");
    let result = { state, stageCleared: false, missionCleared: false };
    for (let i = 0; i < 70; i += 1) {
      result = advance(result.state, "mainframe");
    }
    expect(result.stageCleared).toBe(true);
    expect(result.missionCleared).toBe(false);
    expect(result.state.stageIndex).toBe(1);
    expect(result.state.keystrokes).toBe(70);
  });

  it("completes the mission after all stage keys", () => {
    let state = createMission("mainframe");
    let result = { state, stageCleared: false, missionCleared: false };
    const total = totalKeys("mainframe");
    for (let i = 0; i < total; i += 1) {
      result = advance(result.state, "mainframe");
    }
    expect(result.missionCleared).toBe(true);
    expect(result.state.finishedAt).not.toBeNull();
    expect(result.state.keystrokes).toBe(total);
  });

  it("progress never exceeds 1", () => {
    let state = createMission("weights");
    let result = { state, stageCleared: false, missionCleared: false };
    for (let i = 0; i < 10; i += 1) {
      result = advance(result.state, "weights");
    }
    expect(stageProgress(result.state, "weights")).toBeLessThanOrEqual(1);
    expect(missionProgress(result.state, "weights")).toBeLessThanOrEqual(1);
  });
});

describe("measurement", () => {
  it("KPS is keystrokes over elapsed seconds", () => {
    const state = {
      missionId: "mainframe",
      stageIndex: 0,
      keysThisStage: 10,
      startedAt: 0,
      finishedAt: 2000,
      keystrokes: 10,
    };
    expect(keysPerSecond(state)).toBeCloseTo(5, 0);
  });

  it("advance is terminal after completion (repeated calls change nothing)", () => {
    let state = createMission("mainframe");
    const total = totalKeys("mainframe");
    let result = { state, stageCleared: false, missionCleared: false };
    for (let i = 0; i < total; i += 1) {
      result = advance(result.state, "mainframe");
    }
    expect(result.missionCleared).toBe(true);
    const frozen = result.state;
    const again = advance(frozen, "mainframe");
    expect(again.state).toBe(frozen);
    expect(again.missionCleared).toBe(false);
    expect(again.state.keystrokes).toBe(total);
  });

  it("rank thresholds map correctly", () => {
    expect(rank(9)).toBe("S");
    expect(rank(8)).toBe("S");
    expect(rank(7.9)).toBe("A");
    expect(rank(5)).toBe("A");
    expect(rank(4.9)).toBe("B");
    expect(rank(3)).toBe("B");
    expect(rank(2.9)).toBe("C");
  });

  it("elapsedSeconds has a floor to avoid divide-by-zero", () => {
    const state = {
      missionId: "mainframe",
      stageIndex: 0,
      keysThisStage: 0,
      startedAt: Date.now(),
      finishedAt: null,
      keystrokes: 0,
    };
    expect(elapsedSeconds(state)).toBeGreaterThan(0);
  });
});

describe("titles and strings", () => {
  it("title tiers by cleared count in both languages", () => {
    expect(titleFor(0, "en")).toBe("Script Kiddie");
    expect(titleFor(3, "en")).toBe("Console Operator");
    expect(titleFor(10, "en")).toBe("Ghost in the Wire");
    expect(titleFor(20, "en")).toBe("Legend of the Net");
    expect(titleFor(0, "ja")).toBe("スクリプトキディ");
    expect(titleFor(20, "ja")).toBe("ネットの伝説");
  });

  it("rank blurbs exist for all ranks in both languages", () => {
    for (const r of ["S", "A", "B", "C"]) {
      expect(RANK_BLURBS.en[r].length).toBeGreaterThan(3);
      expect(RANK_BLURBS.ja[r].length).toBeGreaterThan(2);
    }
  });

  it("UI strings provide stage names in both languages", () => {
    for (const stage of STAGE_IDS) {
      expect(UI_STRINGS.en.stageNames[stage].length).toBeGreaterThan(0);
      expect(UI_STRINGS.ja.stageNames[stage].length).toBeGreaterThan(0);
    }
  });
});

describe("stats persistence", () => {
  it("saves best KPS and increments cleared count", () => {
    const storage = storageStub();
    const first = saveClear(storage, "mainframe", 4.2, 0);
    expect(first.cleared).toBe(1);
    expect(first.best.mainframe).toBe(4.2);
    const second = saveClear(storage, "mainframe", 3.1, 0);
    expect(second.cleared).toBe(2);
    expect(second.best.mainframe).toBe(4.2); // keeps the max
    const third = saveClear(storage, "mainframe", 6.5, 0);
    expect(third.best.mainframe).toBe(6.5); // new record
  });

  it("loadStats tolerates empty/corrupt storage", () => {
    expect(loadStats(storageStub())).toEqual({ best: {}, cleared: 0 });
    const corrupt = storageStub();
    corrupt.setItem("hacker-keys:v1", "{not json");
    expect(loadStats(corrupt)).toEqual({ best: {}, cleared: 0 });
    const weird = storageStub();
    weird.setItem("hacker-keys:v1", JSON.stringify({ cleared: -3, best: "nope" }));
    expect(loadStats(weird)).toEqual({ best: {}, cleared: 0 });
  });

  it("saveClear survives a throwing storage", () => {
    const throwing = {
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
      removeItem: () => {},
    };
    const result = saveClear(throwing, "weights", 5, 0);
    expect(result.cleared).toBe(1);
    expect(result.best.weights).toBe(5);
  });
});
