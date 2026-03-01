const OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:7b";

let currentAbortController: AbortController | null = null;

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
}

export interface GenerateStats {
  numTokens: number;
  elapsedMs: number;
  tokensPerSecond: number;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(OLLAMA_BASE_URL, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  const data = await res.json();
  return data.models ?? [];
}

const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF]/;

export async function generate(
  prompt: string,
  systemInstruction: string,
  onToken: (token: string) => void,
  model: string = DEFAULT_MODEL,
): Promise<GenerateStats> {
  currentAbortController = new AbortController();

  const systemContent =
    systemInstruction ||
    "당신은 글쓰기 보조 AI입니다. 다음 텍스트를 개선해서 출력하세요. 원본의 의미를 살리고 더 자연스럽게 만드세요.";

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
      stream: true,
      options: {
        stop: ["---", "```", "##", "**Note", "注意", "这样"],
      },
    }),
    signal: currentAbortController.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let numTokens = 0;
  const genStart = performance.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      let cjkDetected = false;
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            if (CJK_REGEX.test(json.message.content)) {
              cjkDetected = true;
              break;
            }
            onToken(json.message.content);
            numTokens++;
          }
        } catch {
          // skip malformed JSON lines
        }
      }

      if (cjkDetected) {
        currentAbortController?.abort();
        break;
      }
    }
  } finally {
    currentAbortController = null;
  }

  const elapsedMs = performance.now() - genStart;
  return {
    numTokens,
    elapsedMs: Math.round(elapsedMs),
    tokensPerSecond: elapsedMs > 0 ? +((numTokens / elapsedMs) * 1000).toFixed(1) : 0,
  };
}

export function abort() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}
