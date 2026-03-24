import { isDevAuthBypassed } from "@/lib/auth";
import { SignInCta } from "@/components/signin-cta";
import { redirect } from "next/navigation";

export default function SignInPage() {
  if (isDevAuthBypassed()) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12">
      <SignInCta />
    </main>
  );
}
