import * as React from "react"
import { useState } from "react"
import { Link } from "wouter"
import { useListSamBooksFeatureRequests } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, StatusBadge, relativeTime, ConnectionNotice } from "@/components/sam-books-shared"

const STATUSES = ["submitted", "approved", "rejected", "changes_requested"] as const
type Status = (typeof STATUSES)[number]

export default function SamBooksApprovals() {
  const [status, setStatus] = useState<Status>("submitted")
  const featureRequests = useListSamBooksFeatureRequests({ status })

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Approvals" subtitle="Custom-module feature requests awaiting a decision, across every organization." />

      <ConnectionNotice error={featureRequests.error} />

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureRequests.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading…</TableCell>
                </TableRow>
              ) : (featureRequests.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nothing here.</TableCell>
                </TableRow>
              ) : (
                featureRequests.data!.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/sam-books/approvals/${r.id}`} className="hover:underline">{r.title}</Link>
                    </TableCell>
                    <TableCell>{r.moduleName}</TableCell>
                    <TableCell>{r.organizationName}</TableCell>
                    <TableCell>{r.requester.name}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>{relativeTime(r.submittedAt ?? r.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Click a request to review it and record a decision.</p>
    </div>
  )
}
