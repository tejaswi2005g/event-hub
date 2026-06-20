import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetPendingEvents, getGetPendingEventsQueryKey, useUpdateEventStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function PendingEvents() {
  const { data, isLoading } = useGetPendingEvents({
    query: { queryKey: getGetPendingEventsQueryKey() }
  });

  const updateStatusMutation = useUpdateEventStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusUpdate = (id: number, newStatus: 'approved' | 'rejected') => {
    updateStatusMutation.mutate(
      { id, data: { approvalStatus: newStatus } },
      {
        onSuccess: () => {
          toast({ title: `Event ${newStatus}` });
          queryClient.invalidateQueries({ queryKey: getGetPendingEventsQueryKey() });
        }
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground">Review events waiting for moderation.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading pending events...</div>
            ) : data?.events && data.events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        <Link href={`/events/${event.id}`} className="hover:underline text-primary">
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell>{event.organizerName}</TableCell>
                      <TableCell>{format(new Date(event.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{event.capacity}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" onClick={() => handleStatusUpdate(event.id, 'approved')} disabled={updateStatusMutation.isPending}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(event.id, 'rejected')} disabled={updateStatusMutation.isPending}>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">You're all caught up! No events pending approval.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
