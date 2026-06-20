import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetEventAttendees, getGetEventAttendeesQueryKey } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

export default function AttendeesList() {
  const [, params] = useRoute("/dashboard/organizer/events/:id/attendees");
  const eventId = Number(params?.id);
  
  const { data, isLoading } = useGetEventAttendees(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventAttendeesQueryKey(eventId) }
  });

  const exportCSV = () => {
    if (!data?.attendees) return;
    
    const headers = ["Name", "Email", "Registered At", "Attended"];
    const csvContent = [
      headers.join(","),
      ...data.attendees.map(a => 
        `"${a.name}","${a.email}","${format(new Date(a.registeredAt), "yyyy-MM-dd HH:mm")}","${a.attended}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `event_${eventId}_attendees.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendees List</h1>
            <p className="text-muted-foreground">Manage participants for this event.</p>
          </div>
          <Button onClick={exportCSV} disabled={!data?.attendees?.length}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registered Participants ({data?.total || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading attendees...</div>
            ) : data?.attendees && data.attendees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registered At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.attendees.map(attendee => (
                    <TableRow key={attendee.registrationId}>
                      <TableCell className="font-medium">{attendee.name}</TableCell>
                      <TableCell>{attendee.email}</TableCell>
                      <TableCell>{format(new Date(attendee.registeredAt), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={attendee.attended ? "default" : "secondary"}>
                          {attendee.attended ? "Attended" : "Registered"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">No attendees registered yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
