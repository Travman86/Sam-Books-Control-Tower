import * as React from "react"
import { useState } from "react"
import { useLocation, useParams, Link } from "wouter"
import { useGetReview, useDecideReview, getGetReviewQueryKey, getListReviewsQueryKey, getGetDashboardQueryKey, ReviewDecisionDecision } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeft, Check, X, ShieldAlert, ShieldCheck, FileDiff, Bot, User, Clock } from "lucide-react"

export default function ReviewDetail() {
  const { id } = useParams()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const [note, setNote] = useState("")

  const { data: review, isLoading, error } = useGetReview(id as string, {
    query: { enabled: !!id, queryKey: getGetReviewQueryKey(id as string) }
  })

  const decideReview = useDecideReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetReviewQueryKey(id as string) })
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        toast.success("Decision recorded successfully")
        setLocation('/reviews')
      },
      onError: () => {
        toast.error("Failed to record decision")
      }
    }
  })

  const handleDecision = (decision: ReviewDecisionDecision) => {
    if (decision === 'rejected' && !note.trim()) {
      toast.error("A note is required when rejecting changes")
      return
    }
    
    decideReview.mutate({
      reviewId: id as string,
      data: { decision, note: note.trim() || undefined }
    })
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading review details...</div>
  }

  if (error || !review) {
    return <div className="text-destructive">Failed to load review details.</div>
  }

  const isPending = review.status === 'pending'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="-ml-4 mb-2">
        <Link href="/reviews">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Queue
        </Link>
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{review.title}</h1>
            {review.status === 'pending' && <Badge variant="warning" className="text-sm">Pending Review</Badge>}
            {review.status === 'approved' && <Badge variant="success" className="text-sm">Approved</Badge>}
            {review.status === 'rejected' && <Badge variant="destructive" className="text-sm">Rejected</Badge>}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Submitted {format(new Date(review.submittedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle>Change Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-muted p-4 rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {review.summary}
              </div>
            </CardContent>
          </Card>

          {!isPending && review.decisionNote && (
            <Card className={review.status === 'approved' ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50'}>
              <CardHeader className="pb-3 bg-muted/30">
                <CardTitle className="text-base flex items-center gap-2">
                  {review.status === 'approved' ? <ShieldCheck className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
                  Decision Note
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm">
                <p>{review.decisionNote}</p>
                <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Reviewed by {review.reviewer} on {review.decidedAt && format(new Date(review.decidedAt), "MMM d, yyyy")}
                </div>
              </CardContent>
            </Card>
          )}

          {isPending && (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Sign-off Required
                </CardTitle>
                <CardDescription>
                  Review the summary above and authorize or reject this AI-generated change.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reviewer Note <span className="text-muted-foreground font-normal">(required for rejection)</span></label>
                  <Textarea 
                    placeholder="Provide feedback for the agent or document your reasoning..." 
                    className="min-h-[100px] resize-y"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDecision('rejected')}
                    disabled={decideReview.isPending}
                    className="w-32"
                  >
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button 
                    onClick={() => handleDecision('approved')}
                    disabled={decideReview.isPending}
                    className="w-32 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="mr-2 h-4 w-4" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Project</span>
                <p className="font-medium mt-1">{review.projectName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Feature Boundary</span>
                <p className="font-medium mt-1">{review.featureName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Risk Level</span>
                <div className="mt-1">
                  <Badge variant={
                    review.risk === 'high' ? 'destructive' :
                    review.risk === 'medium' ? 'warning' : 'default'
                  }>
                    {review.risk}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Impact</span>
                <p className="font-medium mt-1 flex items-center gap-1.5">
                  <FileDiff className="h-4 w-4 text-muted-foreground" />
                  {review.filesChanged} files modified
                </p>
              </div>
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Builder</span>
                <p className="font-mono text-sm mt-1 flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-primary" /> {review.builder}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Required Reviewer</span>
                <p className="font-mono text-sm mt-1 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" /> {review.reviewer}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
