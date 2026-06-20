import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListEvents, getListEventsQueryKey, useUpdateEventStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AllEvents() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const queryParams = { 
    limit: 50
  };

  const { data, isLoading } = useListEvents(queryParams, {
    query: { queryKey: getListEventsQueryKey(queryParams) }
  });

  const updateStatusMutation = useUpdateEventStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusUpdate = (id: number, newStatus: 'approved' | 'rejected') => {
    updateStatusMutation.mutate(
      { id, data: { approvalStatus: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Event status updated" });
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(queryParams) });
        }
      }
    );
  };

  const events = data?.events.filter(e => statusFilter === "all" || e.approvalStatus === statusFilter) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Events</h1>
          <p className="text-muted-foreground">Monitor and moderate platform events.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <div className="flex gap-4 mt-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by approval status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvals</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading events...</div>
            ) : events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.organizerName}</TableCell>
                      <TableCell>{format(new Date(event.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.approvalStatus === 'approved' ? 'default' : event.approvalStatus === 'rejected' ? 'destructive' : 'secondary'}>
                          {event.approvalStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {event.approvalStatus === 'pending' ? (
                          <>
                            <Button size="sm" onClick={() => handleStatusUpdate(event.id, 'approved')} disabled={updateStatusMutation.isPending}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(event.id, 'rejected')} disabled={updateStatusMutation.isPending}>Reject</Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Moderated</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">No events found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
