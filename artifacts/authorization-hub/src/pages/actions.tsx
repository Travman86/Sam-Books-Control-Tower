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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowRight, Clock, Filter, Sparkles, Loader2, GripVertical, CheckCircle2, CircleDashed, XCircle, LayoutList } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const COLUMNS = [
  { id: "pending", label: "Pending", icon: CircleDashed },
  { id: "approved", label: "Approved", icon: CheckCircle2 },
  { id: "rejected", label: "Rejected", icon: XCircle },
] as const

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", // amber-500
  approved: "#10b981", // emerald-500
  rejected: "#ef4444", // red-500
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

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  low: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
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
    if (!isDecision(destination.droppableId)) return

    decideAction.mutate(
      { actionId: draggableId, data: { decision: destination.droppableId } },
      {
        onSuccess: () => {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Management Actions</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Govern project-management actions proposed by AI agents. Drag items to approve or reject.
          </p>
        </div>

        <Dialog open={isProposeOpen} onOpenChange={setIsProposeOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Propose Action
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border/60 shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle>Propose Management Action</DialogTitle>
              <DialogDescription>Submit a new project modification or task for human approval.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <Input
                className="bg-background shadow-sm focus-visible:ring-1 focus-visible:ring-primary/40"
                placeholder={'Describe it in one line, e.g. "reprioritize export task"'}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <Button type="button" variant="secondary" className="shadow-sm" onClick={handleAiFill} disabled={draftAction.isPending || !aiPrompt.trim()}>
                {draftAction.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Sparkles className="mr-2 w-4 h-4 text-primary" />}
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
                            <SelectTrigger className="shadow-sm">
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
                            <SelectTrigger className="shadow-sm">
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
                          <Input className="shadow-sm" placeholder="e.g. TASK-1234 or v2.0 Release" {...field} />
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
                          <Textarea className="shadow-sm resize-none" placeholder="Why is this action needed?" {...field} />
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
                            <SelectTrigger className="shadow-sm">
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
                          <Input className="shadow-sm" type="date" {...field} />
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
                        <FormLabel>Requested By</FormLabel>
                        <FormControl>
                          <Input className="shadow-sm" {...field} />
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
                        <FormLabel>Approver</FormLabel>
                        <FormControl>
                          <Input className="shadow-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4 border-t border-border/40 mt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsProposeOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createAction.isPending} className="shadow-sm">
                    {createAction.isPending ? "Submitting..." : "Submit Proposal"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col border border-border rounded-xl shadow-sm bg-card overflow-hidden">
        {/* Filter Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={projectFilter || "all"} onValueChange={(v) => setProjectFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-7 bg-background border-border/60 shadow-sm text-xs font-medium focus:ring-1 focus:ring-primary/20 focus:ring-offset-0">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded border border-border/60 shadow-sm cursor-default">
            <LayoutList className="w-3.5 h-3.5" />
            List View
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Global Table Header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/10 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="w-[30px]" />
              <div className="flex-1 min-w-[200px]">Action</div>
              <div className="w-[140px]">Project</div>
              <div className="w-[150px]">Type</div>
              <div className="w-[100px]">Priority</div>
              <div className="w-[130px]">Requested</div>
              <div className="w-[48px]" />
            </div>

            {isLoading ? (
              <div className="sticky left-0 flex w-[calc(100vw-3rem)] md:w-full justify-center py-20 text-muted-foreground items-center gap-2 bg-background">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading actions...</span>
              </div>
            ) : (actions?.length === 0 && !projectFilter) ? (
              <div className="sticky left-0 flex w-[calc(100vw-3rem)] md:w-full flex-col items-center justify-center py-20 text-center bg-background">
                <LayoutList className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-base font-semibold text-foreground">No actions proposed</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  AI agents haven't proposed any management actions yet.
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                {COLUMNS.map((column) => (
                  <Droppable key={column.id} droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div className="flex flex-col bg-background">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/5 border-b border-border/50 sticky top-0 z-10">
                          <column.icon className="w-3.5 h-3.5" style={{ color: STATUS_COLOR[column.id] }} />
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: STATUS_COLOR[column.id] }}
                          >
                            {column.label}
                          </span>
                          <span className="text-[10px] font-semibold bg-background border border-border/60 px-1.5 py-0.5 rounded text-muted-foreground ml-1 shadow-sm">
                            {columns[column.id]?.length ?? 0}
                          </span>
                        </div>

                        {/* Droppable Area */}
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex flex-col transition-colors min-h-[44px]",
                            snapshot.isDraggingOver && "bg-primary/5"
                          )}
                        >
                          {columns[column.id]?.map((action, index) => (
                            <Draggable key={action.id} draggableId={action.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  style={dragProvided.draggableProps.style}
                                  className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-background transition-colors hover:bg-muted/30 group",
                                    dragSnapshot.isDragging && "shadow-xl ring-1 ring-primary/30 z-50 bg-background"
                                  )}
                                >
                                  {/* Drag Handle */}
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="w-[30px] opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing flex items-center justify-center h-full transition-opacity"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>

                                  {/* Target & Desc */}
                                  <div className="flex-1 min-w-[200px] flex flex-col pr-4">
                                    <span className="text-sm font-semibold text-foreground truncate">{action.target}</span>
                                    <span className="text-[11px] font-medium text-muted-foreground/70 truncate mt-0.5">{action.description}</span>
                                  </div>

                                  {/* Project */}
                                  <div className="w-[140px] pr-2 flex items-center">
                                    <Badge variant="outline" className="font-mono text-[10px] py-0 border-border/60 bg-muted/20 text-muted-foreground truncate max-w-full font-medium">
                                      {action.projectName}
                                    </Badge>
                                  </div>

                                  {/* Type */}
                                  <div className="w-[150px] pr-2 flex items-center">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 bg-muted/40 border border-border/40 px-2 py-0.5 rounded truncate max-w-full">
                                      {ACTION_TYPE_LABEL[action.actionType] || action.actionType.replace(/_/g, " ")}
                                    </span>
                                  </div>

                                  {/* Priority */}
                                  <div className="w-[100px] pr-2 flex items-center">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm",
                                      PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.low
                                    )}>
                                      {action.priority}
                                    </span>
                                  </div>

                                  {/* Date */}
                                  <div className="w-[130px] flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                    <span className="truncate">{formatDistanceToNow(new Date(action.submittedAt), { addSuffix: true })}</span>
                                  </div>

                                  {/* Action Link */}
                                  <div className="w-[48px] flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/actions/${action.id}`} className="flex items-center justify-center h-8 w-8 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors focus:opacity-100 outline-none focus-visible:ring-1 focus-visible:ring-primary">
                                      <ArrowRight className="w-4 h-4" />
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columns[column.id]?.length === 0 && (
                            <div className="py-6 text-center text-xs font-medium text-muted-foreground/50 bg-background border-b border-border/40">
                              No items in {column.label.toLowerCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </DragDropContext>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
