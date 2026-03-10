import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

export default {

  // récupérer les paiements d'un match
  listByMatch: publicProcedure
    .input(z.object({ matchId: z.number() }))
    .handler(async ({ input }) => {
      return prisma.payment.findMany({
        where: {
          matchId: input.matchId,
        },
        include: {
          user: true,
        },
      });
    }),

  // créer les paiements pour tous les joueurs
  createForMatch: publicProcedure
    .input(z.object({ matchId: z.number() }))
    .handler(async ({ input }) => {

      const match = await prisma.match.findUnique({
        where: { id: input.matchId },
        include: {
          schedule: {
            include: {
              field: true,
            },
          },
        },
      });

      if (!match) throw new Error("Match not found");

      const players = await prisma.matchParticipant.findMany({
        where: {
          matchId: input.matchId,
          status: "ACCEPTED",
        },
      });

      if (players.length === 0) return [];

      const fieldPrice = match.schedule?.field?.price ?? match.price;
      const pricePerPlayer = fieldPrice / players.length;

      return prisma.payment.createMany({
        data: players.map((p) => ({
          matchId: input.matchId,
          userId: p.userId,
          amount: pricePerPlayer,
        })),
        skipDuplicates: true,
      });
    }),

  // marquer comme payé
  markAsPaid: publicProcedure
    .input(z.object({ paymentId: z.number() }))
    .handler(async ({ input }) => {
      return prisma.payment.update({
        where: { id: input.paymentId },
        data: {
          status: "PAID",
        },
      });
    }),
};