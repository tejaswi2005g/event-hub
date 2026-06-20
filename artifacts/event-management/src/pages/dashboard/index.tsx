import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";

export default function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Redirect to="/login" />;

  switch (user.role) {
    case "admin":
      return <Redirect to="/dashboard/admin" />;
    case "organizer":
      return <Redirect to="/dashboard/organizer" />;
    case "participant":
      return <Redirect to="/dashboard/participant" />;
    default:
      return <Redirect to="/" />;
  }
}
