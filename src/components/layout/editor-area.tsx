import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

export function EditorArea() {
    return (
        <div className="flex-1 flex justify-center bg-[var(--editor-background)] py-10 px-4 sm:px-8">
            <ScrollArea className="w-full h-full max-w-4xl bg-background shadow-xl rounded-xl ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden border">
                <div className="p-12 sm:p-16 min-h-[calc(100vh-10rem)]">
                    <input
                        type="text"
                        className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-8 text-foreground w-full bg-transparent border-none outline-none placeholder:text-muted-foreground/30 transition-colors"
                        placeholder="Untitled Document"
                        defaultValue="Untitled Document"
                    />
                    <div className="prose-lg max-w-none">
                        <TiptapEditor />
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
