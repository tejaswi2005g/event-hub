import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetPendingEvents, getGetPendingEventsQueryKey, useUpdateEventStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import { CheckCircle, XCircle, MapPin, Users } from "lucide-react";

export default function PendingEvents() {
  const { data, isLoading } = useGetPendingEvents({
    query: { queryKey: getGetPendingEventsQueryKey() }
  });

  const updateStatusMutation = useUpdateEventStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const events = data?.events ?? [];
  const allIds = events.map(e => e.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusUpdate = (id: number, newStatus: 'approved' | 'rejected') => {
    updateStatusMutation.mutate(
      { id, data: { approvalStatus: newStatus } },
      {
        onSuccess: () => {
          toast({ title: `Event ${newStatus}` });
          setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
          queryClient.invalidateQueries({ queryKey: getGetPendingEventsQueryKey() });
        }
      }
    );
  };

  const handleBulkAction = async (newStatus: 'approved' | 'rejected') => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkPending(true);
    let successCount = 0;
    let failCount = 0;
    await Promise.all(
      ids.map(id =>
        new Promise<void>(resolve => {
          updateStatusMutation.mutate(
            { id, data: { approvalStatus: newStatus } },
            {
              onSuccess: () => { successCount++; resolve(); },
              onError: () => { failCount++; resolve(); }
            }
          );
        })
      )
    );
    setBulkPending(false);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: getGetPendingEventsQueryKey() });
    if (failCount === 0) {
      toast({ title: `${successCount} event${successCount !== 1 ? 's' : ''} ${newStatus}` });
    } else {
      toast({
        title: `${successCount} ${newStatus}, ${failCount} failed`,
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground">Review events waiting for moderation.</p>
        </div>

        {someSelected && (
          <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg border">
            <span className="text-sm font-medium">
              {selected.size} event{selected.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                onClick={() => handleBulkAction('approved')}
                disabled={bulkPending}
                className="gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                Approve All
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('rejected')}
                disabled={bulkPending}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                disabled={bulkPending}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              Needs Review
              {events.length > 0 && (
                <Badge variant="secondary" className="ml-2">{events.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading pending events...</div>
            ) : events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow
                      key={event.id}
                      className={selected.has(event.id) ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(event.id)}
                          onCheckedChange={() => toggleOne(event.id)}
                          aria-label={`Select ${event.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Link href={`/events/${event.id}`} className="font-medium hover:underline text-primary">
                            {event.title}
                          </Link>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{event.organizerName ?? "—"}</TableCell>
                      <TableCell>{format(new Date(event.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {event.capacity}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(event.id, 'approved')}
                          disabled={updateStatusMutation.isPending || bulkPending}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(event.id, 'rejected')}
                          disabled={updateStatusMutation.isPending || bulkPending}
                          className="gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">You're all caught up!</p>
                <p className="text-sm">No events pending approval.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
