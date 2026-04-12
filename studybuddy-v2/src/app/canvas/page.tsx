import ZenCanvas from "@/components/ZenCanvas";

export const dynamic = "force-dynamic";

export default function CanvasPage() {
    return (
        <div id="canvas-spirit-board" className="h-[calc(100vh-100px)] flex flex-col relative overflow-hidden">
            <ZenCanvas />
        </div>
    );
}