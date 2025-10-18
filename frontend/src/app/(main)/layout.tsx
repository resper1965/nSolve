"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Se está na rota auth, não verificar
    if (pathname.startsWith('/auth')) {
      return;
    }

    // Se está tentando acessar dashboard sem token
    if (pathname.startsWith('/dashboard')) {
      const token = getToken();
      if (!token) {
        console.log('❌ No auth token, redirecting to login');
        router.push('/auth/v2/login');
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}

