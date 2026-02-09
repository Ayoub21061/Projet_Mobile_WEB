import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const messageSchema = z.object({
    matchId: z.number(),
    senderId: z.string(),
    content: z.string(),
})

const updateMessageSchema = z.object({
    id: z.number(),
    content: z.string(),
})

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.message.findMany();
    }),
    create: publicProcedure
        .input(messageSchema)
        .handler(async ({ input }) => {
            return await prisma.message.create({
                data: {
                    matchId: input.matchId,
                    senderId: input.senderId,
                    content: input.content,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.message.delete({
                where: {
                    id: input.id,
                },
            });
        }),
    update: publicProcedure
        .input(updateMessageSchema)
        .handler(async ({ input }) => {
            return await prisma.message.update({
                where: {
                    id: input.id,
                },
                data: {
                    content: input.content,
                },
            });
        }),
};