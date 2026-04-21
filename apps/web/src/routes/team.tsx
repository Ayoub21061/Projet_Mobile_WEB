import { createFileRoute } from "@tanstack/react-router";
import { useMatch } from "@my-app/hooks";
import { client, orpc } from "@/utils/orpc";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

export const Route = createFileRoute("/team")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.id;
    return {
      id:
        typeof raw === "string"
          ? raw
          : typeof raw === "number"
            ? String(raw)
            : "",
    };
  },
  component: Page,
});

function Page() {
  const { data: session } = authClient.useSession();
  const { id } = Route.useSearch();
  const scheduleId = Number(id);
  const scheduleIdForHook = Number.isFinite(scheduleId) && scheduleId > 0 ? scheduleId : Number.NaN;

  const [showWaitingModal, setShowWaitingModal] = useState(false);

  const currentUserId = session?.user?.id;

  const {
    matchId,
    PurpleTeam,
    YellowTeam,
    myParticipant,
    isInvitedPending,
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
    canSendMessage,
    joinTeam,
    leaveTeam,
    confirmMatch,
    isMatchReady,
    isScheduleIdValid,
    ensureMatchQuery,
    canStartMatch,
    isAdmin,
    openMessageMenuId,
    openMessageMenu,
    editMessageFromMenu,
    deleteMessageFromMenu,
    editingMessageId,
    setEditingMessageId,
    selectedUserId,
    setSelectedUserId,
    userProfileQuery,
    confirmedLabel,
  } = useMatch(orpc, client, scheduleIdForHook, currentUserId);

  if (!Number.isFinite(scheduleId) || scheduleId <= 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="mt-2">Missing or invalid schedule id in URL.</p>
      </div>
    );
  }

  const hasCurrentUser = !!currentUserId;

  const adminP = [...PurpleTeam, ...YellowTeam].find((p: any) => p.__isAdminParticipant);
  const adminParticipantName = (adminP?.user?.name ?? adminP?.userId ?? "l'organisateur") as string;

  return (
    <div className="flex h-full min-h-0 flex-row">

      <div className="relative flex min-h-0 flex-col" style={{ flex: 2 }}>
        {isInvitedPending ? (
          <div className="absolute top-4 left-4 right-4 z-10 bg-gray-900/90 border border-gray-700 rounded-2xl p-4">
            <div className="text-white font-semibold text-base">Invitation en attente</div>
            <div className="text-gray-300 mt-1">Veux-tu rejoindre ce match ?</div>

            <div className="flex flex-row gap-3 mt-4">
              <button
                type="button"
                onClick={() => void joinTeam("PURPLE")}
                className="flex-1 bg-purple-600 py-3 rounded-full"
                disabled={!hasCurrentUser}
              >
                <div className="text-center text-white font-semibold">Rejoindre Purple</div>
              </button>

              <button
                type="button"
                onClick={() => void joinTeam("YELLOW")}
                className="flex-1 bg-yellow-400 py-3 rounded-full"
                disabled={!hasCurrentUser}
              >
                <div className="text-center text-black font-semibold">Rejoindre Yellow</div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => void leaveTeam()}
              className="mt-3 bg-gray-700 py-3 rounded-full w-full"
              disabled={!hasCurrentUser}
            >
              <div className="text-center text-white font-semibold">Refuser</div>
            </button>
          </div>
        ) : null}

        <div className="flex-1 min-h-0 flex flex-row">
          <div className="flex-1 bg-purple-600 justify-center items-center flex flex-col">
            <div className="text-white text-2xl font-bold">Team Purple</div>

            {!isScheduleIdValid ? (
              <div className="text-white mt-2">Invalid schedule</div>
            ) : !isMatchReady && ensureMatchQuery.isLoading ? (
              <div className="text-white mt-2">Loading...</div>
            ) : !isMatchReady && ensureMatchQuery.isError ? (
              <div className="text-white mt-2">Unable to load match</div>
            ) : null}

            {PurpleTeam.map((p: any) => {
              const userId = (p.user?.id ?? p.userId) as string | undefined;
              return (
                <div
                  key={p.id}
                  className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-purple-800"}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (userId) setSelectedUserId(userId);
                  }}
                >
                  <div className="text-white font-semibold">
                    {p.user?.name ?? p.userId}
                    {p.__isAdminParticipant ? " 👑" : ""}
                  </div>
                </div>
              );
            })}

            {PurpleTeam.length < 5 ? (
              <button
                type="button"
                onClick={() => void joinTeam("PURPLE")}
                className="w-16 h-16 bg-white rounded-lg m-2 justify-center items-center flex"
                disabled={!hasCurrentUser}
              >
                <div className="text-3xl text-black">+</div>
              </button>
            ) : null}
          </div>

          <div className="flex-1 bg-yellow-400 justify-center items-center flex flex-col">
            <div className="text-black text-2xl font-bold">Team Yellow</div>

            {YellowTeam.map((p: any) => {
              const userId = (p.user?.id ?? p.userId) as string | undefined;
              return (
                <div
                  key={p.id}
                  className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-yellow-500"}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (userId) setSelectedUserId(userId);
                  }}
                >
                  <div className="text-black font-semibold">
                    {p.user?.name ?? p.userId}
                    {p.__isAdminParticipant ? " 👑" : ""}
                  </div>
                </div>
              );
            })}

            {YellowTeam.length < 5 ? (
              <button
                type="button"
                onClick={() => void joinTeam("YELLOW")}
                className="w-16 h-16 bg-white rounded-lg m-2 justify-center items-center flex"
                disabled={!hasCurrentUser}
              >
                <div className="text-3xl text-black">+</div>
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="pointer-events-none absolute left-0 right-0 flex items-center justify-center"
          style={{ top: "40%" }}
        >
          <div
            className="flex items-center justify-center bg-black rounded-full"
            style={{ width: 160, height: 160 }}
          >
            <div className="text-white text-lg font-bold text-center px-4">{confirmedLabel}</div>
          </div>
        </div>

        {myParticipant ? (
          <div className="absolute left-0 right-0 bottom-16 items-center">
            <button
              type="button"
              onClick={() => void leaveTeam()}
              className="bg-red-600 px-6 py-3 rounded-full"
            >
              <div className="text-white font-bold">Leave Match</div>
            </button>
          </div>
        ) : null}

        {myParticipant && !myParticipant.confirmed ? (
          <button
            type="button"
            onClick={() => void confirmMatch()}
            className="absolute bottom-16 right-4 bg-green-600 px-16 py-3 rounded-full"
          >
            <div className="text-white font-bold">Confirm</div>
          </button>
        ) : null}

        {canStartMatch ? (
          isAdmin ? (
            <button
              type="button"
              onClick={() => {
                // Keeps parity with native navigation target
                window.location.href = `/payment?matchId=${matchId}`;
              }}
              className="absolute bottom-24 right-4 bg-blue-900 px-12 py-3 rounded-full"
            >
              <div className="text-white font-bold">Start Match</div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowWaitingModal(true)}
              className="absolute bottom-24 right-4 bg-gray-500 px-12 py-3 rounded-full"
            >
              <div className="text-white font-bold">Start Match</div>
            </button>
          )
        ) : null}

        {showWaitingModal ? (
          <div className="absolute inset-0 bg-black/50 justify-center items-center flex">
            <div className="bg-white p-6 rounded-2xl w-80">
              <div className="text-center text-lg font-bold">
                En attente de la confirmation de {adminParticipantName}
              </div>

              <button
                type="button"
                onClick={() => setShowWaitingModal(false)}
                className="mt-4 bg-gray-300 py-2 rounded-full w-full"
              >
                <div className="text-center">OK</div>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 bg-gray-100 border-l border-gray-300 flex flex-col" style={{ flex: 1 }}>
        <div className="flex-1 min-h-0 p-3 flex flex-col">

          <div className="flex-1 min-h-0 overflow-auto">
            {messages.map((msg: any) => (
              <div key={msg.id} className="mb-2">
                <button
                  type="button"
                  className="text-xs text-blue-600"
                  onClick={() => {
                    if (msg.sender?.id) setSelectedUserId(msg.sender.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (msg.sender?.id) setSelectedUserId(msg.sender.id);
                  }}
                >
                  {msg.sender?.name}
                </button>

                <button
                  type="button"
                  className="block text-left"
                  onDoubleClick={() => openMessageMenu(msg)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMessageMenu(msg);
                  }}
                >
                  <div className="bg-white p-2 rounded-lg shadow text-black">
                    <div className="text-black">{msg.content}</div>
                  </div>
                </button>

                {openMessageMenuId === Number(msg.id) && (isAdmin || msg.senderId === currentUserId) ? (
                  <div className="mt-2 self-start bg-white rounded-lg shadow overflow-hidden text-black">
                    {msg.senderId === currentUserId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => editMessageFromMenu(msg)}
                          className="px-3 py-2 w-full text-left text-black"
                        >
                          Modifier
                        </button>
                        <div className="h-px bg-gray-200" />
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void deleteMessageFromMenu(msg)}
                      className="px-3 py-2 w-full text-left text-black"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex-row items-center border-t pt-2 flex">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                canSendMessage ? "Type a message..." : "Rejoignez une équipe pour écrire..."
              }
              disabled={!canSendMessage}
              className={`flex-1 rounded-full px-4 py-2 mr-2 text-black ${canSendMessage ? "bg-white" : "bg-gray-200"}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingMessageId(null);
                  setNewMessage("");
                  return;
                }
                if (e.key === "Enter") {
                  void sendMessage();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!canSendMessage}
              className={`p-3 rounded-full ${canSendMessage ? "bg-blue-600" : "bg-gray-400"}`}
              aria-label={editingMessageId != null ? "Update message" : "Send message"}
              title={editingMessageId != null ? "Update" : "Send"}
            >
              <div className="text-white">➤</div>
            </button>
          </div>
        </div>
      </div>

      {selectedUserId ? (
        <div className="absolute inset-0 bg-black/40 justify-center items-center flex">
          <div className="w-80 bg-white rounded-2xl p-6 shadow-xl text-black">
            {userProfileQuery.isLoading ? (
              <div>Loading...</div>
            ) : (
              <>
                <div className="items-center mb-4 flex flex-col">
                  <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
                    {userProfileQuery.data?.photoUrl ? (
                      <img
                        src={userProfileQuery.data.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>

                <div className="text-xl font-bold text-center">
                  {userProfileQuery.data?.pseudo ?? userProfileQuery.data?.name}
                </div>

                <div className="text-center mt-2">
                  🏆 Matches played: {userProfileQuery.data?.matchesPlayed}
                </div>

                <div className="text-center mt-2">
                  ⭐ Rating:{" "}
                  {userProfileQuery.data?.averageRating == null
                    ? "-"
                    : `${Number(userProfileQuery.data.averageRating).toFixed(1)}/5`} ({userProfileQuery.data?.ratingsCount ?? 0})
                </div>

                <div className="mt-4 items-center flex flex-col">
                  {userProfileQuery.data?.badges?.length ? (
                    <div>🎖 {userProfileQuery.data.badges[0].badge.name}</div>
                  ) : (
                    <div>No badge yet</div>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="mt-6 bg-gray-200 py-2 rounded-full w-full"
            >
              <div className="text-center font-semibold">Close</div>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}