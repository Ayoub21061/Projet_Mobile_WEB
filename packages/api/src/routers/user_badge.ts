import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const userBadgeSchema = z.object({
    userId : z.string(),
    badgeId : z.number(),
})

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.userBadge.findMany()
    }),
    create: publicProcedure
        .input(userBadgeSchema)
        .handler(async ({ input }) => {
            return await prisma.userBadge.create({
                data: input,
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.userBadge.delete({
                where: input,
            });
        }),
}