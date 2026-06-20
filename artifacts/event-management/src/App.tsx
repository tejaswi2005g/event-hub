import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { RootLayout } from "@/components/layout/RootLayout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import EventDetail from "@/pages/events/[id]";
import Login from "@/pages/login";
import Register from "@/pages/register";
import DashboardRedirect from "@/pages/dashboard/index";
import ParticipantDashboard from "@/pages/dashboard/participant/index";
import OrganizerDashboard from "@/pages/dashboard/organizer/index";
import OrganizerCreateEvent from "@/pages/dashboard/organizer/events/new";
import AdminDashboard from "@/pages/dashboard/admin/index";
import AdminUsers from "@/pages/dashboard/admin/users";
import AdminEvents from "@/pages/dashboard/admin/events";
import AdminPendingEvents from "@/pages/dashboard/admin/events/pending";
import OrganizerEditEvent from "@/pages/dashboard/organizer/events/[id]/edit";
import OrganizerAttendees from "@/pages/dashboard/organizer/events/[id]/attendees";
import OrganizerAnalytics from "@/pages/dashboard/organizer/events/[id]/analytics";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (!user) return <Redirect to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function Router() {
  return (
    <RootLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        <Route path="/dashboard">
          <ProtectedRoute component={DashboardRedirect} />
        </Route>
        
        <Route path="/dashboard/participant">
          <ProtectedRoute component={ParticipantDashboard} allowedRoles={['participant']} />
        </Route>
        
        <Route path="/dashboard/organizer">
          <ProtectedRoute component={OrganizerDashboard} allowedRoles={['organizer']} />
        </Route>

        <Route path="/dashboard/organizer/events/new">
          <ProtectedRoute component={OrganizerCreateEvent} allowedRoles={['organizer']} />
        </Route>
        <Route path="/dashboard/organizer/events/:id/edit">
          <ProtectedRoute component={OrganizerEditEvent} allowedRoles={['organizer']} />
        </Route>
        <Route path="/dashboard/organizer/events/:id/attendees">
          <ProtectedRoute component={OrganizerAttendees} allowedRoles={['organizer']} />
        </Route>
        <Route path="/dashboard/organizer/events/:id/analytics">
          <ProtectedRoute component={OrganizerAnalytics} allowedRoles={['organizer']} />
        </Route>
        
        <Route path="/dashboard/admin">
          <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />
        </Route>
        <Route path="/dashboard/admin/users">
          <ProtectedRoute component={AdminUsers} allowedRoles={['admin']} />
        </Route>
        <Route path="/dashboard/admin/events">
          <ProtectedRoute component={AdminEvents} allowedRoles={['admin']} />
        </Route>
        <Route path="/dashboard/admin/events/pending">
          <ProtectedRoute component={AdminPendingEvents} allowedRoles={['admin']} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RootLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
