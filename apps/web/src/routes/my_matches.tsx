import { createFileRoute } from "@tanstack/react-router";
import { useMyMatches } from "@my-app/hooks";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/my_matches")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = (search as any).inviteUserId;
    if (typeof raw === "string") {
      return { inviteUserId: raw };
    }
    if (typeof raw === "number") {
      return { inviteUserId: String(raw) };
    }
    return {};
  },
  component: Page,
});

function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const { inviteUserId } = Route.useSearch();
  const inviteeId = inviteUserId ? inviteUserId : null;

  const { myParticipations, inviteMutation, inviteUserToMatch } = useMyMatches(
    orpc,
    currentUserId
  );

  const invite = async (matchId: number) => {
    if (!inviteeId) return;
    if (inviteMutation.isPending) return;
    await inviteUserToMatch({ matchId, userId: inviteeId });
    // Keep it simple (no new UI system): use a blocking confirm-style feedback
    globalThis.alert?.("Invitation envoyée");
    window.history.back();
  };

  const navigateToPayments = (matchId: number) => {
    window.location.assign(`/payments?matchId=${encodeURIComponent(String(matchId))}`);
  };

  if (!currentUserId) {
    return (
      <div className="p-6">
        <div className="text-lg">Please sign in.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Matches</h1>

      {inviteeId ? (
        <div className="mb-3">Select a match to invite your friend.</div>
      ) : null}

      {myParticipations.length === 0 ? (
        <div>You haven't joined any matches yet.</div>
      ) : null}

      <div className="flex flex-col gap-3">
        {myParticipations.map((p: any) => {
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (inviteeId) {
                  void invite(p.matchId);
                  return;
                }
                navigateToPayments(p.matchId);
              }}
              className="bg-gray-200 p-4 rounded-xl text-left"
            >
              <div className="font-bold text-black">Match #{p.matchId}</div>
              <div className="text-black">Team: {p.team}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

