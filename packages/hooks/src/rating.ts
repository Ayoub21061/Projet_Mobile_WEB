import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";
import type { RouterClient } from "@orpc/server";
import type { appRouter } from "@my-app/api/routers/index";

type ORPCUtils = typeof orpcType;
type ORPCClient = RouterClient<typeof appRouter>;

function coerceSingleParam(value: string | number | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : String(value[0]);
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

export function useRating(
  orpc: ORPCUtils,
  client: ORPCClient,
  matchIdInput: string | number | string[] | undefined,
  resetAfterInput: string | number | string[] | undefined,
  currentUserId?: string
) {
  const matchIdParam = useMemo(() => coerceSingleParam(matchIdInput), [matchIdInput]);

  const matchIdForQueries = useMemo(() => {
    if (!matchIdParam) return 0;
    const parsed = Number(matchIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [matchIdParam]);

  const shouldResetAfter = useMemo(() => {
    const value = coerceSingleParam(resetAfterInput);
    return value === "1" || value === "true";
  }, [resetAfterInput]);

  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: matchIdForQueries > 0,
  });

  const matchQuery = useQuery({
    queryKey: ["match.getById", matchIdForQueries],
    queryFn: async () => {
      if (matchIdForQueries <= 0) return null;
      return await client.match.getById({ matchId: matchIdForQueries });
    },
    enabled: matchIdForQueries > 0,
  });

  const participantsRaw = participantsQuery.data ?? [];

  type Participant = (typeof participantsRaw)[number];

  const participants = useMemo((): Participant[] => {
    if (matchIdForQueries <= 0) return [];
    return participantsRaw.filter(
      (p) => p.matchId === matchIdForQueries && p.status === "ACCEPTED"
    );
  }, [participantsRaw, matchIdForQueries]);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [didSubmit, setDidSubmit] = useState(false);

  const setRating = (userId: number | string, value: number) => {
    setRatings((prev) => ({ ...prev, [String(userId)]: value }));
  };

  const submitRatingsMutation = useMutation(
    orpc.rating.submitForMatch.mutationOptions()
  );

  const resetMatchMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (matchIdForQueries <= 0) throw new Error("matchId is missing");
      await client.match.resetMatch({ matchId: matchIdForQueries });
    },
  });

  const allRated =
    participants.length > 0 &&
    participants.every((p) => {
      const score = ratings[String(p.userId)] ?? 0;
      return score >= 1 && score <= 5;
    });

  const validateAndSubmit = async () => {
    if (!currentUserId) throw new Error("Not signed in");
    if (matchIdForQueries <= 0) throw new Error("matchId is missing");
    if (!allRated) throw new Error("Incomplete ratings");

    const payload = participants.map((p) => ({
      ratedUserId: String(p.userId),
      score: ratings[String(p.userId)] ?? 0,
    }));

    await submitRatingsMutation.mutateAsync({
      matchId: matchIdForQueries,
      ratings: payload,
    });

    if (shouldResetAfter) {
      await resetMatchMutation.mutateAsync();
    }

    setDidSubmit(true);
  };

  return {
    matchIdParam,
    matchIdForQueries,
    shouldResetAfter,
    participantsQuery,
    matchQuery,
    participants,
    ratings,
    setRating,
    didSubmit,
    allRated,
    submitRatingsMutation,
    resetMatchMutation,
    validateAndSubmit,
  };
}