import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const fieldSchema = z.object({
    fieldId: z.number(),
    day: z.string(),
    start: z.string(),
    end: z.string(),
    isAvailable: z.boolean().optional(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.schedule.findMany();
    }),
    listByField: publicProcedure
        .input(z.object({ fieldId: z.number() }))
        .handler(async ({ input }) => {
            const schedules = await prisma.schedule.findMany({
                where: {
                    fieldId: input.fieldId,
                },
                include: {
                    match: {
                        select: {
                            id: true,
                        },
                    },
                },
            });

            const matchIds = schedules
                .map((s) => s.match?.id)
                .filter((id): id is number => typeof id === "number");

            const counts = matchIds.length
                ? await prisma.matchParticipant.groupBy({
                      by: ["matchId"],
                      where: {
                          matchId: { in: matchIds },
                          status: "ACCEPTED",
                      },
                      _count: {
                          _all: true,
                      },
                  })
                : [];

            const acceptedCountByMatchId = new Map<number, number>();
            for (const row of counts) {
                acceptedCountByMatchId.set(row.matchId, row._count._all);
            }

            return schedules.map((s) => {
                const matchId = s.match?.id;
                const acceptedCount = matchId ? (acceptedCountByMatchId.get(matchId) ?? 0) : 0;

                // Keep API consistent with how the app interprets availability:
                // a slot is available when it has fewer than 10 accepted participants.
                const isAvailable = acceptedCount < 10;

                return {
                    ...s,
                    isAvailable,
                };
            });
        }),
    create: publicProcedure
        .input(fieldSchema)
        .handler(async ({ input }) => {
            return await prisma.schedule.create({
                data: input,
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.schedule.delete({
                where: input,
            });
        }),
    update: publicProcedure
        .input(
            z.object({ 
                id: z.number(),
                fieldId: z.number().optional(),
                day: z.string().optional(),
                start: z.string().optional(),
                end: z.string().optional(),
                isAvailable: z.boolean().optional(),
            }),
        )
        .handler(async ({ input }) => {
            return await prisma.schedule.update({
                where: {
                    id: input.id,
                },
                data: {
                    fieldId: input.fieldId,
                    day: input.day,
                    start: input.start,
                    end: input.end,
                    isAvailable: input.isAvailable,
                },
            })
        })
}