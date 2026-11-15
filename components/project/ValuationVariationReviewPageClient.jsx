"use client"

import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import ValuationVariationReviewView from "@/components/project/ValuationVariationReviewView"

export default function ValuationVariationReviewPageClient({ projectId, variationId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <ValuationVariationReviewView
              projectId={projectId}
              projectName={project.name}
              variationId={variationId}
            />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
