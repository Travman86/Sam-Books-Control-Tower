import * as React from "react"
import { Link } from "wouter"
import {
  useListManagementActions,
  useListProjects,
  useCreateManagementAction,
  useDecideManagementAction,
  useDraftManagementAction,
  getListManagementActionsQueryKey,
  getGetDashboardQueryKey,
  getListActivityQueryKey,
} from "@workspace/api-client-react"
import type { ManagementAction } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ListTodo, Plus, ArrowRight, Clock, Filter, Sparkles, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const COLUMNS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
] as const

/**
 * The "red/yellow/green" at-a-glance signal is by status/column, not
 * priority: pending = yellow (awaiting a call), approved = green, rejected
 * = red. Applied as an inline style rather than a Tailwind class so it
 * always renders regardless of the host app's border/merge setup (Card's
 * own base classes already set a generic `border`, and this must win
 * reliably).
 */
const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", // yellow/amber
  approved: "#22c55e", // green
  rejected: "#ef4444", // red
}

function isDecision(id: string): id is "pending" | "approved" | "rejected" {
  return id === "pending" || id === "approved" || id === "rejected"
}

export default function Actions() {
  const [projectFilter, setProjectFilter] = React.useState<string>("")

  const { data: actions, isLoading } = useListManagementActions({
    projectId: projectFilter || undefined,
  })

  const { data: projects } = useListProjects()

  const [isProposing, setIsProposing] = React.useState(false)
  const queryClient = useQueryClient()
  const createAction = useCreateManagementAction()
  const decideAction = useDecideManagementAction()
  const draftAction = useDraftManagementAction()
  const { toast } = useToast()

  const [aiPrompt, setAiPrompt] = React.useState("")
  const [formData, setFormData] = React.useState({
    projectId: "",
    actionType: "create_task",
    target: "",
    description: "",
    requestedBy: "agent-alpha",
    approver: "human-admin",
    priority: "medium",
    dueDate: "",
  })

  const handleAiFill = () => {
    if (!aiPrompt.trim()) return
    draftAction.mutate(
      { data: { prompt: aiPrompt.trim() } },
      {
        onSuccess: (draft) => {
          setFormData((prev) => ({
            ...prev,
            actionType: draft.actionType,
            target: draft.target,
            description: draft.description,
            priority: draft.priority,
          }))
          toast({ title: "Draft filled", description: "Review the fields below, then submit." })
        },
        onError: (err) => {
          toast({
            title: "AI drafting failed",
            description: err instanceof Error ? err.message : "Check OPENAI_API_KEY on this app.",
            variant: "destructive",
          })
        },
      },
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAction.mutate({
      data: {
        ...formData,
        actionType: formData.actionType as any,
        priority: formData.priority as any,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Proposal submitted", description: "The management action was successfully proposed." })
        setIsProposing(false)
        queryClient.invalidateQueries({ queryKey: getListManagementActionsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() })
        setAiPrompt("")
        setFormData({
          projectId: "",
          actionType: "create_task",
          target: "",
          description: "",
          requestedBy: "agent-alpha",
          approver: "human-admin",
          priority: "medium",
          dueDate: "",
        })
      },
    })
  }

  const columns: Record<string, ManagementAction[]> = { pending: [], approved: [], rejected: [] }
  for (const action of actions ?? []) {
    (columns[action.status] ??= []).push(action)
  }

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return
    // Any column to any other column — approve, reject, or drag back to
    // Pending to undo a decision.
    if (!isDecision(destination.droppableId)) return

    decideAction.mutate(
      { actionId: draggableId, data: { decision: destination.droppableId } },
      {
        onSuccess: () => {
          toast({ title: `Action ${destination.droppableId}` })
          queryClient.invalidateQueries({ queryKey: getListManagementActionsQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
          queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() })
        },
        onError: (err) => {
          toast({
            title: "Could not update",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          })
        },
      },
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Management Actions</h1>
          <p className="text-muted-foreground mt-2">Govern project-management actions proposed by AI agents. Drag a card between columns to decide it, or move it back to Pending to undo.</p>
        </div>
        <Button onClick={() => setIsProposing(!isProposing)}>
          {isProposing ? "Cancel Proposal" : <><Plus className="mr-2 w-4 h-4" /> Propose Action</>}
        </Button>
      </div>

      {isProposing && (
        <Card className="border-primary/50 shadow-sm animate-in zoom-in-95 duration-200">
          <CardHeader>
            <CardTitle>Propose Management Action</CardTitle>
            <CardDescription>Submit a new project modification or task for human approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-col sm:flex-row gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={'Describe it in one line, e.g. "reprioritize the export button work to urgent"'}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={handleAiFill} disabled={draftAction.isPending || !aiPrompt.trim()}>
                {draftAction.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Sparkles className="mr-2 w-4 h-4" />}
                AI Fill
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.projectId}
                    onChange={e => setFormData({...formData, projectId: e.target.value})}
                  >
                    <option value="" disabled>Select a project</option>
                    {projects?.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Action Type</label>
                  <select
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.actionType}
                    onChange={e => setFormData({...formData, actionType: e.target.value})}
                  >
                    <option value="feature_request">Feature Request</option>
                    <option value="create_task">Create Task</option>
                    <option value="update_priority">Update Priority</option>
                    <option value="reassign_owner">Reassign Owner</option>
                    <option value="change_deadline">Change Deadline</option>
                    <option value="close_task">Close Task</option>
                    <option value="create_milestone">Create Milestone</option>
                    <option value="update_scope">Update Scope</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Target (Ticket ID, Milestone name, etc.)</label>
                  <input
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.target}
                    onChange={e => setFormData({...formData, target: e.target.value})}
                    placeholder="e.g. TASK-1234 or v2.0 Release"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    required
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Why is this action needed?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date (Optional)</label>
                  <input
                    type="date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Requested By (Agent ID)</label>
                  <input
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.requestedBy}
                    onChange={e => setFormData({...formData, requestedBy: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Designated Approver</label>
                  <input
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.approver}
                    onChange={e => setFormData({...formData, approver: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={createAction.isPending}>
                  {createAction.isPending ? "Submitting..." : "Submit Proposal"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-muted/40 p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2 mr-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter</span>
        </div>
        <select
          className="flex h-9 w-full sm:w-[250px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 text-muted-foreground animate-pulse">Loading actions...</div>
      ) : (actions?.length ?? 0) === 0 ? (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground">No actions found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">There are no management actions matching your filter criteria right now.</p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "rounded-lg border border-border bg-muted/20 p-3 min-h-[200px] space-y-3",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30",
                    )}
                  >
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-sm font-semibold">{column.label}</span>
                      <Badge variant="outline" className="font-mono">{columns[column.id]?.length ?? 0}</Badge>
                    </div>

                    {columns[column.id]?.map((action, index) => (
                      <Draggable key={action.id} draggableId={action.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <Card
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              borderLeftWidth: 4,
                              borderLeftColor: STATUS_COLOR[action.status] ?? "#9ca3af",
                            }}
                            className={cn(
                              "overflow-hidden transition-shadow hover:shadow-sm cursor-grab active:cursor-grabbing",
                              dragSnapshot.isDragging && "shadow-lg ring-2 ring-primary/40",
                            )}
                          >
                            <CardContent className="p-3.5 space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="font-mono text-[10px] bg-background">{action.projectName}</Badge>
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {action.actionType.replace(/_/g, " ")}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {action.priority} priority
                                </span>
                                <span
                                  className="ml-auto flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
                                  style={{ color: STATUS_COLOR[action.status] ?? "#9ca3af" }}
                                >
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: STATUS_COLOR[action.status] ?? "#9ca3af" }}
                                  />
                                  {action.status}
                                </span>
                              </div>
                              <p className="text-sm font-semibold leading-snug">{action.target}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
                              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(action.submittedAt), { addSuffix: true })}
                                </span>
                                <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                  <Link href={`/actions/${action.id}`}>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  )
}
