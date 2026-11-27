import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import SocialShareClient from "@/components/social-share/SocialShareClient";

async function ProtectedSocialShare() {
  await auth.protect();
  return <SocialShareClient />;
}

export default function SocialSharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <ProtectedSocialShare />
    </Suspense>
  );
}
