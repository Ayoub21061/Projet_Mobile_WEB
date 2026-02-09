import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const badgeSchema = z.object({
    name: z.string(),
    description: z.string(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.badge.findMany();
    }),
    create: publicProcedure
        .input(badgeSchema)
        .handler(async ({ input }) => {
            return await prisma.badge.create({
                data: {
                    name: input.name,
                    description: input.description,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.badge.delete({
                where: {
                    id: input.id,
                },
            });
        }),
}
