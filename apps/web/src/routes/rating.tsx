import { createFileRoute } from "@tanstack/react-router";

import { useRating } from "@my-app/hooks";

import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/rating")({
  validateSearch: (search: Record<string, unknown>) => {
    const rawMatchId = (search as any).matchId;
    const rawResetAfter = (search as any).resetAfter;

    const matchId =
      typeof rawMatchId === "string"
        ? rawMatchId
        : typeof rawMatchId === "number"
          ? String(rawMatchId)
          : "";

    const resetAfter =
      typeof rawResetAfter === "string"
        ? rawResetAfter
        : typeof rawResetAfter === "number"
          ? String(rawResetAfter)
          : undefined;

    return resetAfter != null && resetAfter !== ""
      ? { matchId, resetAfter }
      : { matchId };
  },
  component: Page,
});

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-row gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            className="px-1 text-2xl text-black"
            aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
          >
            {filled ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}

function Page() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const { matchId, resetAfter } = Route.useSearch() as any;

  const {
    matchIdForQueries,
    participants,
    matchQuery,
    participantsQuery,
    ratings,
    setRating,
    didSubmit,
    submitRatingsMutation,
    resetMatchMutation,
    validateAndSubmit,
  } = useRating(orpc, client, matchId, resetAfter, currentUserId);

  const handleValidate = async () => {
    try {
      await validateAndSubmit();
      globalThis.alert?.("Succès: notes enregistrées");
      window.location.assign("/my_matches");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message === "Not signed in") {
        globalThis.alert?.("Not signed in: Please sign in to rate players.");
        return;
      }
      if (message === "Incomplete ratings") {
        globalThis.alert?.(
          "Incomplete: Merci de noter tous les joueurs avant de valider."
        );
        return;
      }
      globalThis.alert?.("Erreur: Impossible d'enregistrer les notes.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2 text-white">Rating</h1>
      <div className="text-base mb-4 text-white">Note chaque joueur sur 5 étoiles.</div>

      {matchIdForQueries <= 0 ? (
        <div className="text-lg text-black">Loading match…</div>
      ) : matchQuery.isLoading ? (
        <div className="text-lg text-black">Loading match details…</div>
      ) : matchQuery.isError ? (
        <div className="text-lg text-black">Unable to load match.</div>
      ) : null}

      <div className="flex flex-col gap-2 mb-6">
        {participants.map((p: any) => {
          const userId = p.userId;
          const name = p.user?.name ?? p.user?.email ?? String(userId);
          const current = ratings[String(userId)] ?? 0;

          return (
            <div
              key={p.id}
              className="flex flex-row items-center justify-between py-3 px-4 bg-gray-100 rounded-lg"
            >
              <div className="font-semibold text-black">{name}</div>
              <StarRow value={current} onChange={(v) => setRating(userId, v)} />
            </div>
          );
        })}

        {matchIdForQueries > 0 && participantsQuery.isLoading ? (
          <div className="text-lg text-black">Loading players…</div>
        ) : null}

        {matchIdForQueries > 0 && participantsQuery.isError ? (
          <div className="text-lg text-black">Unable to load players.</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void handleValidate()}
        disabled={
          submitRatingsMutation.isPending ||
          resetMatchMutation.isPending ||
          didSubmit
        }
        className={`px-6 py-3 rounded-full mb-3 text-white font-bold ${
          submitRatingsMutation.isPending ||
          resetMatchMutation.isPending ||
          didSubmit
            ? "bg-gray-500"
            : "bg-green-700"
        }`}
      >
        {didSubmit
          ? "Validé"
          : submitRatingsMutation.isPending || resetMatchMutation.isPending
            ? "Validation…"
            : "Valider"}
      </button>

      <button
        type="button"
        onClick={() => window.location.assign("/my_matches")}
        className="bg-blue-900 px-6 py-3 rounded-full text-white font-bold"
      >
        Back Home
      </button>
    </div>
  );
}
