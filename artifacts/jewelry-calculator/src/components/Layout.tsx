import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { LogOut, Calculator, Clock, Settings, UserCircle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function Layout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
    }
  });
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    clearToken();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-primary font-serif font-bold text-xl tracking-tight">
              <div className="h-8 w-8 bg-primary rounded-sm flex items-center justify-center text-primary-foreground">
                JC
              </div>
              <span className="hidden sm:inline-block">JewelryCalc</span>
            </div>

            {user && (
              <nav className="hidden md:flex items-center gap-1 ml-4">
                <Link href="/calculator">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted font-medium">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculator
                  </Button>
                </Link>
                <Link href="/history">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted font-medium">
                    <Clock className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted font-medium">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {user && (
              <div className="flex items-center gap-4 ml-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCircle className="h-5 w-5" />
                  <span className="font-medium">{user.username}</span>
                  {user.role === "admin" && (
                    <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground border-muted-foreground/20">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
