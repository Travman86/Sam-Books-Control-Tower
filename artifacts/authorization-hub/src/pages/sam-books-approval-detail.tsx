import * as React from "react"
import { useState } from "react"
import { useLocation, useParams, Link } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import {
  useGetSamBooksFeatureRequest,
  useDecideSamBooksFeatureRequest,
  getGetSamBooksFeatureRequestQueryKey,
  getGetSamBooksOverviewQueryKey,
} from "@workspace/api-client-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Check, X, RotateCcw, ShieldCheck } from "lucide-react"
import { StatusBadge, relativeTime } from "@/components/sam-books-shared"

export default function SamBooksApprovalDetail() {
  const { id } = useParams()
  const featureRequestId = Number(id)
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState("")

  const { data, isLoading, error } = useGetSamBooksFeatureRequest(featureRequestId, {
    query: { enabled: Number.isInteger(featureRequestId), queryKey: getGetSamBooksFeatureRequestQueryKey(featureRequestId) },
  })

  const decide = useDecideSamBooksFeatureRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSamBooksFeatureRequestQueryKey(featureRequestId) })
        queryClient.invalidateQueries({ queryKey: ["/api/sam-books/feature-requests"] })
        queryClient.invalidateQueries({ queryKey: getGetSamBooksOverviewQueryKey() })
        toast.success("Decision recorded on Sam Books")
        setLocation("/sam-books/approvals")
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to record decision")
      },
    },
  })

  const handleDecision = (decision: "approved" | "rejected" | "changes_requested") => {
    decide.mutate({ featureRequestId, data: { decision, comment: comment.trim() || undefined } })
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading…</div>
  }
  if (error || !data) {
    return <div className="text-destructive">Failed to load this feature request.</div>
  }

  const pending = data.status === "submitted"

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="-ml-4 mb-2">
        <Link href="/sam-books/approvals">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to approvals
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {data.organization.name} · {data.module.name} · {data.changeScope} · requested by {data.requester.name}
          {data.requester.email ? ` (${data.requester.email})` : ""}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Problem</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm whitespace-pre-wrap">{data.problem || "—"}</CardContent>
          </Card>

          {data.outcome && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Desired outcome</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm whitespace-pre-wrap">{data.outcome}</CardContent>
            </Card>
          )}

          {data.requirements.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {data.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.wireframes.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">
                  Wireframe (v{data.wireframes[data.wireframes.length - 1]!.version})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                  {data.wireframes[data.wireframes.length - 1]!.content}
                </pre>
              </CardContent>
            </Card>
          )}

          {pending && (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Decision
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Textarea
                  placeholder="Optional comment for the requester…"
                  className="min-h-[100px] resize-y"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex flex-wrap gap-3 justify-end">
                  <Button variant="outline" onClick={() => handleDecision("changes_requested")} disabled={decide.isPending}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Request changes
                  </Button>
                  <Button variant="destructive" onClick={() => handleDecision("rejected")} disabled={decide.isPending}>
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button onClick={() => handleDecision("approved")} disabled={decide.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                    <Check className="mr-2 h-4 w-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {data.decisions.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Decision history</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {data.decisions.map((d) => (
                  <div key={d.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={d.decision} />
                      <span className="text-xs text-muted-foreground">{relativeTime(d.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">by {d.decidedBy}</p>
                    {d.comment && <p className="mt-1">{d.comment}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data.audit.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Audit trail</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-xs">
                {data.audit.map((a) => (
                  <div key={a.id} className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground">
                      {a.actor} · {relativeTime(a.createdAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
