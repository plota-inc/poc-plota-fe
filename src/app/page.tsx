import { Header } from "@/components/layout/header";
import { SidebarLeft } from "@/components/layout/sidebar-left";
import { SidebarRight } from "@/components/layout/sidebar-right";
import { EditorArea } from "@/components/layout/editor-area";

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <Header />
      <main className="flex-1 flex h-[calc(100vh-3.5rem)] w-full relative">
        <SidebarLeft />
        <EditorArea />
        <SidebarRight />
      </main>
    </div>
  );
}
