import * as React from "react"
import { useParams, Link } from "wouter"
import { useGetSamBooksAgentRun, getGetSamBooksAgentRunQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { StatusBadge } from "@/components/sam-books-shared"

export default function SamBooksAgentRunDetail() {
  const { id } = useParams()
  const runId = Number(id)

  const { data, isLoading, error } = useGetSamBooksAgentRun(runId, {
    query: { enabled: Number.isInteger(runId), queryKey: getGetSamBooksAgentRunQueryKey(runId) },
  })

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading…</div>
  }
  if (error || !data) {
    return <div className="text-destructive">Failed to load this agent run.</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="-ml-4 mb-2">
        <Link href="/sam-books/agent-runs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to agent runs
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Agent run #{data.id}</h1>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-muted-foreground text-sm">{data.changeScope}</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Prompt</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-sm whitespace-pre-wrap">{data.prompt}</CardContent>
      </Card>

      {data.summary && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm whitespace-pre-wrap">{data.summary}</CardContent>
        </Card>
      )}

      {data.error && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm whitespace-pre-wrap text-destructive">{data.error}</CardContent>
        </Card>
      )}

      {data.checks.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Checks</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {data.checks.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                <StatusBadge status={c.status === "passed" ? "completed" : "failed"} />
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  {c.output && <p className="text-xs text-muted-foreground">{c.output}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-1.5">
          {data.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded.</p>
          ) : (
            data.events.map((e) => (
              <div key={e.id} className="flex items-baseline gap-3 text-xs">
                <span className="w-20 shrink-0 text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</span>
                <span className="font-medium">{e.type}</span>
                <span className="text-muted-foreground">{e.message}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
