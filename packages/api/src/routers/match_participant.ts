import prisma from "@my-app/db";
import { ORPCError } from "@orpc/server";
import { publicProcedure, protectedProcedure } from "..";
import z from "zod";

const matchParticipantSchema = z.object({
    matchId: z.number(),
    userId: z.string(),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
    team: z.enum(["PURPLE", "YELLOW"]),
    confirmed: z.boolean().default(false),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.matchParticipant.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }),
    join: protectedProcedure
        .input(
            z.object({
                matchId: z.number(),
                team: z.enum(["PURPLE", "YELLOW"]),
            })
        )
        .handler(async ({ input, context }) => {
            const userId = context.session!.user.id;

            const acceptedCount = await prisma.matchParticipant.count({
                where: {
                    matchId: input.matchId,
                    status: "ACCEPTED",
                },
            });

            if (acceptedCount >= 10) {
                throw new ORPCError("CONFLICT");
            }

            const teamAcceptedCount = await prisma.matchParticipant.count({
                where: {
                    matchId: input.matchId,
                    status: "ACCEPTED",
                    team: input.team,
                },
            });

            if (teamAcceptedCount >= 5) {
                throw new ORPCError("CONFLICT");
            }

            const result = await prisma.$transaction(async (tx) => {
                const participant = await tx.matchParticipant.upsert({
                    where: {
                        matchId_userId: {
                            matchId: input.matchId,
                            userId,
                        },
                    },
                    update: {
                        team: input.team,
                        status: "ACCEPTED",
                    },
                    create: {
                        matchId: input.matchId,
                        userId,
                        team: input.team,
                        status: "ACCEPTED",
                    },
                });

                const acceptedCountAfter = await tx.matchParticipant.count({
                    where: {
                        matchId: input.matchId,
                        status: "ACCEPTED",
                    },
                });

                if (acceptedCountAfter >= 10) {
                    const match = await tx.match.findUnique({
                        where: { id: input.matchId },
                        select: { scheduleId: true },
                    });

                    if (match?.scheduleId) {
                        await tx.schedule.update({
                            where: { id: match.scheduleId },
                            data: { isAvailable: false },
                        });
                    }
                }

                return participant;
            });

            return result;
        }),
    leave: protectedProcedure
        .input(
            z.object({
                matchId: z.number(),
            })
        )
        .handler(async ({ input, context }) => {
            const userId = context.session!.user.id;

            return await prisma.$transaction(async (tx) => {
                const deleted = await tx.matchParticipant.delete({
                    where: {
                        matchId_userId: {
                            matchId: input.matchId,
                            userId,
                        },
                    },
                });

                const acceptedCount = await tx.matchParticipant.count({
                    where: {
                        matchId: input.matchId,
                        status: "ACCEPTED",
                    },
                });

                const match = await tx.match.findUnique({
                    where: { id: input.matchId },
                    select: { scheduleId: true },
                });

                if (match?.scheduleId) {
                    await tx.schedule.update({
                        where: { id: match.scheduleId },
                        data: { isAvailable: acceptedCount < 10 },
                    });
                }

                return deleted;
            });
        }),
    create: publicProcedure
        .input(matchParticipantSchema)
        .handler(async ({ input }) => {
            return await prisma.matchParticipant.create({
                data: input,
            });
        }),
    updateStatus: publicProcedure
        .input(z.object({ id: z.number(), status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]) }))
        .handler(async ({ input }) => {
            return await prisma.$transaction(async (tx) => {
                const participant = await tx.matchParticipant.update({
                    where: { id: input.id },
                    data: { status: input.status },
                });

                const acceptedCount = await tx.matchParticipant.count({
                    where: {
                        matchId: participant.matchId,
                        status: "ACCEPTED",
                    },
                });

                const match = await tx.match.findUnique({
                    where: { id: participant.matchId },
                    select: { scheduleId: true },
                });

                if (match?.scheduleId) {
                    await tx.schedule.update({
                        where: { id: match.scheduleId },
                        data: { isAvailable: acceptedCount < 10 },
                    });
                }

                return participant;
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.$transaction(async (tx) => {
                const deleted = await tx.matchParticipant.delete({
                    where: input,
                });

                const acceptedCount = await tx.matchParticipant.count({
                    where: {
                        matchId: deleted.matchId,
                        status: "ACCEPTED",
                    },
                });

                const match = await tx.match.findUnique({
                    where: { id: deleted.matchId },
                    select: { scheduleId: true },
                });

                if (match?.scheduleId) {
                    await tx.schedule.update({
                        where: { id: match.scheduleId },
                        data: { isAvailable: acceptedCount < 10 },
                    });
                }

                return deleted;
            });
        }),
    confirm: protectedProcedure
        .input(
            z.object({
                matchId: z.number(),
            })
        )
        .handler(async ({ input, context }) => {
            const userId = context.session!.user.id;

            return await prisma.matchParticipant.update({
                where: {
                    matchId_userId: {
                        matchId: input.matchId,
                        userId,
                    },
                },
                data: {
                    confirmed: true,
                },
            });
        }),
}