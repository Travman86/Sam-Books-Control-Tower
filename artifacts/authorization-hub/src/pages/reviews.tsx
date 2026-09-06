import * as React from "react"
import { useState } from "react"
import { Link } from "wouter"
import { useListReviews, ListReviewsStatus } from "@workspace/api-client-react"
import { formatDistanceToNow } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Clock, FileDiff, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react"

export default function Reviews() {
  const [filter, setFilter] = useState<ListReviewsStatus | 'all'>('pending')
  const [search, setSearch] = useState("")

  const { data: reviews = [], isLoading } = useListReviews(
    filter !== 'all' ? { status: filter } : undefined
  )

  const filteredReviews = reviews.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    r.projectName.toLowerCase().includes(search.toLowerCase()) ||
    r.featureName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground mt-1">Evaluate and authorize AI agent change requests.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'pending' ? "default" : "outline"} 
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending
          </Button>
          <Button 
            variant={filter === 'approved' ? "default" : "outline"} 
            onClick={() => setFilter('approved')}
            size="sm"
          >
            Approved
          </Button>
          <Button 
            variant={filter === 'rejected' ? "default" : "outline"} 
            onClick={() => setFilter('rejected')}
            size="sm"
          >
            Rejected
          </Button>
          <Button 
            variant={filter === 'all' ? "default" : "outline"} 
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search reviews..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Change Request</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status & Risk</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">Loading reviews...</TableCell>
                </TableRow>
              ) : filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <ShieldCheck className="h-8 w-8 mb-2 opacity-20" />
                    No reviews found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => (
                  <TableRow key={review.id} className="group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-base">{review.title}</span>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileDiff className="h-3.5 w-3.5" /> {review.filesChanged} files
                          </span>
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">by {review.builder}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">{review.projectName}</span>
                        <span className="text-muted-foreground">{review.featureName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        {review.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                        {review.status === 'approved' && <Badge variant="success">Approved</Badge>}
                        {review.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                        
                        <Badge variant="outline" className="text-xs font-normal">
                          {review.risk} risk
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(review.submittedAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant={review.status === 'pending' ? 'default' : 'secondary'}>
                        <Link href={`/reviews/${review.id}`}>
                          {review.status === 'pending' ? 'Review' : 'View'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
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
