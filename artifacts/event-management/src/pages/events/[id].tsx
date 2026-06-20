import { useRoute, Link } from "wouter";
import { useGetEvent, getGetEventQueryKey, useRegisterForEvent } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const eventId = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useGetEvent(eventId, {
    query: {
      enabled: !!eventId,
      queryKey: getGetEventQueryKey(eventId)
    }
  });

  const registerMutation = useRegisterForEvent();

  const handleRegister = () => {
    registerMutation.mutate({ id: eventId }, {
      onSuccess: () => {
        toast({ title: "Successfully registered!" });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to register", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!event) return <div className="container mx-auto px-4 py-8">Event not found.</div>;

  const isSoldOut = (event.registrationCount ?? 0) >= event.capacity;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {event.bannerUrl && (
        <div className="w-full aspect-video rounded-xl overflow-hidden mb-8">
          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="flex gap-2 mb-4">
            <Badge>{event.category}</Badge>
            <Badge variant={event.status === 'upcoming' ? 'default' : 'secondary'}>{event.status}</Badge>
          </div>
          <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
          <p className="text-lg text-muted-foreground mb-8 whitespace-pre-wrap">{event.description}</p>
          
          <h2 className="text-2xl font-semibold mb-4">Organizer</h2>
          <div className="bg-card border rounded-lg p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
              {event.organizerName?.[0] || 'O'}
            </div>
            <div>
              <p className="font-medium">{event.organizerName}</p>
              {event.organizerEmail && <p className="text-sm text-muted-foreground">{event.organizerEmail}</p>}
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 flex-shrink-0">
          <div className="bg-card border rounded-xl p-6 sticky top-8">
            <div className="space-y-4 mb-6 text-sm">
              <div>
                <p className="text-muted-foreground font-medium">Date & Time</p>
                <p>{format(new Date(event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Location</p>
                <p>{event.venue}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Capacity</p>
                <p>{event.registrationCount || 0} / {event.capacity} registered</p>
              </div>
            </div>

            {user?.role === "participant" ? (
              event.isRegistered ? (
                <Button asChild className="w-full" variant="secondary">
                  <Link href="/dashboard/participant">View Ticket in Dashboard</Link>
                </Button>
              ) : isSoldOut ? (
                <Button className="w-full" variant="destructive" disabled>Sold Out</Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleRegister}
                  disabled={registerMutation.isPending || event.status !== 'upcoming'}
                >
                  {registerMutation.isPending ? "Registering..." : "Register Now"}
                </Button>
              )
            ) : user ? (
              <Button className="w-full" variant="secondary" disabled>Log in as participant to register</Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/login">Log in to Register</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
