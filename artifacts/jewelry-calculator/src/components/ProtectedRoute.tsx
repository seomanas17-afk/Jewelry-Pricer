import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { isAuthenticated, clearToken } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ 
  children, 
  requireAdmin = false 
}: { 
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: isAuthenticated(),
      retry: false,
    }
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
      return;
    }
    
    // If API returns 401, error gets triggered
    if (isError) {
      const status = (error as any)?.status;
      if (status === 401 || status === 403) {
        clearToken();
        setLocation("/login");
      }
    }
  }, [isError, error, setLocation]);

  if (!isAuthenticated()) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && user.role !== "admin") {
    setLocation("/calculator");
    return null;
  }

  return <>{children}</>;
}
