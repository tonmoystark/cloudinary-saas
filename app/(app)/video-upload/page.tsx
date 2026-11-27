import VideoUploadClient from "../../../components/video-upload/VideoUploadClient";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";

async function ProtectedVideoUpload() {
  await auth.protect();
  return <VideoUploadClient />;
}

export default function VideoUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <ProtectedVideoUpload />
    </Suspense>
  );
}
