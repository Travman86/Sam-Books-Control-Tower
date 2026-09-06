import * as React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { 
  useListFeatures, 
  useCreateFeature, 
  useListProjects,
  getListFeaturesQueryKey,
  getGetDashboardQueryKey
} from "@workspace/api-client-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Search, Shield, User, Bot } from "lucide-react"

const featureSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z.string().min(1, "Feature name is required"),
  description: z.string(),
  builder: z.string().min(1, "Builder agent is required"),
  reviewer: z.string().min(1, "Reviewer group is required"),
})

type FeatureFormValues = z.infer<typeof featureSchema>

export default function Policies() {
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const { data: features = [], isLoading: isLoadingFeatures } = useListFeatures()
  const { data: projects = [], isLoading: isLoadingProjects } = useListProjects()
  
  const createFeature = useCreateFeature({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFeaturesQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
        toast.success("Policy created successfully")
        setIsCreateOpen(false)
        form.reset()
      },
      onError: () => {
        toast.error("Failed to create policy")
      }
    }
  })

  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      projectId: "",
      name: "",
      description: "",
      builder: "replit-agent-v1",
      reviewer: "engineering-core"
    }
  })

  const onSubmit = (data: FeatureFormValues) => {
    createFeature.mutate({ data })
  }

  const filteredFeatures = features.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.projectName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Authorization Policies</h1>
          <p className="text-muted-foreground mt-1">Define which AI agents can build and which human teams must review.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Policy</DialogTitle>
              <DialogDescription>
                Establish a new feature boundary and assign builder/reviewer roles.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.filter(p => p.status !== 'revoked').map(p => (
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feature Boundary Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Authentication Module" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What does this feature govern?" className="resize-none h-20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="builder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Builder (Agent)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. replit-agent-v1" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">The agent authorized to submit changes.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reviewer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reviewer (Human)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. core-team" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">The team required for sign-off.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createFeature.isPending}>
                    {createFeature.isPending ? "Creating..." : "Create Policy"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Active Policies</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search policies..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature / Boundary</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Builder</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Signoff Req</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingFeatures || isLoadingProjects ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading policies...</TableCell>
                </TableRow>
              ) : filteredFeatures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No policies found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFeatures.map((feature) => (
                  <TableRow key={feature.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{feature.name}</span>
                        <span className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">
                          {feature.description || "No description"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{feature.projectName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono">{feature.builder}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono">{feature.reviewer}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {feature.status === 'protected' && <Badge variant="success">Protected</Badge>}
                      {feature.status === 'review' && <Badge variant="warning">Under Review</Badge>}
                      {feature.status === 'paused' && <Badge variant="outline">Paused</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {feature.requiresHumanSignoff ? (
                        <Shield className="h-4 w-4 text-primary ml-auto" />
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
