import * as React from "react"
import { Link } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useListManagementActions,
  useListProjects,
  useCreateManagementAction,
  useDecideManagementAction,
  useDraftManagementAction,
  getListManagementActionsQueryKey,
  getGetDashboardQueryKey,
  getListActivityQueryKey,
  ManagementActionInputActionType,
  ManagementActionInputPriority,
} from "@workspace/api-client-react"
import type { ManagementAction } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

const ACTION_TYPE_LABEL: Record<string, string> = {
  feature_request: "Feature Request",
  create_task: "Create Task",
  update_priority: "Update Priority",
  reassign_owner: "Reassign Owner",
  change_deadline: "Change Deadline",
  close_task: "Close Task",
  create_milestone: "Create Milestone",
  update_scope: "Update Scope",
}

function isDecision(id: string): id is "pending" | "approved" | "rejected" {
  return id === "pending" || id === "approved" || id === "rejected"
}

const actionSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  actionType: z.nativeEnum(ManagementActionInputActionType),
  target: z.string().min(1, "Target is required"),
  description: z.string().min(1, "Description is required"),
  requestedBy: z.string().min(1, "Requested-by is required"),
  approver: z.string().min(1, "Approver is required"),
  priority: z.nativeEnum(ManagementActionInputPriority),
  dueDate: z.string(),
})
type ActionFormValues = z.infer<typeof actionSchema>

export default function Actions() {
  const [projectFilter, setProjectFilter] = React.useState<string>("")
  const [isProposeOpen, setIsProposeOpen] = React.useState(false)
  const [aiPrompt, setAiPrompt] = React.useState("")

  const { data: actions, isLoading } = useListManagementActions({
    projectId: projectFilter || undefined,
  })
  const { data: projects } = useListProjects()

  const queryClient = useQueryClient()
  const createAction = useCreateManagementAction()
  const decideAction = useDecideManagementAction()
  const draftAction = useDraftManagementAction()
  const { toast } = useToast()

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      projectId: "",
      actionType: ManagementActionInputActionType.create_task,
      target: "",
      description: "",
      requestedBy: "agent-alpha",
      approver: "human-admin",
      priority: ManagementActionInputPriority.medium,
      dueDate: "",
    },
  })

  const handleAiFill = () => {
    if (!aiPrompt.trim()) return
    draftAction.mutate(
      { data: { prompt: aiPrompt.trim() } },
      {
        onSuccess: (draft) => {
          form.setValue("actionType", draft.actionType, { shouldValidate: true })
          form.setValue("target", draft.target, { shouldValidate: true })
          form.setValue("description", draft.description, { shouldValidate: true })
          form.setValue("priority", draft.priority, { shouldValidate: true })
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

  const onSubmit = (data: ActionFormValues) => {
    createAction.mutate(
      { data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null } },
      {
        onSuccess: () => {
          toast({ title: "Proposal submitted", description: "The management action was successfully proposed." })
          setIsProposeOpen(false)
          queryClient.invalidateQueries({ queryKey: getListManagementActionsQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
          queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() })
          setAiPrompt("")
          form.reset()
        },
      },
    )
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Management Actions</h1>
          <p className="text-muted-foreground mt-1">
            Govern project-management actions proposed by AI agents. Drag a card between columns to decide it, or move it back to Pending to undo.
          </p>
        </div>

        <Dialog open={isProposeOpen} onOpenChange={setIsProposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Propose Action
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Propose Management Action</DialogTitle>
              <DialogDescription>Submit a new project modification or task for human approval.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <Input
                className="bg-background"
                placeholder={'Describe it in one line, e.g. "reprioritize the export button work to urgent"'}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={handleAiFill} disabled={draftAction.isPending || !aiPrompt.trim()}>
                {draftAction.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Sparkles className="mr-2 w-4 h-4" />}
                AI Fill
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ACTION_TYPE_LABEL).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="target"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Target</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. TASK-1234 or v2.0 Release" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Why is this action needed?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested By (Agent ID)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="approver"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designated Approver</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsProposeOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createAction.isPending}>
                    {createAction.isPending ? "Submitting..." : "Submit Proposal"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-muted/40 p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2 mr-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter</span>
        </div>
        <Select value={projectFilter || "all"} onValueChange={(v) => setProjectFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[250px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
