"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, verifyToken } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    // Rotas públicas
    const publicRoutes = ['/auth', '/unauthorized', '/debug-auth'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicRoute) {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    // Verificar token
    const token = getToken();
    
    if (!token) {
      console.log('❌ No token found, redirecting to login');
      router.push('/auth/v2/login');
      return;
    }

    // Verificar validade do token
    const isValid = await verifyToken();
    
    if (!isValid) {
      console.log('❌ Invalid token, redirecting to login');
      router.push('/auth/v2/login');
      return;
    }

    console.log('✅ Authenticated');
    setIsAuthenticated(true);
    setIsChecking(false);
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0C0E]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ADE8]"></div>
          <p className="text-[#9CA3AF] mt-4">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

