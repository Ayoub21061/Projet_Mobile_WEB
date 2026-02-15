import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const fieldSchema = z.object({
    locationId: z.number(),
    name: z.string(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.field.findMany();
    }),
    create: publicProcedure
        .input(fieldSchema)
        .handler(async ({ input }) => {
            return await prisma.field.create({
                data: input,
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.field.delete({
                where: input,
            });
        }),
    update: publicProcedure
        .input(
            z.object({ 
                id: z.number(),
                locationId: z.number().optional(),
                name: z.string().optional(),
            }),
        )
        .handler(async ({ input }) => {
            return await prisma.field.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    locationId: input.locationId,
                },
            })
        })
}