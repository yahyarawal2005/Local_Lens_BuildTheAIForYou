"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { buildProfileFromAuthUser } from "@/lib/authSession";

export default function AuthCallbackPage() {
  const [statusMsg, setStatusMsg] = useState("Verifying authorization credentials...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const handledRef = useRef(false);

  const completeAndNavigate = async (user: any) => {
    if (handledRef.current) return;
    handledRef.current = true;

    setStatusMsg("Setting up your provider profile...");

    if (user) {
      const profile = buildProfileFromAuthUser(user);
      try {
        localStorage.setItem("locallens_provider_session", JSON.stringify(profile));
      } catch (e) {}

      // Background DB sync with profiles table
      try {
        await Promise.race([
          supabase.from("profiles").upsert({
            id: user.id,
            full_name: profile.fullName || user.user_metadata?.full_name || user.user_metadata?.name || "Local Provider",
            avatar_url: profile.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
            updated_at: new Date().toISOString(),
          }),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch (e) {
        console.warn("[OAuth] Profile table sync note:", e);
      }
    }

    setStatusMsg("Authentication successful! Redirecting to your dashboard...");
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 200);
  };

  useEffect(() => {
    async function processOAuthCallback() {
      try {
        if (typeof window === "undefined") return;

        console.log("[OAuth Callback] Full URL:", window.location.href);

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const urlError = urlParams.get("error_description") || urlParams.get("error");

        // Also check hash fragments in case of implicit redirect
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");
        const hashError = hashParams.get("error_description") || hashParams.get("error");

        const combinedError = urlError || hashError;
        if (combinedError) {
          console.error("[OAuth Callback] Received error from auth provider:", combinedError);
          setErrorMsg(decodeURIComponent(combinedError));
          return;
        }

        // 1. Check existing active session immediately
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session?.user) {
          console.log("[OAuth Callback] Active session already verified for user:", existingSession.session.user.id);
          await completeAndNavigate(existingSession.session.user);
          return;
        }

        // 2. Register auth state change listener FIRST so no events are missed
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("[OAuth Callback] Auth state change event:", event);
          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
            subscription.unsubscribe();
            await completeAndNavigate(session.user);
          }
        });

        // 3. If explicit hash tokens exist (implicit flow)
        if (hashAccessToken) {
          console.log("[OAuth Callback] Hash access_token found, setting session...");
          setStatusMsg("Establishing authenticated session...");
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken || "",
          });

          if (!error && data?.session?.user) {
            await completeAndNavigate(data.session.user);
            return;
          }
        }

        // 4. If authorization code exists (PKCE flow)
        if (code) {
          console.log("[OAuth Callback] Exchanging authorization code for session...");
          setStatusMsg("Exchanging code for session...");
          
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session?.user) {
              console.log("[OAuth Callback] Code exchange successful. User ID:", data.session.user.id);
              await completeAndNavigate(data.session.user);
              return;
            }
            if (error) {
              console.warn("[OAuth Callback] exchangeCodeForSession returned notice:", error.message);
            }
          } catch (ex) {
            console.warn("[OAuth Callback] exchangeCodeForSession caught exception:", ex);
          }

          // In Supabase client v2, detectSessionInUrl may auto-exchange the code in parallel.
          // Poll getSession() / getUser() for up to 3 seconds before reporting failure.
          for (let attempt = 1; attempt <= 6; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (handledRef.current) return;
            const { data: polledSession } = await supabase.auth.getSession();
            if (polledSession?.session?.user) {
              console.log(`[OAuth Callback] Session resolved on poll attempt ${attempt}:`, polledSession.session.user.id);
              await completeAndNavigate(polledSession.session.user);
              return;
            }
            const { data: polledUser } = await supabase.auth.getUser();
            if (polledUser?.user) {
              console.log(`[OAuth Callback] User resolved on poll attempt ${attempt}:`, polledUser.user.id);
              await completeAndNavigate(polledUser.user);
              return;
            }
          }

          setErrorMsg("Could not verify Google authorization code. Please return to login and try again.");
          return;
        }

        // 5. Final fallback check
        setTimeout(async () => {
          if (handledRef.current) return;
          const { data: finalCheck } = await supabase.auth.getUser();
          if (finalCheck?.user) {
            await completeAndNavigate(finalCheck.user);
          } else {
            const saved = localStorage.getItem("locallens_provider_session");
            if (saved) {
              window.location.href = "/dashboard";
            } else {
              setErrorMsg("Authentication did not complete in time. Please try logging in again.");
            }
          }
        }, 4000);

      } catch (err: any) {
        console.error("[OAuth Callback] Unexpected exception:", err);
        setErrorMsg(err.message || "An unexpected error occurred during login.");
      }
    }

    processOAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
        {errorMsg ? (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-black">
              !
            </div>
            <h3 className="font-extrabold text-[#0F172A] text-lg">Login Notice</h3>
            <p className="text-xs text-red-600 leading-relaxed">{errorMsg}</p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block py-2 px-5 bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="font-black text-[#0F172A] text-lg">Connecting with Google</h3>
            <p className="text-xs text-slate-500">{statusMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}