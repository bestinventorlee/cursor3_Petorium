"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { withBasePath } from "@/lib/base-path";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (status === "loading") return;

      if (!session) {
        router.push(withBasePath("/auth/signin?callbackUrl=/admin"));
        return;
      }

      try {
        const response = await fetch(withBasePath("/api/admin/check"));
        if (response.ok) {
          setIsAuthorized(true);
        } else {
          router.push(withBasePath("/"));
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push(withBasePath("/"));
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [session, status, router]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

