import * as React from "react"
import { useState } from "react"
import { Link } from "wouter"
import { useListSamBooksAgentRuns } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, StatusBadge, relativeTime, ConnectionNotice } from "@/components/sam-books-shared"

const STATUSES = ["all", "queued", "running", "completed", "applied", "failed"] as const
type Status = (typeof STATUSES)[number]

export default function SamBooksAgentRuns() {
  const [status, setStatus] = useState<Status>("all")
  const agentRuns = useListSamBooksAgentRuns({ status })

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Agent runs" subtitle="Module-builder runs across every organization — prompts, checks, and outcomes." />

      <ConnectionNotice error={agentRuns.error} />

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checks</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentRuns.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell>
                </TableRow>
              ) : (agentRuns.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No runs yet.</TableCell>
                </TableRow>
              ) : (
                agentRuns.data!.map((run) => (
                  <TableRow key={run.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/sam-books/agent-runs/${run.id}`} className="hover:underline">{run.moduleName}</Link>
                    </TableCell>
                    <TableCell>{run.organizationName}</TableCell>
                    <TableCell><StatusBadge status={run.status} /></TableCell>
                    <TableCell>{run.checksPassed}/{run.checksTotal}</TableCell>
                    <TableCell>{run.durationSeconds !== null ? `${run.durationSeconds}s` : "—"}</TableCell>
                    <TableCell>{relativeTime(run.startedAt)}</TableCell>
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
