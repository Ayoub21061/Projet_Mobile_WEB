import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";
import type { RouterClient } from "@orpc/server";
import type { appRouter } from "@my-app/api/routers/index";

type ORPCUtils = typeof orpcType;
type ORPCClient = RouterClient<typeof appRouter>;

export function useMatch(
  orpc: ORPCUtils,
  client: ORPCClient,
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

  const ensuredMatch = ensureMatchQuery.data;
  const matchId = ensuredMatch?.id;
  const isMatchReady = Number.isFinite(matchId);

  // 🔹 Participants
  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: isMatchReady,
  });

  const participantsRaw = participantsQuery.data ?? [];
  type Participant = (typeof participantsRaw)[number];

  const participants = participantsRaw.filter(
    (p) => p.matchId === matchId && p.status === "ACCEPTED"
  );

  const myParticipantAny = participantsRaw.find(
    (p) => isMatchReady && !!currentUserId && p.matchId === matchId && p.userId === currentUserId
  );
  const isInvitedPending = myParticipantAny?.status === "PENDING";

  const adminParticipantAny = participantsRaw.find(
    (p) =>
      isMatchReady &&
      p.matchId === matchId &&
      String((p as Participant & { role?: string }).role ?? "")
        .trim()
        .toUpperCase() === "ADMIN"
  );
  const adminUserId = adminParticipantAny?.userId as string | undefined;
  const isAdmin = !!currentUserId && !!adminUserId && currentUserId === adminUserId;

  const myParticipant = participants.find(
    (p) => currentUserId && p.userId === currentUserId
  );

  const canStartMatch =
    isMatchReady &&
    participants.length === 10 &&
    participants.every((p) => p.confirmed);

  // 🔹 Mutations
  const joinMutation = useMutation(
    orpc.match_participant.join.mutationOptions({
      onMutate: async (variables: { matchId: number; team: "PURPLE" | "YELLOW" }) => {
        await queryClient.cancelQueries({ queryKey: orpc.match_participant.list.queryKey() });
        const previous = queryClient.getQueryData(orpc.match_participant.list.queryKey());
        queryClient.setQueryData(
          orpc.match_participant.list.queryKey(),
          (old: any) => [
            ...(Array.isArray(old) ? old : []),
            {
              id: Math.random(),
              matchId,
              userId: currentUserId,
              team: variables.team,
              status: "ACCEPTED",
              confirmed: false,
              user: { id: currentUserId, name: "..." },
            },
          ]
        );
        return { previous };
      },
      onError: (_err: unknown, _vars: unknown, ctx: { previous: unknown } | undefined) => {
        if (ctx?.previous !== undefined) {
          queryClient.setQueryData(orpc.match_participant.list.queryKey(), ctx.previous);
        }
      },
      onSettled: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const leaveMutation = useMutation(
    orpc.match_participant.leave.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const confirmMutation = useMutation(
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

  const sendMessageMutation = useMutation(
    orpc.message.create.mutationOptions({
      onMutate: async (variables: { matchId: number; content: string }) => {
        const key = orpc.message.listByMatch.queryKey({ input: { matchId: matchId! } });
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        queryClient.setQueryData(key, (old: any) => [
          ...(Array.isArray(old) ? old : []),
          {
            id: Math.random(),
            matchId,
            senderId: currentUserId,
            content: variables.content,
            createdAt: new Date().toISOString(),
            sender: { id: currentUserId, name: "..." },
          },
        ]);
        return { previous };
      },
      onError: (_err: unknown, _vars: unknown, ctx: { previous: unknown } | undefined) => {
        if (ctx?.previous !== undefined) {
          queryClient.setQueryData(
            orpc.message.listByMatch.queryKey({ input: { matchId: matchId! } }),
            ctx.previous
          );
        }
      },
      onSuccess: async () => {
        setNewMessage("");
        await queryClient.invalidateQueries();
      },
    })
  );

  const deleteMessageMutation = useMutation(
    orpc.message.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const updateMessageMutation = useMutation(
    orpc.message.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    })
  );

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<number | null>(null);

  type Message = (typeof messages)[number];

  const openMessageMenu = (msg: Message) => {
    if (!currentUserId) return;
    if (!isAdmin && msg.senderId !== currentUserId) return;
    const messageId = Number(msg.id);
    if (!Number.isFinite(messageId)) return;
    setOpenMessageMenuId((prev) => (prev === messageId ? null : messageId));
  };

  const editMessageFromMenu = (msg: Message) => {
    if (!currentUserId) return;
    if (msg.senderId !== currentUserId) return;
    setNewMessage(String(msg.content ?? ""));
    setEditingMessageId(Number(msg.id));
    setOpenMessageMenuId(null);
  };

  const deleteMessageFromMenu = async (msg: Message) => {
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

  const messages = messagesQuery.data ?? [];

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const userProfileQuery = useQuery({
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

  type ParticipantWithAdminFlag = Participant & { __isAdminParticipant: boolean };

  const participantsWithAdminFlag = useMemo((): ParticipantWithAdminFlag[] => {
    return participants.map((p) => {
      const userId = (p.user?.id ?? p.userId) as string | undefined;
      const isAdminParticipant =
        (!!adminUserId && !!userId && userId === adminUserId) ||
        String((p as Participant & { role?: string }).role ?? "")
          .trim()
          .toUpperCase() === "ADMIN";
      return { ...p, __isAdminParticipant: isAdminParticipant };
    });
  }, [participants, adminUserId]);

  const PurpleTeamWithFlags = useMemo(
    () => participantsWithAdminFlag.filter((p) => p.team === "PURPLE"),
    [participantsWithAdminFlag]
  );

  const YellowTeamWithFlags = useMemo(
    () => participantsWithAdminFlag.filter((p) => p.team === "YELLOW"),
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