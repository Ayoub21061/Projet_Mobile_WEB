import prisma from "@my-app/db";
import { ORPCError } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "..";
import z from "zod";

const matchSchema = z.object({
    creatorId: z.string(),
    sportId: z.number(),
    locationId: z.number(),
    matchDate: z.coerce.date(),
    startTime: z.string(),
    endTime: z.string(),
    maxPlayers: z.number(),
    levelRequired: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]),
    gender: z.enum(["MIXED", "MEN", "WOMEN"]),
    price: z.number(),
    isPublic: z.boolean().optional(),
    privateCode: z.string().optional().nullable(),
    autoValidate: z.boolean().optional(),
    deadline: z.coerce.date().optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.enum(["OPEN", "ALMOST_FULL", "FULL", "CANCELLED"]).optional(),
});

const matchUpdateSchema = matchSchema.partial().extend({
    id: z.number(),
});

const matchRouter: Record<string, any> = {
    list: publicProcedure.handler(async () => {
        return await prisma.match.findMany();
    }),
    ensureForSchedule: protectedProcedure
        .input(z.object({ scheduleId: z.number() }))
        .handler(async ({ input, context }) => {
            const schedule = await prisma.schedule.findUnique({
                where: { id: input.scheduleId },
                include: {
                    field: {
                        include: {
                            location: true,
                        },
                    },
                },
            });

            if (!schedule) {
                throw new ORPCError("NOT_FOUND");
            }

            const matchDate = (() => {
                const day = schedule.day;
                if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
                    const parsed = new Date(`${day}T00:00:00.000Z`);
                    if (!Number.isNaN(parsed.getTime())) return parsed;
                }
                return new Date();
            })();

            return await prisma.match.upsert({
                where: { scheduleId: input.scheduleId },
                create: {
                    scheduleId: input.scheduleId,
                    creatorId: context.session.user.id,
                    sportId: schedule.field.location.sportId,
                    locationId: schedule.field.locationId,
                    matchDate,
                    startTime: schedule.start,
                    endTime: schedule.end,
                    maxPlayers: 10,
                    levelRequired: "BEGINNER",
                    gender: "MIXED",
                    price: 0,
                    isPublic: true,
                    autoValidate: true,
                    status: "OPEN",
                },
                update: {
                    matchDate,
                    startTime: schedule.start,
                    endTime: schedule.end,
                    locationId: schedule.field.locationId,
                    sportId: schedule.field.location.sportId,
                },
                select: {
                    id: true,
                    scheduleId: true,
                },
            });
        }),
    create: publicProcedure
        .input(matchSchema)
        .handler(async ({ input }) => {
            return await prisma.match.create({
                data: {
                    creatorId: input.creatorId,
                    sportId: input.sportId,
                    locationId: input.locationId,
                    matchDate: input.matchDate,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    maxPlayers: input.maxPlayers,
                    levelRequired: input.levelRequired,
                    gender: input.gender,
                    price: input.price,
                    isPublic: input.isPublic,
                    privateCode: input.privateCode ?? undefined,
                    autoValidate: input.autoValidate,
                    deadline: input.deadline,
                    description: input.description,
                    status: input.status,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.match.delete({
                where: {
                    id: input.id,
                },
            });
        }),
    update: publicProcedure
        .input(matchUpdateSchema)
        .handler(async ({ input }) => {
            return await prisma.match.update({
                where: {
                    id: input.id,
                },
                data: {
                    creatorId: input.creatorId,
                    sportId: input.sportId,
                    locationId: input.locationId,
                    matchDate: input.matchDate,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    maxPlayers: input.maxPlayers,
                    levelRequired: input.levelRequired,
                    gender: input.gender,
                    price: input.price,
                    isPublic: input.isPublic,
                    privateCode: input.privateCode,
                    autoValidate: input.autoValidate,
                    deadline: input.deadline,
                    description: input.description,
                    status: input.status,
                },
            });
        }),
};

export default matchRouter;