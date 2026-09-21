// Hacker Keys — core logic (framework-free, testable without a DOM)

export const THEMES = {
  matrix: { name: "Matrix Green", fg: "#33ff66", dim: "#1a7a33", bg: "#050805", accent: "#baffcc" },
  cyber: { name: "Cyber Blue", fg: "#4db8ff", dim: "#1f5c8a", bg: "#04070d", accent: "#c2e7ff" },
  amber: { name: "Amber Retro", fg: "#ffb347", dim: "#8a5a1a", bg: "#0a0704", accent: "#ffe3b3" },
};



export function resolveTheme(raw) {
  if (raw && raw in THEMES) return raw;
  return "matrix";
}

// Code corpus: realistic 2026-style snippets, streamed per keystroke.
export const CODE_CORPUS = [
  `use strict;
// edge/inference worker
export async function handleRequest(req) {
  const payload = await req.json();
  const tokens = tokenize(payload.text);
  const embeddings = await embed(tokens, { model: "nemotron-embed-1b" });
  return Response.json({ dims: embeddings.dims, ms: performance.now() - t0 });
}`,
  `fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("runtime");
    rt.block_on(async move {
        let (tx, rx) = mpsc::channel(256);
        spawn_workers(tx, 8).await;
        while let Some(job) = rx.recv().await {
            trace!(job = %job.id, "dispatch");
        }
    });
}`,
  `package main

import (
    "context"
    "k8s.io/client-go/kubernetes"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func ScaleDeployment(ctx context.Context, cs *kubernetes.Clientset, name string, n int32) error {
    scale, err := cs.AppsV1().Deployments("prod").GetScale(ctx, name, metav1.GetOptions{})
    if err != nil {
        return fmt.Errorf("get scale: %w", err)
    }
    scale.Spec.Replicas = n
    _, err = cs.AppsV1().Deployments("prod").UpdateScale(ctx, name, scale, metav1.UpdateOptions{})
    return err
}`,
  `import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained(
    "zai-org/glm-5.3-flash", dtype=torch.bfloat16, device_map="auto"
)
tok = AutoTokenizer.from_pretrained("zai-org/glm-5.3-flash")

def infer(prompt: str, max_new: int = 512) -> str:
    inputs = tok(prompt, return_tensors="pt").to(model.device)
    out = model.generate(**inputs, max_new_tokens=max_new, do_sample=False)
    return tok.decode(out[0], skip_special_tokens=True)`,
  `# kubectl rollout with canary gate
kubectl -n prod set image deploy/api api=registry.internal/api:2026.9.21
kubectl -n prod rollout status deploy/api --timeout=180s
if ! kubectl -n prod get canary api -o json | jq -e '.status.healthy'; then
  kubectl -n prod rollout undo deploy/api
  exit 1
fi
echo "canary healthy: promoting"`,
  `-- migrations/2026_09_21_add_events.sql
BEGIN;
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_kind_idx ON events (kind);
COMMIT;`,
  `const [major, minor, patch] = process.versions.node.split(".").map(Number);
if (major < 20) throw new Error("node >= 20 required");

// graceful shutdown
const server = Bun.serve({ port: 8787, fetch: router });
process.on("SIGTERM", () => {
  server.stop(true);
  console.log("drained, exiting");
});`,
  `cipher_suite = "TLS_AES_256_GCM_SHA384"
handshake = ssl.SSLContext(protocol=ssl.PROTOCOL_TLS_SERVER)
handshake.set_ciphers(cipher_suite)

def audit_log(entry: dict) -> None:
    digest = hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
    with open("audit.jsonl", "a") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        fh.write(f"{digest} {json.dumps(entry)}\\n")`,
];

// Number of characters emitted per keystroke.
export const CHARS_PER_KEY = 3;

export function nextCursor(cursor, corpus = CODE_CORPUS[0]) {
  const next = cursor + CHARS_PER_KEY;
  return next >= corpus.length ? 0 : next;
}

export function visibleText(cursor, corpus = CODE_CORPUS[0]) {
  return corpus.slice(0, cursor);
}



export const OVERLAY_TEXT = {
  granted: { title: "ACCESS GRANTED", sub: "root@prod — welcome back" },
  denied: { title: "ACCESS DENIED", sub: "attempt logged · 3 retries remaining" },
};
