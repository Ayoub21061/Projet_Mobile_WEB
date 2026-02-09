import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const availabilitySchema = z.object({
    userId: z.string(),
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
    startTime: z.string(),
    endTime: z.string(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.availability.findMany();
    }),
    create: publicProcedure
        .input(availabilitySchema)
        .handler(async ({ input }) => {
            return await prisma.availability.create({
                data: {
                    userId: input.userId,
                    dayOfWeek: input.dayOfWeek,
                    startTime: input.startTime,
                    endTime: input.endTime,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ input }) => {
            return await prisma.availability.delete({
                where: {
                    id: input.id,
                },
            });
        }),
}