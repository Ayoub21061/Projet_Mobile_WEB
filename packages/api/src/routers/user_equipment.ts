import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const userEquipmentSchema = z.object({
    userId : z.string(),
    equipmentId : z.number(),
})

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.userEquipment.findMany();
    }),
    create: publicProcedure
        .input(userEquipmentSchema)
        .handler(async ({ input }) => {
            return await prisma.userEquipment.create({
                data: input,
            });
        }),
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .handler(async ({ input }) => {
            return await prisma.userEquipment.delete({
                where: input,
            });
        }),
}
