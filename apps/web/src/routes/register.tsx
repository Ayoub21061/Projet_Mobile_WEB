import { createFileRoute } from "@tanstack/react-router";

import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/register")({
  component: Page,
});

function Page() {
  return (
    <SignUpForm
      onSwitchToSignIn={() => {
        window.location.assign("/login");
      }}
    />
  );
}
