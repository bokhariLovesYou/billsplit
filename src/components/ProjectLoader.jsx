import { LoaderCircle } from "lucide-react"

export default function ProjectLoader({ project }) {
  return <div role="status" className="grid min-h-[calc(100dvh-4rem)] place-content-center justify-items-center gap-3 text-muted-foreground">
    <LoaderCircle aria-hidden="true" className="size-8 text-primary motion-safe:animate-spin" />
    <span className="text-sm">Loading {project}…</span>
  </div>
}
