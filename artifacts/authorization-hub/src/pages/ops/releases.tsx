import { GoLink, Empty, PageHeader, Panel } from "@/components/ops-ui"

export default function Releases() {
  return (
    <>
      <PageHeader title="Releases" sub="Whether a change shipped and whether it affected users." />
      <div className="space-y-4">
        <Panel title="Deployment events">
          <Empty title="Not available: deployment feed">The connected API does not supply deployment or release events, so releases cannot be correlated with failures.</Empty>
        </Panel>
        <Panel title="Related governance evidence" note="Project connections and revisions are code-governance records. They are not deployment events.">
          <div className="flex gap-6">
            <GoLink href="/projects">Connected projects</GoLink>
            <GoLink href="/sam-books/projects">Sam Books projects and revisions</GoLink>
          </div>
        </Panel>
      </div>
    </>
  )
}
