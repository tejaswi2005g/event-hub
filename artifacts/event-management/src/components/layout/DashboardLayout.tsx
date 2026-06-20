import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Calendar, Users, CheckCircle, Ticket, BarChart3, PlusCircle } from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  let items: SidebarItem[] = [];

  if (user?.role === "admin") {
    items = [
      { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
      { label: "Users", href: "/dashboard/admin/users", icon: Users },
      { label: "All Events", href: "/dashboard/admin/events", icon: Calendar },
      { label: "Pending Approvals", href: "/dashboard/admin/events/pending", icon: CheckCircle },
    ];
  } else if (user?.role === "organizer") {
    items = [
      { label: "Overview", href: "/dashboard/organizer", icon: LayoutDashboard },
      { label: "Create Event", href: "/dashboard/organizer/events/new", icon: PlusCircle },
    ];
  } else if (user?.role === "participant") {
    items = [
      { label: "My Registrations", href: "/dashboard/participant", icon: Ticket },
    ];
  }

  return (
    <div className="flex flex-1 w-full container mx-auto px-4 py-8 gap-8">
      <aside className="w-64 flex-shrink-0">
        <nav className="flex flex-col gap-2">
          {items.map((item) => {
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard/admin" && item.href !== "/dashboard/organizer" && item.href !== "/dashboard/participant");
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
