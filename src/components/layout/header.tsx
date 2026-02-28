"use client";

import { CloudOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useModelStore } from "@/stores/model-store";
import { SettingsDialog } from "./settings-dialog";

export function Header() {
    const { status } = useModelStore();

    return (
        <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold tracking-tight">Plota</h1>
            </div>

            <div className="flex items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
                            <CloudOff className="h-4 w-4" />
                            <span>Offline Mode</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Your work is saved locally in your browser.</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Model Status</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {status === "ready"
                                ? "AI Model is ready"
                                : status === "downloading"
                                    ? "Downloading model..."
                                    : status === "compiling"
                                        ? "Compiling shaders..."
                                        : "AI Model is not downloaded"}
                        </p>
                    </TooltipContent>
                </Tooltip>

                <SettingsDialog />
            </div>
        </header>
    );
}
