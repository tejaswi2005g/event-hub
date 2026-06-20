import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function RootLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight">
            EventHub
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium hover:text-primary">
              Browse Events
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
                  Dashboard
                </Link>
                <Button variant="outline" size="sm" onClick={() => {
                  logout();
                  setLocation("/");
                }}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-primary">
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
