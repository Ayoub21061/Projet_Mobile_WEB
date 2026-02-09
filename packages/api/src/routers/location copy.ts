import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const locationSchema = z.object({
    name : z.string(),
    address : z.string(),
    latitude : z.number(),
    longitude : z.number(),
});

export default {
    list: publicProcedure.handler(async () => {
        return await prisma.location.findMany();
    }),
    create: publicProcedure
        .input(locationSchema)
        .handler(async ({ input }) => {
            return await prisma.location.create({
                data: {
                    name: input.name,
                    address: input.address,
                    latitude: input.latitude,
                    longitude: input.longitude,
                },
            });
        }),
    delete: publicProcedure
        .input(locationSchema)
        .handler(async ({ input }) => {
            return await prisma.location.delete({
                where: {
                    id: input.id,
                },
            });
        }),
    update: publicProcedure
        .input(locationSchema)
        .handler(async ({ input }) => {
            return await prisma.location.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    address: input.address,
                    latitude: input.latitude,
                    longitude: input.longitude,
                },
            })
        })
}