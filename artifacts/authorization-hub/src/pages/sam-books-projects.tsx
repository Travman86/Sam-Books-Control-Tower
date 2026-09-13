import * as React from "react"
import { Link } from "wouter"
import { useListSamBooksProjects } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, StatusBadge, ConnectionNotice } from "@/components/sam-books-shared"

export default function SamBooksProjects() {
  const projects = useListSamBooksProjects()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Projects" subtitle="Every custom module across Sam Books' organizations, and its open work." />

      <ConnectionNotice error={projects.error} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Open requests</TableHead>
                <TableHead>Awaiting approval</TableHead>
                <TableHead>Latest run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading…</TableCell>
                </TableRow>
              ) : (projects.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No custom modules yet.</TableCell>
                </TableRow>
              ) : (
                projects.data!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.published && (
                        <Badge variant="outline" className="ml-2 text-xs font-normal">published</Badge>
                      )}
                    </TableCell>
                    <TableCell>{p.organizationName}</TableCell>
                    <TableCell>{p.currentRevision}</TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{p.openRequests}</TableCell>
                    <TableCell>
                      {p.awaitingApproval > 0 ? (
                        <Link href="/sam-books/approvals" className="inline-block">
                          <Badge variant="warning">{p.awaitingApproval}</Badge>
                        </Link>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell>{p.latestRun ? <StatusBadge status={p.latestRun.status} /> : "—"}</TableCell>
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
