import prisma from "@my-app/db";
import { publicProcedure } from "..";
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

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.match.findMany();
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
        .input(z.object({ id: z.string() }))
        .handler(async ({ input }) => {
            return await prisma.match.delete({
                where: {
                    id: input.id,
                },
            });
        }),
    update: publicProcedure
        .input(matchSchema)
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
}