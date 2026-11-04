import { Suspense } from "react";
import { AuthPortal } from "@/components/auth/AuthPortal";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-semibold">Loading LocalLens Portal...</div>}>
      <AuthPortal initialMode="signup" />
    </Suspense>
  );
}
