import * as React from "react"
import { useListActivity } from "@workspace/api-client-react"
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, ShieldAlert, Clock, FolderKanban, AlertTriangle } from "lucide-react"

export default function Activity() {
  const { data: activity = [], isLoading } = useListActivity({ limit: 50 })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground mt-1">A complete, immutable log of all authorization events.</p>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Showing latest 50 events across all projects.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">Loading audit log...</TableCell>
                </TableRow>
              ) : activity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                activity.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="bg-muted rounded-full p-2 inline-flex items-center justify-center">
                        {event.kind === 'approved' && <ShieldCheck className="h-4 w-4 text-green-500" />}
                        {event.kind === 'rejected' && <ShieldAlert className="h-4 w-4 text-destructive" />}
                        {event.kind === 'submitted' && <Clock className="h-4 w-4 text-amber-500" />}
                        {event.kind === 'connected' && <FolderKanban className="h-4 w-4 text-primary" />}
                        {event.kind === 'revoked' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{event.title}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 max-w-[500px] truncate">
                          {event.detail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{event.actor}</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {format(new Date(event.occurredAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.occurredAt), "HH:mm:ss")}
                      </div>
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
