"use client";

import {
  Sparkles,
  RefreshCw,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAIStore } from "@/stores/ai-store";
import { useModelStore, type ModelStatus } from "@/stores/model-store";
import { getLLMProxy } from "@/lib/llm-client";
import * as Comlink from "comlink";
import { useState, useCallback } from "react";

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
    status: modelStatus,
    progress,
    setStatus: setModelStatus,
    setProgress,
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

  const hasSelection = selectedText.trim().length > 0;
  const isGenerating = aiStatus === "generating";
  const isLoadingModel =
    modelStatus === "downloading" || modelStatus === "compiling";

  const handleGenerate = async () => {
    if (!selectedText) return;

    try {
      setStatus("generating");
      setGeneratedText("");
      setError(null);

      const llm = getLLMProxy();

      const loaded = await llm.isLoaded();
      if (!loaded) {
        addLog("모델 로딩 시작...");
        setModelStatus("downloading");
        await llm.load(
          Comlink.proxy((p: number) => {
            setProgress(p);
          }),
          Comlink.proxy((status: string) => {
            setModelStatus(status as ModelStatus);
            if (status === "compiling") addLog("셰이더 컴파일 중...");
          }),
        );

        const info = await llm.getModelInfo();
        addLog(
          `모델 로드 완료 (${(info.loadTimeMs / 1000).toFixed(1)}s)`,
          "success",
        );
        addLog(`모델: ${info.modelId}`, "info");
        addLog(
          `디바이스: ${info.device.toUpperCase()} / dtype: ${info.dtype}`,
          info.device === "webgpu" ? "success" : "warn",
        );
        setLogsOpen(true);
      }

      addLog("텍스트 생성 시작...");

      const stats = await llm.generate(
        selectedText,
        instruction,
        Comlink.proxy((token: string) => {
          appendToken(token);
        }),
      );

      if (stats) {
        addLog(
          `생성 완료: ${stats.numTokens} tokens / ${(stats.elapsedMs / 1000).toFixed(1)}s (${stats.tokensPerSecond} tok/s)`,
          "success",
        );
      }

      setStatus("done");
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      addLog(`에러: ${err.message || "Unknown error"}`, "error");
      setError(err.message || "Failed to generate text");
      setModelStatus("error");
    }
  };

  const getButtonLabel = () => {
    if (isGenerating) return "Generating...";
    if (modelStatus === "compiling") return "Compiling Shaders...";
    if (modelStatus === "downloading") return "Loading Model...";
    return "Generate Draft";
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-muted/10">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">AI Assistant</h2>
        </div>

        {isLoadingModel && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              {modelStatus === "compiling"
                ? "Compiling shaders..."
                : `Downloading... ${Math.round(progress)}%`}
            </span>
          </div>
        )}
      </div>

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

          {!generatedText || isGenerating ? (
            <div className="flex gap-2">
              <Button
                className="flex-1 w-full font-medium"
                variant="default"
                disabled={!hasSelection || isGenerating || isLoadingModel}
                onClick={handleGenerate}
              >
                {isGenerating || isLoadingModel ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {getButtonLabel()}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="default" className="font-medium">
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
