import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const equipmentSchema = z.object({
    name: z.string(),
})

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.equipment.findMany();
    }),
    create: publicProcedure
        .input(equipmentSchema)
        .handler(async ({ input }) => {
            return await prisma.equipment.create({
                data: {
                    name: input.name,
                },
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.equipment.delete({
                where: {
                    id: input.id,
                },
            });
        }),
    }   