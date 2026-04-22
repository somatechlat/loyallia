"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-500 to-purple-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4 border border-white/30">
            <span className="text-2xl font-black text-white">L</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Loyallia
          </h1>
          <p className="text-white/70 mt-1 text-sm">
            Plataforma de Fidelización Digital
          </p>
        </div>
        <div className="card p-8 shadow-2xl !overflow-visible">{children}</div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[10px] text-white/50 space-x-3">
            <Link
              href="/legal/terms"
              className="hover:text-white transition-colors"
            >
              Términos de Servicio
            </Link>
            <span>|</span>
            <Link
              href="/legal/privacy"
              className="hover:text-white transition-colors"
            >
              Política de Privacidad
            </Link>
          </p>
          <p className="text-[10px] text-white/30 tracking-wide leading-relaxed">
            <span className="font-semibold text-white/50">Loyallia</span> ·
            Intelligent Rewards
            <br />
            <a
              href="https://yachaq.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] opacity-60 hover:opacity-100 transition-opacity"
            >
              powered by Yachaq.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
