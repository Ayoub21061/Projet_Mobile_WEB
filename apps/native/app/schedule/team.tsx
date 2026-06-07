import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, Text, TextInput, View, Image } from "react-native";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useMatch } from "@my-app/hooks";
import { client, orpc } from "utils/orpc";

export default function ScheduleDetails() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const currentUserId = session?.user?.id;

  const { id } = useLocalSearchParams();
  const scheduleId =
    typeof id === "string" ? Number(id) : Number.NaN;
  const scheduleIdForHook =
    Number.isFinite(scheduleId) && scheduleId > 0 ? scheduleId : Number.NaN;

  const [showWaitingModal, setShowWaitingModal] = useState(false);

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
    adminUserId,
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

  const adminParticipant = [...PurpleTeam, ...YellowTeam].find(
    (p: any) => p.__isAdminParticipant
  );
  const isWeb = Platform.OS === "web";


  return (
    <View style={{ flex: 1, flexDirection: isWeb ? "row" : "column" }}>

      {/* Teams section */}
      <View style={{ flex: isWeb ? 2 : 3, position: "relative" }}>

        {isInvitedPending && (
          <View className="absolute top-4 left-4 right-4 z-10 bg-gray-900/90 border border-gray-700 rounded-2xl p-4">
            <Text className="text-white font-semibold text-base">Invitation en attente</Text>
            <Text className="text-gray-300 mt-1">Veux-tu rejoindre ce match ?</Text>
            <View className="flex-row gap-3 mt-4">
              <Pressable onPress={() => joinTeam("PURPLE")} className="flex-1 bg-purple-600 py-3 rounded-full">
                <Text className="text-center text-white font-semibold">Rejoindre Purple</Text>
              </Pressable>
              <Pressable onPress={() => joinTeam("YELLOW")} className="flex-1 bg-yellow-400 py-3 rounded-full">
                <Text className="text-center text-black font-semibold">Rejoindre Yellow</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => leaveTeam()} className="mt-3 bg-gray-700 py-3 rounded-full">
              <Text className="text-center text-white font-semibold">Refuser</Text>
            </Pressable>
          </View>
        )}

        <View className="flex-1 flex-row">
          {/* Purple */}
          <View className="flex-1 bg-purple-600 justify-center items-center">
            <Text className="text-white text-2xl font-bold">Team Purple</Text>
            {!isScheduleIdValid ? (
              <Text className="text-white mt-2">Invalid schedule</Text>
            ) : !isMatchReady && ensureMatchQuery.isLoading ? (
              <Text className="text-white mt-2">Loading...</Text>
            ) : !isMatchReady && ensureMatchQuery.isError ? (
              <Text className="text-white mt-2">Unable to load match</Text>
            ) : null}
            {PurpleTeam.map((p) => {
              const userId = (p.user?.id ?? p.userId) as string | undefined;
              const isAdminParticipant = (!!adminUserId && !!userId && userId === adminUserId) || String((p as any).role ?? "").trim().toUpperCase() === "ADMIN";
              return (
                <GestureDetector key={p.id} gesture={Gesture.Tap().minPointers(2).numberOfTaps(1).runOnJS(true).onEnd((_e, success) => { if (success && userId) setSelectedUserId(userId); })}>
                  <Pressable onPress={() => { }} className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-purple-800"}`} {...(isWeb ? ({ onContextMenu: (e: any) => { e?.preventDefault?.(); if (userId) setSelectedUserId(userId); } } as any) : null)}>
                    <Text className="text-white font-semibold">{p.user?.name ?? p.userId}{isAdminParticipant ? " 👑" : ""}</Text>
                  </Pressable>
                </GestureDetector>
              );
            })}
            {PurpleTeam.length < 5 && (
              <Pressable onPress={() => joinTeam("PURPLE")} className="w-16 h-16 bg-white rounded-lg m-2 justify-center items-center">
                <Text className="text-3xl">+</Text>
              </Pressable>
            )}
          </View>

          {/* Yellow */}
          <View className="flex-1 bg-yellow-400 justify-center items-center">
            <Text className="text-black text-2xl font-bold">Team Yellow</Text>
            {YellowTeam.map((p) => {
              const userId = (p.user?.id ?? p.userId) as string | undefined;
              const isAdminParticipant = (!!adminUserId && !!userId && userId === adminUserId) || String((p as any).role ?? "").trim().toUpperCase() === "ADMIN";
              return (
                <GestureDetector key={p.id} gesture={Gesture.Tap().minPointers(2).numberOfTaps(1).runOnJS(true).onEnd((_e, success) => { if (success && userId) setSelectedUserId(userId); })}>
                  <Pressable onPress={() => { }} className={`px-4 py-2 rounded-full mt-2 ${p.confirmed ? "bg-green-600" : "bg-yellow-500"}`} {...(isWeb ? ({ onContextMenu: (e: any) => { e?.preventDefault?.(); if (userId) setSelectedUserId(userId); } } as any) : null)}>
                    <Text className="text-black font-semibold">{p.user?.name ?? p.userId}{isAdminParticipant ? " 👑" : ""}</Text>
                  </Pressable>
                </GestureDetector>
              );
            })}
            {YellowTeam.length < 5 && (
              <Pressable onPress={() => joinTeam("YELLOW")} className="w-16 h-16 bg-white rounded-lg m-2 justify-center items-center">
                <Text className="text-3xl">+</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Rond noir */}
        {/* Rond noir - plus petit sur mobile */}
        <View pointerEvents="none" className="absolute left-0 right-0 items-center" style={{ top: "35%" }}>
          <View className="justify-center items-center bg-black rounded-full" style={{ width: isWeb ? 160 : 80, height: isWeb ? 160 : 80 }}>
            <Text className={`text-white font-bold text-center px-4 ${isWeb ? "text-lg" : "text-sm"}`}>{confirmedLabel}</Text>
          </View>
        </View>

        {myParticipant && (
          <View className="absolute left-0 right-0 bottom-4 items-start pl-4">
            <Pressable onPress={leaveTeam} className="bg-red-600 px-6 py-3 rounded-full">
              <Text className="text-white font-bold">Leave Match</Text>
            </Pressable>
          </View>
        )}

        {myParticipant && !myParticipant.confirmed && (
          <Pressable onPress={confirmMatch} className="absolute bottom-4 right-4 bg-green-600 px-8 py-3 rounded-full">
            <Text className="text-white font-bold">Confirm</Text>
          </Pressable>
        )}

        {canStartMatch && (isAdmin ? (
          <Pressable onPress={() => router.push({ pathname: "/payment", params: { matchId } })} className="absolute bottom-24 right-4 bg-blue-900 px-13 py-3 rounded-full">
            <Text className="text-white font-bold">Start Match</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setShowWaitingModal(true)} className="absolute bottom-24 right-4 bg-gray-500 px-13 py-3 rounded-full">
            <Text className="text-white font-bold">Start Match</Text>
          </Pressable>
        ))}

        {showWaitingModal && (
          <View className="absolute inset-0 bg-black/50 justify-center items-center">
            <View className="bg-white p-6 rounded-2xl w-80">
              <Text className="text-center text-lg font-bold">En attente de la confirmation de {adminParticipant?.user?.name ?? "l'organisateur"}</Text>
              <Pressable onPress={() => setShowWaitingModal(false)} className="mt-4 bg-gray-300 py-2 rounded-full">
                <Text className="text-center">OK</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Chat section */}
      <View style={{ flex: isWeb ? 1 : 2, borderTopWidth: isWeb ? 0 : 1, borderLeftWidth: isWeb ? 1 : 0, borderColor: "#d1d5db", backgroundColor: "#f3f4f6" }}>
        <View className="flex-1 p-3">
          <ScrollView className="flex-1">
            {messages.map((msg) => (
              <View key={msg.id} className="mb-2">
                <GestureDetector gesture={Gesture.Tap().minPointers(2).numberOfTaps(1).runOnJS(true).onEnd((_e, success) => { if (success && msg.sender?.id) setSelectedUserId(msg.sender.id); })}>
                  <Pressable onPress={() => { }} {...(isWeb ? ({ onContextMenu: (e: any) => { e?.preventDefault?.(); if (msg.sender?.id) setSelectedUserId(msg.sender.id); } } as any) : null)}>
                    <Text className="text-xs text-blue-600">{msg.sender?.name}</Text>
                  </Pressable>
                </GestureDetector>
                <GestureDetector gesture={Gesture.Tap().minPointers(1).numberOfTaps(2).runOnJS(true).onEnd((_e, success) => { if (success) openMessageMenu(msg); })}>
                  <Pressable onPress={() => { }} {...(isWeb ? ({ onContextMenu: (e: any) => { e?.preventDefault?.(); openMessageMenu(msg); } } as any) : null)}>
                    <View className="bg-white p-2 rounded-lg shadow">
                      <Text>{msg.content}</Text>
                    </View>
                  </Pressable>
                </GestureDetector>
                {openMessageMenuId === msg.id && (isAdmin || msg.senderId === currentUserId) && (
                  <View className="mt-2 self-start bg-white rounded-lg shadow overflow-hidden">
                    {msg.senderId === currentUserId && (
                      <>
                        <Pressable onPress={() => editMessageFromMenu(msg)} className="px-3 py-2"><Text>Modifier</Text></Pressable>
                        <View className="h-px bg-gray-200" />
                      </>
                    )}
                    <Pressable onPress={() => void deleteMessageFromMenu(msg)} className="px-3 py-2"><Text>Supprimer</Text></Pressable>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View className="flex-row items-center border-t pt-2">
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={canSendMessage ? "Type a message..." : "Rejoignez une équipe pour écrire..."}
              editable={canSendMessage}
              className={`flex-1 rounded-full px-4 py-2 mr-2 ${canSendMessage ? "bg-white" : "bg-gray-200"}`}
            />
            <Pressable onPress={sendMessage} disabled={!canSendMessage} className={`p-3 rounded-full ${canSendMessage ? "bg-blue-600" : "bg-gray-400"}`}>
              <Text className="text-white">➤</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {selectedUserId && (
        <View className="absolute inset-0 bg-black/40 justify-center items-center">
          <View className="w-80 bg-white rounded-2xl p-6 shadow-xl">
            {userProfileQuery.isLoading ? <Text>Loading...</Text> : (
              <>
                <View className="items-center mb-4">
                  <View className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden">
                    {userProfileQuery.data?.photoUrl && <Image source={{ uri: userProfileQuery.data.photoUrl }} className="w-full h-full" />}
                  </View>
                </View>
                <Text className="text-xl font-bold text-center">{userProfileQuery.data?.pseudo ?? userProfileQuery.data?.name}</Text>
                <Text className="text-center mt-2">🏆 Matches played: {userProfileQuery.data?.matchesPlayed}</Text>
                <Text className="text-center mt-2">⭐ Rating: {userProfileQuery.data?.averageRating == null ? "-" : `${userProfileQuery.data.averageRating.toFixed(1)}/5`} ({userProfileQuery.data?.ratingsCount ?? 0})</Text>
                <View className="mt-4 items-center">
                  {userProfileQuery.data?.badges?.length ? <Text>🎖 {userProfileQuery.data.badges[0].badge.name}</Text> : <Text>No badge yet</Text>}
                </View>
              </>
            )}
            <Pressable onPress={() => setSelectedUserId(null)} className="mt-6 bg-gray-200 py-2 rounded-full">
              <Text className="text-center font-semibold">Close</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}