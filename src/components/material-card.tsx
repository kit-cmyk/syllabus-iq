import ReactMarkdown from "react-markdown";
import { BookOpen, Play, ChevronDown, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconBubble } from "@/components/ui/icon-bubble";
import { toEmbedUrl } from "@/lib/video";

export type Material = {
  id: string;
  type: "reading" | "video";
  title: string;
  body: string | null;
  video_url: string | null;
  duration_minutes: number | null;
};

export function MaterialCard({
  material,
  defaultOpen = false,
}: {
  material: Material;
  defaultOpen?: boolean;
}) {
  if (material.type === "video" && material.video_url) {
    const embed = toEmbedUrl(material.video_url);
    return (
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-3.5 p-5">
          <IconBubble className="bg-learning-bg text-learning">
            <Play size={20} strokeWidth={1.75} />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-ink-900">
              {material.title}
            </div>
            <div className="text-[13px] text-ink-400">
              Video{material.duration_minutes ? ` · ${material.duration_minutes} min` : ""}
            </div>
          </div>
        </div>
        {embed ? (
          <div className="aspect-video w-full bg-ink-900">
            <iframe
              src={embed}
              title={material.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={material.video_url}
            target="_blank"
            rel="noreferrer"
            className="mx-5 mb-5 inline-flex items-center gap-2 text-[14px] font-semibold text-brand hover:underline"
          >
            Watch on external site <ExternalLink size={14} />
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3.5 p-5">
          <IconBubble>
            <BookOpen size={20} strokeWidth={1.75} />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-ink-900">
              {material.title}
            </div>
            <div className="text-[13px] text-ink-400">
              Reading{material.duration_minutes ? ` · ${material.duration_minutes} min` : ""}
            </div>
          </div>
          <ChevronDown
            size={18}
            className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="prose-siq border-t border-line px-6 pb-6 pt-1 sm:px-19">
          <ReactMarkdown>{material.body ?? ""}</ReactMarkdown>
        </div>
      </details>
    </Card>
  );
}
