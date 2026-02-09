import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const userSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string(),
    pseudo: z.string(),
    city: z.string(),
})

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.user.findMany();
    }),
    create: publicProcedure
        .input(userSchema)
        .handler(async ({ input }) => {
            return await prisma.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    password: input.password,
                    pseudo: input.pseudo,
                    city: input.city,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .handler(async ({ input }) => {
            return await prisma.user.delete({
                where: {
                    id: input.id,
                },
            });
        }),
    update : publicProcedure
        .input(
            z.object({
                id: z.string().uuid(),
                name: z.string().optional(),
                email: z.string().email().optional(),
                password: z.string().optional(),
                pseudo: z.string().optional(),
                city: z.string().optional(),
            }),
        )
        .handler(async ({ input }) => {
            return await prisma.user.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    email: input.email,
                    password: input.password,
                    pseudo: input.pseudo,
                    city: input.city,
                },
            });
        }),
}