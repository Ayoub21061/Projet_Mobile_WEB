import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useMatch(
  orpc: any,
  client: any,
  scheduleId: number,
  currentUserId?: string
) {
  const queryClient = useQueryClient();
  const isScheduleIdValid = Number.isFinite(scheduleId);

  // 🔹 Ensure match
  const ensureMatchQuery = useQuery({
    queryKey: ["matches.ensureForSchedule", scheduleId],
    queryFn: async () => client.matches.ensureForSchedule({ scheduleId }),
    enabled: isScheduleIdValid,
  });

  const ensuredMatch = ensureMatchQuery.data as any | undefined;
  const matchId = ensuredMatch?.id;
  const isMatchReady = Number.isFinite(matchId);

  // 🔹 Participants
  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: isMatchReady,
  });

  const participantsRaw: any[] = (participantsQuery.data as any[] | undefined) ?? [];

  const participants = participantsRaw.filter(
    (p: any) => p.matchId === matchId && p.status === "ACCEPTED"
  );

  const myParticipantAny = participantsRaw.find(
    (p: any) => isMatchReady && !!currentUserId && p.matchId === matchId && p.userId === currentUserId
  );
  const isInvitedPending = myParticipantAny?.status === "PENDING";

  const adminParticipantAny = participantsRaw.find(
    (p: any) =>
      isMatchReady &&
      p.matchId === matchId &&
      String((p as any).role ?? "")
        .trim()
        .toUpperCase() === "ADMIN"
  );
  const adminUserId = adminParticipantAny?.userId as string | undefined;
  const isAdmin = !!currentUserId && !!adminUserId && currentUserId === adminUserId;

  const myParticipant = participants.find(
    (p: any) => currentUserId && p.userId === currentUserId
  );

  const canStartMatch =
    isMatchReady &&
    participants.length === 10 &&
    participants.every((p: any) => p.confirmed);

  // 🔹 Mutations
  const joinMutation = useMutation<any, any, any>(
    orpc.match_participant.join.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const leaveMutation = useMutation<any, any, any>(
    orpc.match_participant.leave.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const confirmMutation = useMutation<any, any, any>(
    orpc.match_participant.confirm.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const joinTeam = async (team: "PURPLE" | "YELLOW") => {
    if (!isMatchReady || typeof matchId !== "number") return;
    if (!currentUserId) return;
    if (participants.length >= 10) return;
    await joinMutation.mutateAsync({ matchId, team });
    await participantsQuery.refetch();
  };

  const leaveTeam = async () => {
    if (!isMatchReady || typeof matchId !== "number") return;
    if (!currentUserId) return;
    await leaveMutation.mutateAsync({ matchId });
    await participantsQuery.refetch();
  };

  const confirmMatch = async () => {
    if (!isMatchReady || typeof matchId !== "number") return;
    if (!currentUserId) return;
    await confirmMutation.mutateAsync({ matchId });
    await participantsQuery.refetch();
  };

  // 🔹 Messages
  const messagesQuery = useQuery({
    ...orpc.message.listByMatch.queryOptions({ input: { matchId } }),
    enabled: isMatchReady && !!myParticipant,
  });

  const [newMessage, setNewMessage] = useState("");

  const canSendMessage = !!myParticipant && myParticipant.status === "ACCEPTED";

  const sendMessageMutation = useMutation<any, any, any>(
    orpc.message.create.mutationOptions({
      onSuccess: async () => {
        setNewMessage("");
        await queryClient.invalidateQueries();
      },
    })
  );

  const deleteMessageMutation = useMutation<any, any, any>(
    orpc.message.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const updateMessageMutation = useMutation<any, any, any>(
    orpc.message.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<number | null>(null);

  const openMessageMenu = (msg: any) => {
    if (!currentUserId) return;
    if (!isAdmin && msg.senderId !== currentUserId) return;
    const messageId = Number(msg.id);
    if (!Number.isFinite(messageId)) return;
    setOpenMessageMenuId((prev) => (prev === messageId ? null : messageId));
  };

  const editMessageFromMenu = (msg: any) => {
    if (!currentUserId) return;
    if (msg.senderId !== currentUserId) return;
    setNewMessage(String(msg.content ?? ""));
    setEditingMessageId(Number(msg.id));
    setOpenMessageMenuId(null);
  };

  const deleteMessageFromMenu = async (msg: any) => {
    if (!currentUserId) return;
    if (!isAdmin && msg.senderId !== currentUserId) return;
    setOpenMessageMenuId(null);
    await deleteMessageMutation.mutateAsync({ id: Number(msg.id) });
  };

  const sendMessage = async () => {
    if (!isMatchReady || typeof matchId !== "number") return;
    if (!canSendMessage) return;
    const content = newMessage.trim();
    if (!content) return;

    if (editingMessageId != null) {
      await updateMessageMutation.mutateAsync({ id: editingMessageId, content });
      setEditingMessageId(null);
      setNewMessage("");
      return;
    }

    await sendMessageMutation.mutateAsync({ matchId, content });
  };

  const messages: any[] = ((messagesQuery.data as any[] | undefined) ?? []);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const userProfileQuery = useQuery<any>({
    ...orpc.user.getProfile.queryOptions({
      input: { userId: selectedUserId! },
    }),
    enabled: !!selectedUserId,
  });

  const markAsSeenMutation = useMutation({
    mutationFn: async () => {
      if (!isMatchReady || typeof matchId !== "number") return;
      return await client.match_participant.markAsSeen({ matchId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.match_participant.list.queryKey(),
      });
    },
  });

  useEffect(() => {
    if (!isMatchReady || typeof matchId !== "number") return;
    if (!myParticipant) return;
    markAsSeenMutation.mutate();
  }, [isMatchReady, matchId, myParticipant?.id]);

  const confirmedCount = participants.length;
  const confirmedLabel = `${confirmedCount} / 10`;

  const participantsWithAdminFlag = useMemo(() => {
    return participants.map((p: any) => {
      const userId = (p.user?.id ?? p.userId) as string | undefined;
      const isAdminParticipant =
        (!!adminUserId && !!userId && userId === adminUserId) ||
        String((p as any).role ?? "")
          .trim()
          .toUpperCase() === "ADMIN";
      return { ...p, __isAdminParticipant: isAdminParticipant };
    });
  }, [participants, adminUserId]);

  const PurpleTeamWithFlags = useMemo(
    () => participantsWithAdminFlag.filter((p: any) => p.team === "PURPLE"),
    [participantsWithAdminFlag]
  );
  const YellowTeamWithFlags = useMemo(
    () => participantsWithAdminFlag.filter((p: any) => p.team === "YELLOW"),
    [participantsWithAdminFlag]
  );

  return {
    matchId,
    isMatchReady,
    isScheduleIdValid,
    ensureMatchQuery,
    participants: participantsWithAdminFlag,
    PurpleTeam: PurpleTeamWithFlags,
    YellowTeam: YellowTeamWithFlags,
    myParticipantAny,
    isInvitedPending,
    adminUserId,
    isAdmin,
    myParticipant,
    canStartMatch,
    messages,
    isLoading: ensureMatchQuery.isLoading,

    joinMutation,
    leaveMutation,
    confirmMutation,
    joinTeam,
    leaveTeam,
    confirmMatch,
    newMessage,
    setNewMessage,
    sendMessage,
    sendMessageMutation,
    deleteMessageMutation,
    updateMessageMutation,
    editingMessageId,
    setEditingMessageId,
    openMessageMenuId,
    openMessageMenu,
    editMessageFromMenu,
    deleteMessageFromMenu,
    canSendMessage,
    selectedUserId,
    setSelectedUserId,
    userProfileQuery,
    confirmedLabel,
    participantsQuery,
  };
}