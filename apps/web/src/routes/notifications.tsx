import { createFileRoute } from "@tanstack/react-router";

import { useNotifications } from "@my-app/hooks";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/notifications")({
  component: Page,
});

function Page() {
  const { data: session, isPending } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const {
    friendRequestsQuery,
    acceptFriendRequestMutation,
    matchInvitesQuery,
    participantsQuery,
    matchesQuery,
    myFullMatches,
    matchesWithNewMessages,
    getScheduleIdForMatchId,
  } = useNotifications(orpc, client, currentUserId);

  const friendRequests = (friendRequestsQuery.data as any[] | undefined) ?? [];
  const matchInvites = (matchInvitesQuery.data as any[] | undefined) ?? [];

  const goToTeamForMatch = (matchId: number) => {
    const scheduleId = getScheduleIdForMatchId(matchId);
    if (scheduleId) {
      window.location.assign(`/team?id=${encodeURIComponent(String(scheduleId))}`);
      return;
    }
    window.location.assign(`/payments?matchId=${encodeURIComponent(String(matchId))}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-white">Notifications</h1>

      {isPending ? (
        <div className="text-white">Loading session...</div>
      ) : !currentUserId ? (
        <div className="text-white">Connecte-toi pour voir tes notifications.</div>
      ) : participantsQuery.isLoading || matchesQuery.isLoading ? (
        <div className="text-white">Loading...</div>
      ) : matchesWithNewMessages.length === 0 &&
        myFullMatches.length === 0 &&
        friendRequests.length === 0 &&
        matchInvites.length === 0 ? (
        <div className="text-white">Aucune notification pour le moment.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {matchInvites.map((invite: any) => (
            <button
              key={invite.id}
              type="button"
              onClick={() => goToTeamForMatch(invite.matchId)}
              className="bg-white rounded-2xl p-5 border border-gray-200 text-left"
            >
              <div className="font-semibold text-gray-900">Invitation à un match</div>
              <div className="text-sm text-gray-600 mt-1">
                Vous avez été invité au Match #{invite.matchId} par {" "}
                {invite.inviter?.pseudo ??
                  invite.inviter?.name ??
                  (invite.invitedById ? `#${invite.invitedById}` : "?")}
                .
              </div>
            </button>
          ))}

          {friendRequests.map((req: any) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-5 border border-gray-200"
            >
              <div className="font-semibold text-gray-900">
                Vous avez une nouvelle demande d’ami !
              </div>
              <div className="text-sm text-gray-600 mt-1">
                De {req.sender?.pseudo ?? req.sender?.name}
              </div>
              <button
                type="button"
                disabled={acceptFriendRequestMutation.isPending}
                onClick={() => {
                  if (acceptFriendRequestMutation.isPending) return;
                  void acceptFriendRequestMutation.mutateAsync({ requestId: req.id });
                }}
                className="mt-4 bg-blue-600 py-3 px-4 rounded-full text-white font-semibold disabled:opacity-60"
              >
                Accepter
              </button>
            </div>
          ))}

          {(matchesWithNewMessages as any[]).map((item: any) => (
            <button
              key={item.matchId}
              type="button"
              onClick={() => goToTeamForMatch(item.matchId)}
              className="bg-white rounded-2xl p-5 border border-gray-200 text-left"
            >
              <div className="font-semibold text-gray-900">Nouveau message</div>
              <div className="text-sm text-gray-600 mt-1">Match #{item.matchId}</div>
              <div className="text-sm text-gray-800 mt-2">{item.lastMessage?.content}</div>
            </button>
          ))}

          {myFullMatches.map((item: any) => (
            <button
              key={item.matchId}
              type="button"
              onClick={() => goToTeamForMatch(item.matchId)}
              className="bg-white rounded-2xl p-5 border border-gray-200 text-left"
            >
              <div className="font-semibold text-gray-900">Match complet</div>
              <div className="text-sm text-gray-600 mt-1">
                Match #{item.matchId}
                {item.scheduleId ? ` (schedule #${item.scheduleId})` : ""}
              </div>
              <div className="text-sm text-gray-800 mt-2">
                Les 10 joueurs sont prêts. Le match peut être organisé.
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
