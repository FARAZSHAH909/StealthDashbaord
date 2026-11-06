"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { HARDENED_ROUTES } from "@/lib/security/routesConfig";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!loading) {
      if (user) {
        router.push(HARDENED_ROUTES.OVERVIEW);
      } else {
        router.push(HARDENED_ROUTES.GATEWAY_LOGIN);
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#0c1317] flex flex-col items-center justify-center p-6 text-slate-100 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-xl shadow-emerald-500/10">
          <ShieldCheck className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          STEALTH<span className="text-emerald-400">ADMIN</span>
        </h1>
        <p className="text-xs text-[#8696a0] mt-1 font-mono">
          Enterprise Security & Encrypted Message Dashboard
        </p>

        <div className="mt-8 p-4 rounded-xl bg-[#111b21] border border-[#222d34] text-left text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>System Status:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Data Protection:</span>
            <span className="text-slate-200">AES-256-GCM / W3C Crypto</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Access Mode:</span>
            <span className="text-emerald-400">Zero-Trust Protected</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href={HARDENED_ROUTES.GATEWAY_LOGIN}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <span>Proceed to Admin Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[11px] text-[#8696a0] font-mono flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Redirecting automatically...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
