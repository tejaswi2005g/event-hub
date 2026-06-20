import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetAdminStats, getGetAdminStatsQueryKey, useGetPendingEvents, getGetPendingEventsQueryKey, useUpdateEventStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Ticket, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: pendingEvents } = useGetPendingEvents({ query: { queryKey: getGetPendingEventsQueryKey() } });

  const updateStatusMutation = useUpdateEventStatus();
  const queryClient = useQueryClient();

  const handleStatus = (id: number, status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ id, data: { approvalStatus: status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPendingEventsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Platform statistics and pending actions.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Registrations</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeRegistrations || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingEvents && pendingEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Title</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.organizerName}</TableCell>
                      <TableCell>{format(new Date(event.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" onClick={() => handleStatus(event.id, 'approved')} disabled={updateStatusMutation.isPending}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatus(event.id, 'rejected')} disabled={updateStatusMutation.isPending}>
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-4 text-center text-muted-foreground">No events pending approval.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
