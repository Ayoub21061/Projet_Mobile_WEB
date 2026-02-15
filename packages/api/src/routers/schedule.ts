import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const fieldSchema = z.object({
    fieldId: z.number(),
    day: z.string(),
    start: z.string(),
    end: z.string(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.schedule.findMany();
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
                },
            })
        })
}