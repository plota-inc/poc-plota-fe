"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect, useRef, useCallback } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useDocumentStore } from "@/stores/document-store";
import { saveDocument, getDocument } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Sparkles, PenTool, Expand } from "lucide-react";
import { useI18nStore } from "@/stores/i18n-store";

export function TiptapEditor() {
    const { setSelectedText, setContext, setActiveMode, activeMode, setStatus, startNewConversation } = useAIStore();
    const currentDocId = useDocumentStore((s) => s.currentDocId);
    const refreshDocumentInList = useDocumentStore((s) => s.refreshDocumentInList);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentDocIdRef = useRef(currentDocId);
    const { t } = useI18nStore();

    useEffect(() => {
        currentDocIdRef.current = currentDocId;
    }, [currentDocId]);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: t("editor.placeholder"),
            }),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
            },
        },
        onUpdate: ({ editor }) => {
            const docId = currentDocIdRef.current;
            if (!docId) return;

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(async () => {
                try {
                    const existing = await getDocument(docId);
                    const now = Date.now();
                    const doc = {
                        id: docId,
                        title: existing?.title || "",
                        content: editor.getJSON(),
                        updatedAt: now,
                        createdAt: existing ? existing.createdAt : now,
                    };
                    await saveDocument(doc);
                    refreshDocumentInList(doc);
                } catch (error) {
                    console.error("Failed to save document:", error);
                }
            }, 1000);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;

            if (empty) {
                setSelectedText("");
                setContext("", "");
                return;
            }

            const doc = editor.state.doc;
            const text = doc.textBetween(from, to, " ");
            setSelectedText(text);

            const MAX_CONTEXT_CHARS = 1000;
            const rawBefore = doc.textBetween(0, from, "\n");
            const rawAfter = doc.textBetween(to, doc.content.size, "\n");
            setContext(
                rawBefore.slice(-MAX_CONTEXT_CHARS),
                rawAfter.slice(0, MAX_CONTEXT_CHARS),
            );

            if (empty && useAIStore.getState().status !== "generating") {
                setActiveMode("none");
            }
        },
    });

    const loadDocContent = useCallback(async (docId: string) => {
        if (!editor) return;
        try {
            const doc = await getDocument(docId);
            if (doc && doc.content) {
                editor.commands.setContent(doc.content as any);
            } else {
                editor.commands.clearContent();
            }
        } catch (err) {
            console.error("Error loading document:", err);
            editor.commands.clearContent();
        }
    }, [editor]);

    useEffect(() => {
        if (!editor || !currentDocId) {
            if (editor) editor.commands.clearContent();
            return;
        }
        loadDocContent(currentDocId);
    }, [editor, currentDocId, loadDocContent]);

    useEffect(() => {
        if (!editor) return;

        const handleReplace = (e: any) => {
            if (!e.detail?.text) return;
            const currentSelection = editor.state.selection;
            if (!currentSelection.empty) {
                editor.commands.insertContentAt(
                    { from: currentSelection.from, to: currentSelection.to },
                    e.detail.text
                );
            }
        };

        const handleInsert = (e: any) => {
            if (!e.detail?.text) return;
            const currentSelection = editor.state.selection;
            if (!currentSelection.empty) {
                editor.commands.insertContentAt(
                    currentSelection.to,
                    `\n\n${e.detail.text}`
                );
            }
        };

        window.addEventListener('editor:replace', handleReplace);
        window.addEventListener('editor:insert', handleInsert);

        return () => {
            window.removeEventListener('editor:replace', handleReplace);
            window.removeEventListener('editor:insert', handleInsert);
        };
    }, [editor]);

    if (!editor) {
        return <div className="animate-pulse bg-muted/20 h-96 w-full rounded-md" />;
    }

    return (
        <div className="tiptap-editor-wrapper relative">
            {editor && (
                <BubbleMenu
                    editor={editor}
                    className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800"
                        onClick={() => startNewConversation("rewrite")}
                    >
                        <PenTool className="w-3.5 h-3.5 mr-1.5" />
                        {t("editor.rewrite")}
                    </Button>
                    <div className="w-[1px] h-4 bg-zinc-800" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800"
                        onClick={() => startNewConversation("describe")}
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        {t("editor.describe")}
                    </Button>
                    <div className="w-[1px] h-4 bg-zinc-800" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800"
                        onClick={() => startNewConversation("expand")}
                    >
                        <Expand className="w-3.5 h-3.5 mr-1.5" />
                        {t("editor.expand")}
                    </Button>
                </BubbleMenu>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
