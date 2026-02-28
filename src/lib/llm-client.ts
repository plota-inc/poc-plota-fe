import * as Comlink from "comlink";
import type { LLMWorker } from "@/workers/llm.worker";

let worker: Worker | null = null;
let proxy: Comlink.Remote<LLMWorker> | null = null;

export function getLLMProxy(): Comlink.Remote<LLMWorker> {
  if (!proxy) {
    worker = new Worker(new URL("@/workers/llm.worker.ts", import.meta.url), {
      type: "module",
    });
    proxy = Comlink.wrap<LLMWorker>(worker);
  }
  return proxy;
}

export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    proxy = null;
  }
}
