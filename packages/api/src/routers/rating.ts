import prisma from "@my-app/db";
import { protectedProcedure, publicProcedure } from "..";
import z from "zod";

const ratingSchema = z.object({
    matchId: z.number(),
    raterId: z.string(),
    ratedUserId: z.string(),
    score: z.number().int().min(1).max(5),
    comment: z.string().optional(),
});

const ratingSubmissionSchema = z.object({
    matchId: z.number(),
    ratings: z
        .array(
            z.object({
                ratedUserId: z.string(),
                score: z.number().int().min(1).max(5),
                comment: z.string().optional(),
            }),
        )
        .min(1),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.rating.findMany();
    }),
    submitForMatch: protectedProcedure
        .input(ratingSubmissionSchema)
        .handler(async ({ input, context }) => {
            const raterId = context.session!.user.id;

            const deduped = new Map<string, { ratedUserId: string; score: number; comment?: string }>();
            for (const rating of input.ratings) {
                deduped.set(rating.ratedUserId, rating);
            }

            const uniqueRatings = Array.from(deduped.values());

            const [, created] = await prisma.$transaction([
                prisma.rating.deleteMany({
                    where: {
                        matchId: input.matchId,
                        raterId,
                    },
                }),
                prisma.rating.createMany({
                    data: uniqueRatings.map((r) => ({
                        matchId: input.matchId,
                        raterId,
                        ratedUserId: r.ratedUserId,
                        score: r.score,
                        comment: r.comment,
                    })),
                }),
            ]);

            return {
                count: created.count,
            };
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