import { createFileRoute } from "@tanstack/react-router";

import { useFriendsSearch } from "@my-app/hooks";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/friends_search")({
  component: Page,
});

function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const {
    text,
    setText,
    selectedUserId,
    setSelectedUserId,
    usersQuery,
    filteredUsers,
    userProfileQuery,
    sendFriendRequestToSelectedUser,
    sendFriendRequestMutation,
  } = useFriendsSearch(orpc, currentUserId);

  const selectedProfile = userProfileQuery.data as any | undefined;

  const addFriend = async () => {
    try {
      await sendFriendRequestToSelectedUser();
      globalThis.alert?.("Demande envoyée: Ta demande d’ami a été envoyée.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message === "Not signed in") {
        globalThis.alert?.("Connexion requise: Connecte-toi pour ajouter un ami.");
        return;
      }
      globalThis.alert?.(`Erreur: ${message}`);
    }
  };

  return (
    <div className="p-6">
      <div className="gap-2 mb-4">
        <h1 className="text-3xl font-bold text-white">Friends</h1>
        <div className="text-base text-gray-300">Rechercher vos amis :</div>
      </div>

      <div className="flex flex-row items-center bg-gray-800 rounded-xl px-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Friend's name or email"
          className="flex-1 bg-gray-800 text-white p-4 rounded-xl outline-none"
        />
        <div className="text-gray-400">🔎</div>
      </div>

      {usersQuery.isLoading ? (
        <div className="text-gray-300 mt-4">Loading users...</div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {(filteredUsers as any[]).map((user: any) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelectedUserId(String(user.id))}
            className="bg-gray-800 rounded-xl p-4 text-left"
          >
            <div className="text-white font-semibold">{user.name}</div>
            <div className="text-gray-300">{user.email}</div>
          </button>
        ))}
      </div>

      {selectedUserId ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-gray-700">
            {userProfileQuery.isLoading ? (
              <div className="text-white text-center">Loading...</div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-4xl">
                    👤
                  </div>
                </div>

                <div className="text-xl font-bold text-center text-white">
                  {selectedProfile?.pseudo ?? selectedProfile?.name}
                </div>

                <div className="text-center text-gray-300 mt-1">
                  {selectedProfile?.email}
                </div>

                <div className="text-center text-gray-300 mt-4">
                  🏆 Matches played: {selectedProfile?.matchesPlayed ?? 0}
                </div>

                <button
                  type="button"
                  disabled={sendFriendRequestMutation.isPending}
                  onClick={() => void addFriend()}
                  className="mt-6 w-full flex flex-row gap-2 items-center justify-center bg-blue-600 py-3 rounded-full text-white font-semibold disabled:opacity-60"
                >
                  <span>➕</span>
                  <span>Add Friend</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="mt-4 w-full bg-gray-700 py-2 rounded-full text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
