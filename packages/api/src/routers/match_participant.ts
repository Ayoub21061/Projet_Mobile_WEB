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

    incomingInvites: protectedProcedure
        .handler(async ({ context }) => {
            const userId = context.session!.user.id;

            // 1) Récupérer les invitations (MatchParticipant en PENDING pour l'utilisateur courant)
            const invites = await prisma.matchParticipant.findMany({
                where: {
                    userId,
                    status: "PENDING",
                },
                orderBy: {
                    joinedAt: "desc",
                },
                select: {
                    id: true,
                    matchId: true,
                    joinedAt: true,
                    invitedById: true,
                    match: {
                        select: {
                            id: true,
                            matchDate: true,
                            startTime: true,
                            endTime: true,
                        },
                    },
                },
            });

            // 2) Extraire les IDs uniques des invitants
            const inviterIds = Array.from(
                new Set(
                    invites
                        .map((invite) => invite.invitedById)
                        .filter((id): id is string => Boolean(id))
                )
            );

            // 3) Charger les profils des invitants (name/pseudo)
            const inviterById = new Map<string, { id: string; name: string; pseudo: string | null }>();

            if (inviterIds.length > 0) {
                const inviters = await prisma.user.findMany({
                    where: {
                        id: {
                            in: inviterIds,
                        },
                    },
                    select: {
                        id: true,
                        name: true,
                        pseudo: true,
                    },
                });

                for (const inviter of inviters) {
                    inviterById.set(inviter.id, inviter);
                }
            }

            // 4) Retourner les invites enrichies avec l'objet inviter
            return invites.map((invite) => {
                const inviter = invite.invitedById
                    ? (inviterById.get(invite.invitedById) ?? null)
                    : null;

                return {
                    ...invite,
                    inviter,
                };
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

            const result = await prisma.$transaction(async (tx) => {
                const acceptedCountBefore = await tx.matchParticipant.count({
                    where: {
                        matchId: input.matchId,
                        status: "ACCEPTED",
                    },
                });

                if (acceptedCountBefore >= 10) {
                    throw new ORPCError("CONFLICT");
                }

                const teamAcceptedCountBefore = await tx.matchParticipant.count({
                    where: {
                        matchId: input.matchId,
                        status: "ACCEPTED",
                        team: input.team,
                    },
                });

                if (teamAcceptedCountBefore >= 5) {
                    throw new ORPCError("CONFLICT");
                }

                const existingParticipant = await tx.matchParticipant.findUnique({
                    where: {
                        matchId_userId: {
                            matchId: input.matchId,
                            userId,
                        },
                    },
                    select: {
                        id: true,
                        status: true,
                        role: true,
                    },
                });

                const role =
                    acceptedCountBefore === 0
                        ? "ADMIN"
                        : existingParticipant?.role === "ADMIN"
                            ? "ADMIN"
                            : (existingParticipant?.role ?? "PLAYER");

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
                        role,
                    },
                    create: {
                        matchId: input.matchId,
                        userId,
                        team: input.team,
                        status: "ACCEPTED",
                        role,
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

    invite: protectedProcedure
        .input(
            z.object({
                matchId: z.number(),
                userId: z.string(),
            }),
        )
        .handler(async ({ input, context }) => {
            const inviterId = context.session!.user.id;

            if (input.userId === inviterId) {
                throw new ORPCError("CONFLICT");
            }

            // Inviter must be an accepted participant (or creator) of the match
            const isInviterParticipant = await prisma.matchParticipant.findUnique({
                where: {
                    matchId_userId: {
                        matchId: input.matchId,
                        userId: inviterId,
                    },
                },
                select: { status: true },
            });

            if (!isInviterParticipant || isInviterParticipant.status !== "ACCEPTED") {
                throw new ORPCError("UNAUTHORIZED");
            }

            const acceptedCount = await prisma.matchParticipant.count({
                where: {
                    matchId: input.matchId,
                    status: "ACCEPTED",
                },
            });

            if (acceptedCount >= 10) {
                throw new ORPCError("CONFLICT");
            }

            const existingInvitee = await prisma.matchParticipant.findUnique({
                where: {
                    matchId_userId: {
                        matchId: input.matchId,
                        userId: input.userId,
                    },
                },
                select: { status: true },
            });

            if (existingInvitee?.status === "ACCEPTED") {
                throw new ORPCError("CONFLICT");
            }

            // Create or update invitee as PENDING. Default team is PURPLE; invitee can change on join.
            const participant = await prisma.matchParticipant.upsert({
                where: {
                    matchId_userId: {
                        matchId: input.matchId,
                        userId: input.userId,
                    },
                },
                update: {
                    status: "PENDING",
                    invitedById: inviterId,
                },
                create: {
                    matchId: input.matchId,
                    userId: input.userId,
                    invitedById: inviterId,
                    status: "PENDING",
                    team: "PURPLE",
                },
                select: { id: true },
            });

            return participant;
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
                const participant = await tx.matchParticipant.findUnique({
                    where: {
                        matchId_userId: {
                            matchId: input.matchId,
                            userId,
                        },
                    },
                    select: {
                        id: true,
                        role: true,
                    },
                });

                if (!participant) {
                    throw new ORPCError("NOT_FOUND");
                }

                const deleted = await tx.matchParticipant.delete({
                    where: {
                        matchId_userId: {
                            matchId: input.matchId,
                            userId,
                        },
                    },
                });

                if (participant.role === "ADMIN") {
                    const nextParticipant = await tx.matchParticipant.findFirst({
                        where: {
                            matchId: input.matchId,
                            status: "ACCEPTED",
                        },
                        orderBy: {
                            joinedAt: "asc",
                        },
                        select: {
                            id: true,
                        },
                    });

                    if (nextParticipant) {
                        await tx.matchParticipant.updateMany({
                            where: {
                                matchId: input.matchId,
                                role: "ADMIN",
                            },
                            data: {
                                role: "PLAYER",
                            },
                        });

                        await tx.matchParticipant.update({
                            where: { id: nextParticipant.id },
                            data: { role: "ADMIN" },
                        });
                    }
                }

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