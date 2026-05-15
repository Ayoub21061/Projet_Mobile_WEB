import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";
import type { RouterClient } from "@orpc/server";
import type { appRouter } from "@my-app/api/routers/index";

type ORPCUtils = typeof orpcType;
type ORPCClient = RouterClient<typeof appRouter>;

export function usePayment(
  orpc: ORPCUtils,
  client: ORPCClient,
  queryClient: ReturnType<typeof useQueryClient>,
  matchIdInput: string | number | string[] | undefined,
  router?: { push: (href: string) => void }
) {
  const matchIdParam = useMemo(() => {
    if (Array.isArray(matchIdInput)) return matchIdInput[0];
    if (typeof matchIdInput === "string") return matchIdInput;
    if (typeof matchIdInput === "number") return String(matchIdInput);
    return undefined;
  }, [matchIdInput]);

  const parsedMatchId = useMemo(() => {
    const parsed = Number(matchIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [matchIdParam]);

  const [effectiveMatchId, setEffectiveMatchId] = useState<number | null>(
    parsedMatchId
  );

  useEffect(() => {
    if (parsedMatchId) setEffectiveMatchId(parsedMatchId);
  }, [parsedMatchId]);

  const matchIdForQueries = effectiveMatchId ?? 0;

  // current user
  const privateDataQuery = useQuery(orpc.privateData.queryOptions());
  const currentUserId = privateDataQuery.data?.user?.id as string | undefined;

  // participants
  const participantsQuery = useQuery({
    ...orpc.match_participant.list.queryOptions(),
    enabled: matchIdForQueries > 0,
  });

  const participantsRaw = participantsQuery.data ?? [];

  const participants = participantsRaw.filter(
    (p) => p.matchId === effectiveMatchId && p.status === "ACCEPTED"
  );

  const playerCount = participants.length;

  // match details
  const matchQuery = useQuery({
    queryKey: ["match.getById", matchIdForQueries],
    queryFn: async () =>
      client.match.getById({
        matchId: matchIdForQueries,
      }),
    enabled: matchIdForQueries > 0,
  });

  const fieldPrice = matchQuery.data?.schedule?.field?.price ?? null;

  const pricePerPlayer =
    typeof fieldPrice === "number" && playerCount > 0
      ? fieldPrice / playerCount
      : null;

  const iban =
    matchQuery.data?.location?.iban ??
    matchQuery.data?.schedule?.field?.location?.iban ??
    "Unknown IBAN";

  // payments
  const paymentsQuery = useQuery({
    ...orpc.payment.listByMatch.queryOptions({
      input: { matchId: matchIdForQueries },
    }),
    enabled: matchIdForQueries > 0,
  });

  const payments = paymentsQuery.data ?? [];

  const myPayment = payments.find((p) => p.userId === currentUserId);

  const payMutation = useMutation(
    orpc.payment.markAsPaid.mutationOptions() // ← plus de onSuccess ici
  );

  const handlePay = (paymentId: number, onSuccess?: () => void) => {
    payMutation.mutate({ paymentId }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        onSuccess?.();
      },
    });
  };

  const allPaid =
    payments.length > 0 &&
    participants.every((p) => {
      const payment = payments.find((pay) => pay.userId === p.userId);
      return payment?.status === "PAID";
    });

  const adminParticipant = participants.find((p) => p.role === "ADMIN");

  const isAdmin =
    !!currentUserId && adminParticipant?.userId === currentUserId;

  const handleEndSession = () => {
    if (!router) return;
    router.push(
      `/(drawer)/rating?matchId=${matchIdForQueries}&resetAfter=1`
    );
  };

  return {
    effectiveMatchId,
    matchIdForQueries,
    currentUserId,
    participants,
    payments,
    myPayment,
    fieldPrice,
    playerCount,
    pricePerPlayer,
    iban,
    matchQuery,
    allPaid,
    adminParticipant,
    isAdmin,
    handlePay,
    handleEndSession,
  };
}