import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const matchParticipantSchema = z.object({
    matchId : z.number(),
    userId : z.string(),
    status : z.enum(["PENDING", "ACCEPTED", "REJECTED"]),
});

export default {
    list:publicProcedure.handler(async () => {
        return await prisma.matchParticipant.findMany();
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
            return await prisma.matchParticipant.update({
                where: { id: input.id },
                data: { status: input.status },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.matchParticipant.delete({
                where: input,
            });
        }),
}