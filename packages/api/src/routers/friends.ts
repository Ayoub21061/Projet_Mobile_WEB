import prisma from "@my-app/db";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "..";
import z from "zod";

export default {
    incomingRequests: protectedProcedure
        .handler(async ({ context }) => {
            const receiverId = context.session!.user.id;

            return await prisma.friendRequest.findMany({
                where: {
                    receiverId,
                    status: "PENDING",
                },
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    createdAt: true,
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            pseudo: true,
                            email: true,
                            image: true,
                            photoUrl: true,
                        },
                    },
                },
            });
        }),

    sendFriendRequest: protectedProcedure
        .input(
            z.object({
                receiverId: z.string(),
            })
        )
        .handler(async ({ input, context }) => {
            const senderId = context.session!.user.id;

            if (senderId === input.receiverId) {
                throw new ORPCError("CONFLICT");
            }

            const existing = await prisma.friendRequest.findUnique({
                where: {
                    senderId_receiverId: {
                        senderId,
                        receiverId: input.receiverId,
                    },
                },
            });

            if (existing) {
                throw new ORPCError("CONFLICT");
            }

            try {
                return await prisma.friendRequest.create({
                    data: {
                        senderId,
                        receiverId: input.receiverId,
                    },
                    select: {
                        id: true,
                    },
                });
            } catch (error) {
                const code = (error as { code?: string } | null)?.code;
                if (code === "P2002") {
                    throw new ORPCError("CONFLICT");
                }
                throw error;
            }
        }),

    acceptFriendRequest: protectedProcedure
        .input(
            z.object({
                requestId: z.string(),
            }),
        )
        .handler(async ({ input, context }) => {
            const receiverId = context.session!.user.id;

            const request = await prisma.friendRequest.findUnique({
                where: { id: input.requestId },
                select: {
                    id: true,
                    receiverId: true,
                    status: true,
                },
            });

            if (!request) {
                throw new ORPCError("NOT_FOUND");
            }

            if (request.receiverId !== receiverId) {
                throw new ORPCError("UNAUTHORIZED");
            }

            if (request.status !== "PENDING") {
                throw new ORPCError("CONFLICT");
            }

            await prisma.friendRequest.update({
                where: { id: input.requestId },
                data: { status: "ACCEPTED" },
                select: { id: true },
            });

            return { id: input.requestId };
        }),
};