import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const ratingSchema = z.object({
    matchId: z.number(),
    raterId: z.string(),
    ratedUserId: z.string(),
    score: z.number(),
    comment: z.string().optional(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.rating.findMany();
    }),
    create: publicProcedure
        .input(ratingSchema)
        .handler(async ({ input }) => {
            return await prisma.rating.create({
                data: {
                    matchId: input.matchId,
                    raterId: input.raterId,
                    ratedUserId: input.ratedUserId,
                    score: input.score,
                    comment: input.comment,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.rating.delete({
                where: {
                    id: input.id,
                },
            });
        }),
}