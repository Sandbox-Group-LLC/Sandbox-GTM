import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <SignUp routing="hash" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </div>
  );
}
