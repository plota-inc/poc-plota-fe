"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { useDocumentStore } from "@/stores/document-store";
import { useI18nStore } from "@/stores/i18n-store";
import { getDocument } from "@/lib/db";

export function EditorArea() {
    const { currentDocId, updateTitle } = useDocumentStore();
    const { t } = useI18nStore();
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (!currentDocId) {
            setTitle("");
            return;
        }

        let cancelled = false;
        getDocument(currentDocId).then((doc) => {
            if (!cancelled) {
                setTitle(doc?.title ?? "");
            }
        });

        return () => {
            cancelled = true;
        };
    }, [currentDocId]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateTitle(newTitle);
    };

    if (!currentDocId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[var(--editor-background)]">
                <p className="text-muted-foreground">{t("sidebarLeft.noDocuments")}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex justify-center bg-[var(--editor-background)] py-10 px-4 sm:px-8">
            <ScrollArea className="w-full h-full max-w-4xl bg-background shadow-xl rounded-xl ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden border">
                <div className="p-12 sm:p-16 min-h-[calc(100vh-10rem)]">
                    <input
                        type="text"
                        className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-8 text-foreground w-full bg-transparent border-none outline-none placeholder:text-muted-foreground/30 transition-colors"
                        placeholder={t("sidebarLeft.untitledDocument")}
                        value={title}
                        onChange={handleTitleChange}
                    />
                    <div className="prose-lg max-w-none">
                        <TiptapEditor />
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
