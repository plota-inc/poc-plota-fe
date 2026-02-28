"use client";

import {
  Sparkles,
  RefreshCw,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAIStore } from "@/stores/ai-store";
import { useModelStore } from "@/stores/model-store";
import { generate, checkHealth, abort } from "@/lib/ollama-client";
import { openExternal } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "warn" | "success" | "error";
}

function timestamp() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

export function SidebarRight() {
  const {
    selectedText,
    generatedText,
    status: aiStatus,
    setGeneratedText,
    appendToken,
    setStatus,
    setError,
  } = useAIStore();
  const {
    selectedModel,
    ollamaConnected,
    modelNotFound,
    setOllamaConnected,
    setModelNotFound,
  } = useModelStore();
  const [instruction, setInstruction] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      setLogs((prev) => [...prev, { time: timestamp(), message, type }]);
    },
    [],
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function check() {
      const connected = await checkHealth();
      setOllamaConnected(connected);
    }

    check();
    interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [setOllamaConnected]);

  const hasSelection = selectedText.trim().length > 0;
  const isGenerating = aiStatus === "generating";

  const handleGenerate = async () => {
    if (!selectedText) return;

    if (!ollamaConnected) {
      setError("Ollama가 실행 중이 아닙니다. ollama.com에서 설치 후 실행해주세요.");
      return;
    }

    try {
      setStatus("generating");
      setGeneratedText("");
      setError(null);
      setModelNotFound(false);

      addLog(`모델: ${selectedModel}`);
      addLog("텍스트 생성 시작...");

      const stats = await generate(
        selectedText,
        instruction,
        (token: string) => {
          appendToken(token);
        },
        selectedModel,
      );

      addLog(
        `생성 완료: ${stats.numTokens} tokens / ${(stats.elapsedMs / 1000).toFixed(1)}s (${stats.tokensPerSecond} tok/s)`,
        "success",
      );
      setLogsOpen(true);
      setStatus("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        addLog("생성이 중단되었습니다.", "warn");
        setStatus("idle");
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("AI Generation Error:", err);
      addLog(`에러: ${message}`, "error");
      setError(message);
      if (message.includes("not found") || message.includes("404")) {
        setModelNotFound(true);
      }
    }
  };

  const handleAbort = () => {
    abort();
  };

  const handleReplace = () => {
    if (generatedText) {
      window.dispatchEvent(
        new CustomEvent("editor:replace", { detail: { text: generatedText } }),
      );
    }
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-muted/10">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${ollamaConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span>{ollamaConnected ? "Ollama 연결됨" : "Ollama 미연결"}</span>
        </div>
      </div>

      {(!ollamaConnected || modelNotFound) && (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-destructive">
              {modelNotFound && ollamaConnected
                ? `모델 '${selectedModel}'을(를) 찾을 수 없습니다`
                : "Ollama가 실행되고 있지 않습니다"}
            </p>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {modelNotFound && ollamaConnected ? "모델 설치 방법" : "설치 방법"}
            </p>

            {!ollamaConnected && (
              <div className="space-y-1.5">
                <p className="font-medium">1. Ollama 다운로드</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 justify-start"
                  onClick={() => openExternal("https://ollama.com/download")}
                >
                  <ExternalLink className="h-3 w-3" />
                  ollama.com/download 에서 설치
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="font-medium">
                {!ollamaConnected ? "2. 모델 다운로드 (터미널에서 실행)" : "터미널에서 모델 다운로드"}
              </p>
              <button
                className="w-full text-left font-mono text-[11px] bg-zinc-900 text-zinc-300 px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(`ollama pull ${selectedModel}`);
                }}
              >
                <span>$ ollama pull {selectedModel}</span>
                <Copy className="h-3 w-3 text-zinc-500 shrink-0" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="font-medium">
                {!ollamaConnected ? "3. 실행 확인" : "다운로드 완료 후"}
              </p>
              <p className="text-muted-foreground/80">
                {modelNotFound && ollamaConnected
                  ? "모델 다운로드 후 다시 Generate를 눌러주세요."
                  : "설치 후 Ollama가 자동 실행됩니다. 연결되면 위 상태가 초록색으로 변합니다."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log area */}
      {logs.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setLogsOpen(!logsOpen)}
            className="flex w-full items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {logsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Terminal className="h-3 w-3" />
            <span>Logs ({logs.length})</span>
          </button>

          {logsOpen && (
            <div className="max-h-40 overflow-y-auto bg-zinc-950 px-3 py-2 font-mono text-[10px] leading-relaxed">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "warn"
                        ? "text-yellow-400"
                        : log.type === "success"
                          ? "text-green-400"
                          : "text-zinc-400"
                  }
                >
                  <span className="text-zinc-600 mr-1.5">{log.time}</span>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {!hasSelection && (
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-20" />
            <div>
              <p className="text-sm font-medium mb-1">
                Select text to improve
              </p>
              <p className="text-xs">
                Highlight content in the editor and click &quot;Generate&quot; to
                see alternatives.
              </p>
            </div>
          </div>
        )}

        {hasSelection && (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Original text
                </div>
                <div className="text-sm bg-muted/40 border-l-2 border-primary/20 p-3 rounded-r-md italic">
                  &ldquo;{selectedText}&rdquo;
                </div>
              </div>

              {(generatedText || isGenerating) && (
                <div className="space-y-2">
                  <div className="text-[10px] flex items-center gap-2 font-bold text-primary uppercase tracking-wider">
                    AI Suggestion
                    {isGenerating && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                  </div>
                  <div className="text-sm border shadow-sm p-4 rounded-xl min-h-[120px] leading-relaxed whitespace-pre-wrap bg-background relative">
                    {generatedText}
                    {isGenerating && (
                      <span className="animate-pulse absolute bottom-4 right-4 text-primary text-xl leading-none">
                        ...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="p-4 border-t bg-background mt-auto space-y-3 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
          <Textarea
            placeholder="Instructions (e.g. Make it more dramatic)"
            className="h-24 resize-none text-sm bg-muted/20 focus-visible:bg-background transition-colors"
            disabled={!hasSelection || isGenerating}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />

          {isGenerating ? (
            <Button
              className="w-full font-medium"
              variant="destructive"
              onClick={handleAbort}
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Stop Generating
            </Button>
          ) : !generatedText ? (
            <Button
              className="w-full font-medium"
              variant="default"
              disabled={!hasSelection || !ollamaConnected}
              onClick={handleGenerate}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Draft
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="default"
                className="font-medium"
                onClick={handleReplace}
              >
                <Check className="mr-2 h-4 w-4" />
                Replace
              </Button>
              <Button
                variant="outline"
                className="font-medium hover:bg-muted"
                onClick={handleGenerate}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
