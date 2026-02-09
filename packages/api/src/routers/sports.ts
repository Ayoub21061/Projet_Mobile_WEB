import prisma from "@my-app/db";
import { publicProcedure } from "..";
import z from "zod";

const sportSchema = z.object({
  name: z.string(),
});

export default {
  list: publicProcedure.handler(async () => {
    return await prisma.sport.findMany();
  }),
  create: publicProcedure
    .input(sportSchema)
    .handler(async ({ input }) => {
      return await prisma.sport.create({
        data: {
          name: input.name,
        },
      });
    }),
    delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      return await prisma.sport.delete({
        where: {
          id: input.id,
        },
      });
    }),
}

