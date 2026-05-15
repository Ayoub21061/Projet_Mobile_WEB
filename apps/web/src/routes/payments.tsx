import { Link, createFileRoute } from "@tanstack/react-router";
import { usePayment } from "@my-app/hooks";
import { client, orpc, queryClient } from "@/utils/orpc";
import { useState } from "react";

export const Route = createFileRoute("/payments")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = (search as any).matchId;
    return {
      matchId:
        typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "",
    };
  },
  component: Page,
});

function Page() {
  const { matchId } = Route.useSearch();

  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const {
    effectiveMatchId,
    participants,
    payments,
    pricePerPlayer,
    iban,
    allPaid,
    isAdmin,
    handlePay,
  } = usePayment(orpc, client, queryClient, matchId);

  const goToRating = () => {
    if (effectiveMatchId == null || !Number.isFinite(effectiveMatchId)) return;
    window.location.assign(`/rating?matchId=${encodeURIComponent(String(effectiveMatchId))}&resetAfter=1`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">
        Payment Match {effectiveMatchId}
      </h1>

      {participants.map((p: any) => {
        const payment = payments.find(
          (pay: any) => pay.userId === p.userId
        );

        return (
          <div
            key={p.id}
            className="flex justify-between bg-gray-100 p-3 rounded mb-2"
          >
            <div className="text-black">{p.user?.name}</div>

            {payment?.status === "PAID" ? (
              <div className="text-green-600">PAID ✅</div>
            ) : isAdmin ? (
              <button
                onClick={() => {
                  if (!payment) return;
                  setSelectedPayment(payment);
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Valider
              </button>
            ) : (
              <div>
                {pricePerPlayer?.toFixed(2)}€
              </div>
            )}
          </div>
        );
      })}

      {selectedPayment ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-80">
            <div className="text-center text-lg font-bold text-black">
              Confirmer le paiement de{" "}
              {participants.find((p: any) => p.userId === selectedPayment.userId)?.user?.name ??
                selectedPayment.userId}
              ?
            </div>

            <div className="flex flex-row justify-between mt-4">
              <button
                type="button"
                onClick={() => {
                  handlePay(selectedPayment.id, () => setSelectedPayment(null));
                }}
                className="bg-green-600 px-4 py-2 rounded text-white"
              >
                Oui
              </button>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="bg-red-600 px-4 py-2 rounded text-white"
              >
                Non
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {allPaid && (
        <button
          onClick={goToRating}
          className="bg-purple-700 text-white px-4 py-2 rounded mt-4"
        >
          Fin de session
        </button>
      )}

      <div className="mt-4">
        A payer sur : {iban}
      </div>

      <div className="mt-4">
        <Link
          to="/my_matches"
          className="inline-flex bg-blue-900 text-white px-6 py-3 rounded-full font-bold"
        >
          Go Back to My Matches
        </Link>
      </div>
    </div>
  );
}