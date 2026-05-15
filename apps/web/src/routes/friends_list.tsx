import { createFileRoute } from "@tanstack/react-router";

import { useFriendsList } from "@my-app/hooks";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/friends_list")({
  component: Page,
});

function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const {
    selectedUserId,
    setSelectedUserId,
    friendsQuery,
    friends,
    userProfileQuery,
    selectedProfile,
    removeFriendMutation,
    removeSelectedFriend,
  } = useFriendsList(orpc, currentUserId);

  const inviteToMatch = () => {
    if (!selectedUserId) return;
    window.location.assign(
      `/my_matches?inviteUserId=${encodeURIComponent(String(selectedUserId))}`
    );
  };

  const removeFriend = async () => {
    try {
      await removeSelectedFriend();
      globalThis.alert?.("Ami supprimé: Cet ami a été supprimé.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message === "Not signed in") {
        globalThis.alert?.("Connexion requise: Connecte-toi pour voir tes amis.");
        return;
      }
      globalThis.alert?.(`Erreur: ${message}`);
    }
  };

  return (
    <div className="p-6">
      <div className="gap-2 mb-4">
        <h1 className="text-3xl font-bold text-white">Friends</h1>
        <div className="text-base text-gray-300">Friend's list</div>
      </div>

      {friendsQuery.isLoading ? (
        <div className="text-gray-300 mt-4">Loading friends...</div>
      ) : (friends as any[]).length === 0 ? (
        <div className="text-gray-300 mt-4">No friends yet.</div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {(friends as any[]).map((friend: any) => (
            <button
              key={String(friend.id)}
              type="button"
              onClick={() => setSelectedUserId(String(friend.id))}
              className="bg-gray-800 rounded-xl p-4 text-left"
            >
              <div className="text-white font-semibold">
                {friend.pseudo ?? friend.name}
              </div>
              <div className="text-gray-300">{friend.email}</div>
            </button>
          ))}
        </div>
      )}

      {selectedUserId ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-gray-700">
            {userProfileQuery.isLoading ? (
              <div className="text-white text-center">Loading...</div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
                    {selectedProfile?.photoUrl ? (
                      <img
                        src={String(selectedProfile.photoUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="text-xl font-bold text-center text-white">
                  {selectedProfile?.pseudo ?? selectedProfile?.name}
                </div>

                <div className="text-center text-gray-300 mt-4">
                  🏆 Matches played: {selectedProfile?.matchesPlayed ?? 0}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={inviteToMatch}
              className="mt-6 w-full bg-blue-600 py-3 rounded-full text-white font-semibold"
            >
              Inviter au match
            </button>

            <button
              type="button"
              disabled={removeFriendMutation.isPending}
              onClick={() => void removeFriend()}
              className="mt-3 w-full bg-gray-700 py-3 rounded-full text-white font-semibold disabled:opacity-60"
            >
              Supprimer
            </button>

            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="mt-3 w-full bg-gray-700 py-2 rounded-full text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
