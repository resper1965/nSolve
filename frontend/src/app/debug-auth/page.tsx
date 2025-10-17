"use client";

import { useEffect, useState } from "react";

export default function DebugAuth() {
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    setInfo({
      localStorage_token: localStorage.getItem('auth_token')?.substring(0, 50),
      sessionStorage_token: sessionStorage.getItem('auth_token')?.substring(0, 50),
      cookies: document.cookie,
      localStorage_user: localStorage.getItem('auth_user'),
      localStorage_tenant: localStorage.getItem('auth_tenant'),
    });
  }, []);

  return (
    <div className="p-8 bg-[#0B0C0E] min-h-screen text-[#EEF1F6]">
      <h1 className="text-2xl mb-4">Auth Debug</h1>
      <pre className="bg-[#111317] p-4 rounded text-xs overflow-auto">
        {JSON.stringify(info, null, 2)}
      </pre>
      <div className="mt-4">
        <a href="/auth/v2/login" className="text-[#00ADE8]">← Back to Login</a>
      </div>
    </div>
  );
}

