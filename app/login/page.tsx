"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import Image from "next/image";
import BhurasaLogo from "@/public/BhurasaNoBg.png";

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_IN") {
        router.push("/");
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-emerald-950">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <Image
            src={BhurasaLogo}
            alt="Bhurasa Logo"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Groundnut Oil OS
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to access your operating system
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "rgb(16 185 129)",
                    brandAccent: "rgb(5 150 105)",
                    // FORCE VISIBILITY: Hardcode these to ensure text is never invisible
                    inputText: "#18181b", // Zinc-900 (Black-ish)
                    inputBackground: "#ffffff", // White
                    inputBorder: "#e4e4e7", // Zinc-200
                    inputPlaceholder: "#a1a1aa", // Zinc-400
                  },
                  radii: {
                    buttonBorderRadius: "0.5rem",
                    inputBorderRadius: "0.5rem",
                  },
                },
              },
              className: {
                container: "w-full",
                button: "w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition",
                // Removed 'dark:' classes from input to prevent conflicts. It will now always be White bg with Black text.
                input: "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200",
                label: "block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1",
              },
            }}
            providers={[]}
            view="sign_in"
            showLinks={false}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Email Address",
                  password_label: "Password",
                  button_label: "Sign In",
                  loading_button_label: "Signing in...",
                },
              },
            }}
          />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Access restricted to authorized personnel only.
        </p>
      </div>
    </div>
  );
}