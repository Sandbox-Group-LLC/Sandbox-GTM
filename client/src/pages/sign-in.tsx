import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
    </div>
  );
}
