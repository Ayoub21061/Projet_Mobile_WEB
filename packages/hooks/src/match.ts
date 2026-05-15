import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";

type ORPCUtils = typeof orpcType;

type InviteInput = {
    matchId: number;
    userId: string;
};

export function useMyMatches(orpc: ORPCUtils, currentUserId?: string) {
    const queryClient = useQueryClient();

    const participantsQuery = useQuery(orpc.match_participant.list.queryOptions());
    const allParticipants = participantsQuery.data ?? [];

    const myParticipations = useMemo(() => {
        if (!currentUserId) return [];
        return allParticipants.filter(
            (p) => p.userId === currentUserId && p.status === "ACCEPTED"
        );
    }, [allParticipants, currentUserId]);

    const inviteMutation = useMutation(
        orpc.match_participant.invite.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries();
            },
        })
    );

    const inviteUserToMatch = async (input: InviteInput) => {
        return await inviteMutation.mutateAsync(input);
    };

    return {
        participantsQuery,
        allParticipants,
        myParticipations,
        inviteMutation,
        inviteUserToMatch,
    };
}