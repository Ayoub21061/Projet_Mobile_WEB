import prisma from "@my-app/db";
import { protectedProcedure } from "..";
import z from "zod";

const createMessageSchema = z.object({
  matchId: z.number(),
  content: z.string().min(1),
});

export default {
  // Lister les messages d’un match seulement
  listByMatch: protectedProcedure
    .input(
      z.object({
        matchId: z.number(),
      })
    )
    .handler(async ({ input, context }) => {
      // Vérifier que l'utilisateur participe au match
      const participant = await prisma.matchParticipant.findUnique({
        where: {
          matchId_userId: {
            matchId: input.matchId,
            userId: context.session!.user.id,
          },
        },
      });

      if (!participant || participant.status !== "ACCEPTED") {
        throw new Error("Not allowed");
      }

      return prisma.message.findMany({
        where: { matchId: input.matchId },
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  // Envoyer message
  create: protectedProcedure
    .input(createMessageSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session!.user.id;

      // Vérifier que l'utilisateur est participant
      const participant = await prisma.matchParticipant.findUnique({
        where: {
          matchId_userId: {
            matchId: input.matchId,
            userId,
          },
        },
      });

      if (!participant || participant.status !== "ACCEPTED") {
        throw new Error("Not allowed");
      }

      return prisma.message.create({
        data: {
          matchId: input.matchId,
          content: input.content,
          senderId: userId,
        },
      });
    }),

  // Supprimer (optionnel : seulement le sender peut delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const message = await prisma.message.findUnique({
        where: { id: input.id },
      });

      if (!message || message.senderId !== context.session!.user.id) {
        throw new Error("Not allowed");
      }

      return prisma.message.delete({
        where: { id: input.id },
      });
    }),
};