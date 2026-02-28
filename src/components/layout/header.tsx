"use client";

import { Cpu, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useModelStore } from "@/stores/model-store";
import { SettingsDialog } from "./settings-dialog";

export function Header() {
    const { ollamaConnected, selectedModel } = useModelStore();

    return (
        <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold tracking-tight">Plota</h1>
            </div>

            <div className="flex items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
                            <Cpu className="h-4 w-4" />
                            <span>Local Mode</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>모든 데이터가 내 PC에 저장됩니다.</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            {ollamaConnected ? (
                                <Wifi className="h-4 w-4 text-green-500" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-destructive" />
                            )}
                            <span className="sr-only">Ollama Status</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {ollamaConnected
                                ? `Ollama 연결됨 — ${selectedModel}`
                                : "Ollama 미연결 — ollama.com에서 설치해주세요"}
                        </p>
                    </TooltipContent>
                </Tooltip>

                <SettingsDialog />
            </div>
        </header>
    );
}
