import * as Comlink from "comlink";
import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

const WEBGPU_MODEL_ID = "onnx-community/Llama-3.2-1B-Instruct-ONNX";
const WEBGPU_DTYPE = "q4f16";
const WASM_MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const WASM_DTYPE = "q4";

// v4 preview types are incomplete — runtime API (callable tokenizer, apply_chat_template) works correctly
let tokenizer: any = null;
let model: any = null;
let activeDevice: "webgpu" | "wasm" = "webgpu";
let activeModelId: string = WEBGPU_MODEL_ID;
let activeDtype: string = WEBGPU_DTYPE;
let loadTimeMs = 0;

const stopping_criteria = new InterruptableStoppingCriteria();

const llmWorker = {
  async load(
    onProgress: (progress: number) => void,
    onStatus: (status: string) => void,
  ) {
    const { env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;

    const progress_callback = (info: any) => {
      if (info.status === "progress" && typeof info.progress === "number") {
        onProgress(info.progress);
      }
    };

    const t0 = performance.now();

    try {
      onStatus("downloading");

      [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(WEBGPU_MODEL_ID, { progress_callback }),
        AutoModelForCausalLM.from_pretrained(WEBGPU_MODEL_ID, {
          dtype: WEBGPU_DTYPE,
          device: "webgpu",
          progress_callback,
        }),
      ]) as any;

      activeDevice = "webgpu";
      activeModelId = WEBGPU_MODEL_ID;
      activeDtype = WEBGPU_DTYPE;
    } catch (e) {
      console.warn("WebGPU failed, falling back to WASM:", e);
      onStatus("downloading");
      onProgress(0);

      [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(WASM_MODEL_ID, { progress_callback }),
        AutoModelForCausalLM.from_pretrained(WASM_MODEL_ID, {
          dtype: WASM_DTYPE,
          device: "wasm",
          progress_callback,
        }),
      ]) as any;

      activeDevice = "wasm";
      activeModelId = WASM_MODEL_ID;
      activeDtype = WASM_DTYPE;
    }

    onStatus("compiling");
    const warmupInputs = tokenizer!("a");
    await (model as any).generate({ ...warmupInputs, max_new_tokens: 1 });

    loadTimeMs = performance.now() - t0;
    onStatus("ready");
  },

  async generate(
    prompt: string,
    customInstruction: string,
    onToken: (token: string) => void,
  ) {
    if (!tokenizer || !model) {
      throw new Error("Model not loaded. Call load() first.");
    }

    const messages = [
      {
        role: "system",
        content:
          customInstruction ||
          "당신은 글쓰기 보조 AI입니다. 다음 텍스트를 개선해서 출력하세요. 원본의 의미를 살리고 더 자연스럽게 만드세요.",
      },
      { role: "user", content: prompt },
    ];

    const inputs = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
    });

    let numTokens = 0;
    const genStart = performance.now();

    const streamer = new TextStreamer(tokenizer as any, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        onToken(text);
      },
      token_callback_function: () => {
        numTokens++;
      },
    });

    stopping_criteria.reset();

    await (model as any).generate({
      ...inputs,
      max_new_tokens: 512,
      do_sample: true,
      temperature: 0.7,
      streamer,
      stopping_criteria,
    });

    const elapsedMs = performance.now() - genStart;
    return {
      numTokens,
      elapsedMs: Math.round(elapsedMs),
      tokensPerSecond: +(numTokens / (elapsedMs / 1000)).toFixed(1),
    };
  },

  interrupt() {
    stopping_criteria.interrupt();
  },

  isLoaded() {
    return tokenizer !== null && model !== null;
  },

  getDevice() {
    return activeDevice;
  },

  getModelInfo() {
    return {
      modelId: activeModelId,
      device: activeDevice,
      dtype: activeDtype,
      loadTimeMs: Math.round(loadTimeMs),
    };
  },

  async clearCache() {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes("transformers-cache")) {
          await caches.delete(cacheName);
        }
      }
      tokenizer = null;
      model = null;
      return true;
    } catch (e) {
      console.error("Failed to clear cache:", e);
      return false;
    }
  },
};

export type LLMWorker = typeof llmWorker;

Comlink.expose(llmWorker);
