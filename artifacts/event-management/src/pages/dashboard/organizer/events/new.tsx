import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { useCreateEvent } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const CATEGORIES = [
  "Technology", "Business", "Music", "Sports", "Arts", 
  "Food", "Health", "Education", "Networking", "Other"
];

export default function CreateEvent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [category, setCategory] = useState("");
  const [capacity, setCapacity] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  const createEventMutation = useCreateEvent();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const returnPath = user?.role === "admin" ? "/dashboard/admin" : "/dashboard/organizer";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dateTime = new Date(`${date}T${time}`).toISOString();
    const deadline = new Date(registrationDeadline).toISOString();

    createEventMutation.mutate(
      {
        data: {
          title,
          description,
          date: dateTime,
          venue,
          category,
          capacity: parseInt(capacity, 10),
          registrationDeadline: deadline,
          bannerUrl: bannerUrl || undefined
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Event created successfully!" });
          setLocation(returnPath);
        },
        onError: (err: any) => {
          toast({ title: "Failed to create event", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Event</h1>
          <p className="text-muted-foreground">Fill in the details to publish a new event.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" required value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" required rows={4} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" required value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" required value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue / Location</Label>
                <Input id="venue" required value={venue} onChange={e => setVenue(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input id="capacity" type="number" min="1" required value={capacity} onChange={e => setCapacity(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                <Input id="registrationDeadline" type="date" required value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bannerUrl">Banner Image URL (Optional)</Label>
                <Input id="bannerUrl" type="url" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setLocation(returnPath)}>Cancel</Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
