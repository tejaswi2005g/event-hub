import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetMyRegistrations, getGetMyRegistrationsQueryKey, useCancelRegistration, useGetRegistrationQr, useGetEventRecommendations, getGetEventRecommendationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

export default function ParticipantDashboard() {
  const { data, isLoading } = useGetMyRegistrations({ limit: 50 }, {
    query: { queryKey: getGetMyRegistrationsQueryKey({ limit: 50 }) }
  });
  
  const { data: recommendations, isLoading: recommendationsLoading } = useGetEventRecommendations({
    query: { queryKey: getGetEventRecommendationsQueryKey() }
  });

  const [selectedReg, setSelectedReg] = useState<number | null>(null);
  const cancelMutation = useCancelRegistration();
  const queryClient = useQueryClient();

  const handleCancel = (id: number) => {
    if (confirm("Are you sure you want to cancel this registration?")) {
      cancelMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyRegistrationsQueryKey({ limit: 50 }) });
        }
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Registrations</h1>
          <p className="text-muted-foreground">Manage your event tickets and attendance.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming & Past Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : data?.registrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No registrations found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">
                        <Link href={`/events/${reg.event?.id}`} className="hover:underline text-primary">
                          {reg.event?.title}
                        </Link>
                      </TableCell>
                      <TableCell>{reg.event ? format(new Date(reg.event.date), "MMM d, yyyy") : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={reg.event?.status === 'upcoming' ? 'default' : 'secondary'}>
                          {reg.event?.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedReg(reg.id)}>
                          View Ticket
                        </Button>
                        {reg.event?.status === 'upcoming' && (
                          <Button variant="destructive" size="sm" onClick={() => handleCancel(reg.id)} disabled={cancelMutation.isPending}>
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recommendations Section */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">You Might Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendationsLoading ? (
              <div className="col-span-full py-8 text-center text-muted-foreground">Loading recommendations...</div>
            ) : recommendations?.events && recommendations.events.length > 0 ? (
              recommendations.events.map((event) => (
                <Card key={event.id} className="flex flex-col overflow-hidden">
                  {event.bannerUrl ? (
                    <div className="aspect-video w-full overflow-hidden">
                      <img src={event.bannerUrl} alt={event.title} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary/40 font-medium">No Image</span>
                    </div>
                  )}
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit mb-2">{event.category}</Badge>
                    <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">{format(new Date(event.date), "MMM d, yyyy")}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/events/${event.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-muted-foreground">No recommendations right now.</div>
            )}
          </div>
        </div>
      </div>

      <QrDialog regId={selectedReg} onClose={() => setSelectedReg(null)} />
    </DashboardLayout>
  );
}

function QrDialog({ regId, onClose }: { regId: number | null, onClose: () => void }) {
  const { data } = useGetRegistrationQr(regId as number, {
    query: {
      enabled: !!regId,
      queryKey: ["qr", regId]
    }
  });

  return (
    <Dialog open={!!regId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.eventTitle || 'Your Ticket'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {data?.qrCode ? (
            <img src={data.qrCode} alt="QR Code" className="w-64 h-64 border rounded p-4 bg-white" />
          ) : (
            <div className="w-64 h-64 border rounded flex items-center justify-center">Loading QR...</div>
          )}
          <p className="text-sm text-muted-foreground text-center">Show this QR code at the event entrance.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
