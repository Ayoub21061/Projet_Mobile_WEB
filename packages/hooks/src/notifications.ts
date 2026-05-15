import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";
import type { RouterClient } from "@orpc/server";
import type { appRouter } from "@my-app/api/routers/index";

type ORPCUtils = typeof orpcType;
type ORPCClient = RouterClient<typeof appRouter>;

type MatchSummary = {
    matchId: number;
    scheduleId: number | null;
};

type Message = {
    matchId: number;
    senderId?: string;
    sentAt?: string;
};

type MessagesByMatch = {
    matchId: number;
    messages: Message[];
};

export function useNotifications(orpc: ORPCUtils, client: ORPCClient, currentUserId?: string) {
    const queryClient = useQueryClient();

    const friendRequestsQuery = useQuery({
        ...orpc.friends.incomingRequests.queryOptions(),
        enabled: !!currentUserId,
        refetchInterval: 5000,
    });

    const acceptFriendRequestMutation = useMutation(
        orpc.friends.acceptFriendRequest.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries();
            },
        })
    );

    const matchInvitesQuery = useQuery({
        ...orpc.match_participant.incomingInvites.queryOptions(),
        enabled: !!currentUserId,
        refetchInterval: 5000,
    });

    const participantsQuery = useQuery(orpc.match_participant.list.queryOptions());
    const participants = participantsQuery.data ?? [];

    const matchesQuery = useQuery({
        queryKey: ["matches.list"],
        queryFn: async () => client.matches.list(),
        enabled: !!currentUserId,
    });
    const matches = matchesQuery.data ?? [];

    const scheduleIdByMatchId = useMemo(() => {
        const map = new Map<number, number | null>();
        for (const match of matches) {
            const matchId = Number(match?.id);
            if (!Number.isFinite(matchId) || matchId <= 0) continue;
            map.set(matchId, (match?.scheduleId as number | null | undefined) ?? null);
        }
        return map;
    }, [matches]);

    const myFullMatches: MatchSummary[] = useMemo(() => {
        if (!currentUserId) return [];

        const acceptedCountByMatchId = new Map<number, number>();
        const isUserInMatch = new Set<number>();

        for (const participant of participants) {
            if (participant?.status !== "ACCEPTED") continue;
            const matchId = Number(participant?.matchId);
            if (!Number.isFinite(matchId) || matchId <= 0) continue;

            acceptedCountByMatchId.set(
                matchId,
                (acceptedCountByMatchId.get(matchId) ?? 0) + 1
            );

            if (participant?.userId === currentUserId) {
                isUserInMatch.add(matchId);
            }
        }

        const fullMatchIds = Array.from(acceptedCountByMatchId.entries())
            .filter(([, count]) => count >= 10)
            .map(([matchId]) => matchId);

        return fullMatchIds
            .filter((matchId) => isUserInMatch.has(matchId))
            .map((matchId) => ({
                matchId,
                scheduleId: scheduleIdByMatchId.get(matchId) ?? null,
            }));
    }, [participants, currentUserId, scheduleIdByMatchId]);

    const messagesQuery = useQuery({
        queryKey: [
            "messages.byMatches",
            myFullMatches.map((m) => m.matchId),
        ],
        queryFn: async (): Promise<MessagesByMatch[]> => {
            const results = await Promise.all(
                myFullMatches.map(async (m) => {
                    const messages = await orpc.message.listByMatch.call({ matchId: m.matchId });
                    return { matchId: m.matchId, messages: (messages ?? []) as Message[] };
                })
            );
            return results;
        },
        enabled: myFullMatches.length > 0,
        refetchInterval: 5000,
    });

    const messagesByMatchId = useMemo(() => {
        const map = new Map<number, Message[]>();
        const rows: MessagesByMatch[] = messagesQuery.data ?? [];
        for (const row of rows) {
            const matchId = Number(row?.matchId);
            if (!Number.isFinite(matchId) || matchId <= 0) continue;
            map.set(matchId, row?.messages ?? []);
        }
        return map;
    }, [messagesQuery.data]);

    const matchesWithNewMessages = useMemo(() => {
        if (!currentUserId) return [];

        return myFullMatches
            .map((match) => {
                const matchId = match.matchId;
                const messages = messagesByMatchId.get(matchId) ?? [];
                if (messages.length === 0) return null;

                const lastMessage = messages[messages.length - 1];

                const participant = participants.find(
                    (p) => p?.matchId === matchId && p?.userId === currentUserId
                );
                if (!participant) return null;

                const lastSeenAt = participant?.lastSeenAt ? new Date(participant.lastSeenAt) : null;
                const lastSentAt = lastMessage?.sentAt ? new Date(lastMessage.sentAt) : null;
                if (!lastSentAt || Number.isNaN(lastSentAt.getTime())) return null;

                const isNew =
                    lastMessage?.senderId !== currentUserId &&
                    (!lastSeenAt || lastSentAt > lastSeenAt);

                if (!isNew) return null;

                return {
                    matchId,
                    lastMessage,
                    scheduleId: match.scheduleId,
                };
            })
            .filter((m): m is NonNullable<typeof m> => m !== null);
    }, [myFullMatches, messagesByMatchId, participants, currentUserId]);

    const hasNewMessages = matchesWithNewMessages.length > 0;

    const getScheduleIdForMatchId = (matchId: number): number | null => {
        return scheduleIdByMatchId.get(matchId) ?? null;
    };

    return {
        friendRequestsQuery,
        acceptFriendRequestMutation,
        matchInvitesQuery,
        participantsQuery,
        matchesQuery,
        messagesQuery,
        myFullMatches,
        matchesWithNewMessages,
        hasNewMessages,
        scheduleIdByMatchId,
        getScheduleIdForMatchId,
    };
}