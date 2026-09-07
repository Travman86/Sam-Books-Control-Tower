import * as React from "react"
import { Link, useLocation } from "wouter"
import { 
  useGetManagementAction, 
  useDecideManagementAction, 
  getGetManagementActionQueryKey, 
  getListManagementActionsQueryKey, 
  getGetDashboardQueryKey, 
  getListActivityQueryKey 
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, ShieldCheck, ShieldAlert, Check, X, FileText, Calendar, User } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function ActionDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const { data: action, isLoading, error } = useGetManagementAction(id)
  const decideAction = useDecideManagementAction()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [rejectNote, setRejectNote] = React.useState("")
  const [isRejecting, setIsRejecting] = React.useState(false)

  if (isLoading) return <div className="flex justify-center p-24"><div className="animate-pulse text-muted-foreground">Loading action details...</div></div>
  if (error || !action) return <div className="p-24 text-center text-destructive font-medium">Action not found or error loading.</div>

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !rejectNote.trim()) {
      toast({ title: "Note required", description: "You must provide a reason for rejection.", variant: "destructive" })
      return
    }

    decideAction.mutate({
      actionId: id,
      data: {
        decision,
        ...(decision === 'rejected' ? { note: rejectNote } : {})
      }
    }, {
      onSuccess: () => {
        toast({ title: `Action ${decision}`, description: `The management action was successfully ${decision}.` })
        queryClient.invalidateQueries({ queryKey: getGetManagementActionQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: getListManagementActionsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() })
        setIsRejecting(false)
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground hover:text-foreground">
          <Link href="/actions"><ArrowLeft className="mr-2 w-4 h-4" /> Back to Queue</Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <Badge variant="outline" className="font-mono bg-background border-primary/20">{action.projectName}</Badge>
              <Badge variant={
                action.priority === 'urgent' ? 'destructive' :
                action.priority === 'high' ? 'default' :
                action.priority === 'medium' ? 'secondary' : 'outline'
              }>
                {action.priority} priority
              </Badge>
              {action.status === 'pending' && <Badge variant="warning" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Approval</Badge>}
              {action.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>}
              {action.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-1">{action.target}</h1>
            <p className="text-sm font-medium uppercase tracking-wider text-primary mt-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> {action.actionType.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action Rationale & Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-md text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {action.description}
              </div>
            </CardContent>
          </Card>

          {action.status !== 'pending' && (
            <Card className={action.status === 'approved' ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {action.status === 'approved' ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-destructive" />}
                  Decision: {action.status.toUpperCase()}
                </CardTitle>
                <CardDescription>Decided on {format(new Date(action.decidedAt || action.submittedAt), "PPpp")}</CardDescription>
              </CardHeader>
              {action.decisionNote && (
                <CardContent>
                  <div className="bg-background/80 p-4 rounded-md border text-sm italic shadow-sm">
                    "{action.decisionNote}"
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {action.status === 'pending' && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader>
                <CardTitle>Authorization Controls</CardTitle>
                <CardDescription>Review this project management request carefully before proceeding.</CardDescription>
              </CardHeader>
              <CardContent>
                {isRejecting ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Reason for Rejection
                      </label>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-destructive/50 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                        placeholder="Please explain why this action cannot proceed..."
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setIsRejecting(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => handleDecision('rejected')} disabled={decideAction.isPending}>
                        {decideAction.isPending ? "Submitting..." : "Confirm Rejection"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6" 
                      onClick={() => handleDecision('approved')}
                      disabled={decideAction.isPending}
                    >
                      <Check className="mr-2 w-5 h-5" /> Approve Action
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1 py-6"
                      onClick={() => setIsRejecting(true)}
                      disabled={decideAction.isPending}
                    >
                      <X className="mr-2 w-5 h-5" /> Reject Action
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Requested By</p>
                  <p className="text-sm text-muted-foreground">{action.requestedBy}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Designated Approver</p>
                  <p className="text-sm text-muted-foreground">{action.approver}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Submitted</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(action.submittedAt), "PP p")}</p>
                </div>
              </div>
              {action.dueDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Target Due Date</p>
                    <p className="text-sm text-primary/80">{format(new Date(action.dueDate), "PP")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
