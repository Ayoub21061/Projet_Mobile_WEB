import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const userSportSchema = z.object({
    userId: z.string(),
    sportId: z.number(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]),
    position: z.string().optional(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.userSport.findMany();
    }),
    create: publicProcedure
        .input(userSportSchema)
        .handler(async ({ input }) => {
            return await prisma.userSport.create({
                data: input,
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input: where }) => {
            return await prisma.userSport.delete({
                where,
            });
        }),
}