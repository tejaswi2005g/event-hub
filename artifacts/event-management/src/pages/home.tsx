import { Link } from "wouter";
import { useListEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

const CATEGORIES = [
  "Technology", "Business", "Music", "Sports", "Arts", 
  "Food", "Health", "Education", "Networking", "Other"
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");

  const queryParams = { 
    status: "upcoming", 
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    dateFrom: dateFrom || undefined
  };

  const { data: eventsData, isLoading } = useListEvents(queryParams, {
    query: {
      queryKey: getListEventsQueryKey(queryParams)
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-primary">
          Discover Extraordinary Events
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          The best platform for finding and managing events. From tech conferences to music festivals, find your next experience here.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
          <Input 
            placeholder="Search events by title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 flex-1"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input 
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-12 w-full sm:w-[160px]"
            title="Date from"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center">Loading events...</div>
        ) : eventsData?.events.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No events found matching your criteria.</div>
        ) : eventsData?.events.map((event) => (
          <Card key={event.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
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
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary">{event.category}</Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  {format(new Date(event.date), "MMM d, yyyy")}
                </span>
              </div>
              <CardTitle className="line-clamp-1">{event.title}</CardTitle>
              <CardDescription className="line-clamp-2">{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-sm text-muted-foreground">
                <p>Venue: {event.venue}</p>
                <p>Capacity: {event.registrationCount || 0} / {event.capacity}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/events/${event.id}`}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
