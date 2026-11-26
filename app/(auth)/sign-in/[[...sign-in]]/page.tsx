import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SigninPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
