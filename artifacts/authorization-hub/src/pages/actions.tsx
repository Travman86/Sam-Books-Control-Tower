import * as React from "react"
import { Link } from "wouter"
import { 
  useListManagementActions, 
  useListProjects, 
  useCreateManagementAction, 
  getListManagementActionsQueryKey, 
  getGetDashboardQueryKey, 
  getListActivityQueryKey 
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ListTodo, Plus, ArrowRight, Clock, ShieldCheck, Filter } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function Actions() {
  const [statusFilter, setStatusFilter] = React.useState<string>("")
  const [projectFilter, setProjectFilter] = React.useState<string>("")
  
  const { data: actions, isLoading } = useListManagementActions({
    status: statusFilter ? (statusFilter as any) : undefined,
    projectId: projectFilter || undefined
  })
  
  const { data: projects } = useListProjects()
  
  const [isProposing, setIsProposing] = React.useState(false)
  const queryClient = useQueryClient()
  const createAction = useCreateManagementAction()
  const { toast } = useToast()

  const [formData, setFormData] = React.useState({
    projectId: "",
    actionType: "create_task",
    target: "",
    description: "",
    requestedBy: "agent-alpha",
    approver: "human-admin",
    priority: "medium",
    dueDate: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAction.mutate({
      data: {
        ...formData,
        actionType: formData.actionType as any,
        priority: formData.priority as any,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      }
    }, {
      onSuccess: () => {
        toast({ title: "Proposal submitted", description: "The management action was successfully proposed." })
        setIsProposing(false)
        queryClient.invalidateQueries({ queryKey: getListManagementActionsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        queryClient.invalidateQueries({ queryKey: getListActivityQueryKey() })
        setFormData({
          projectId: "",
          actionType: "create_task",
          target: "",
          description: "",
          requestedBy: "agent-alpha",
          approver: "human-admin",
          priority: "medium",
          dueDate: ""
        })
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Management Actions</h1>
          <p className="text-muted-foreground mt-2">Govern project-management actions proposed by AI agents.</p>
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
          <span className="text-sm font-medium">Filters</span>
        </div>
        
        <select 
          className="flex h-9 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        
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
      ) : actions?.length === 0 ? (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground">No actions found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">There are no management actions matching your filter criteria right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {actions?.map(action => (
            <Card key={action.id} className="overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center p-5 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="font-mono bg-background">
                      {action.projectName}
                    </Badge>
                    <Badge variant={
                      action.priority === 'urgent' ? 'destructive' :
                      action.priority === 'high' ? 'default' :
                      action.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {action.priority} priority
                    </Badge>
                    {action.status === 'pending' && <Badge variant="warning" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>}
                    {action.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>}
                    {action.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                  </div>
                  <h3 className="text-lg font-semibold truncate flex items-center gap-2">
                    <span className="text-muted-foreground font-normal text-xs bg-muted px-2 py-0.5 rounded uppercase tracking-wider">{action.actionType.replace('_', ' ')}</span>
                    {action.target}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 truncate">
                    {action.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-6 md:pl-6 md:border-l border-border shrink-0 text-sm mt-4 md:mt-0">
                  <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="truncate">By: <span className="text-foreground font-medium">{action.requestedBy}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(new Date(action.submittedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Button asChild variant="secondary" size="sm" className="ml-auto">
                    <Link href={`/actions/${action.id}`}>
                      Review <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
