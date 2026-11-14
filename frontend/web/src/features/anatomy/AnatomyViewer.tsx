/** TEMPORARY placeholder. Replaced by the anatomy agent; keep the exported API. */
export interface AnatomyViewerProps {
  /** Fills its parent. Reads selection, region status and live vitals from useAppStore. */
  className?: string
}

export function AnatomyViewer({ className }: AnatomyViewerProps) {
  return <div className={className}>3D anatomy placeholder</div>
}
