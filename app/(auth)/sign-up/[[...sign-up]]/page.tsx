import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <Suspense>
      <SignUp />
    </Suspense>
  );
}
