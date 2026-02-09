import type { RouterClient } from "@orpc/server";
import sports from "./sports";
import equipment from "./equipment";
import user from "./user";
import availability from "./availability";
import match from "./match";
import location from "./location";
import rating from "./rating";
import badge from "./badge";
import message from "./message";
import { protectedProcedure, publicProcedure } from "../index";


export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  sports,
  equipment,
  user,
  availability,
  match,
  location,
  rating,
  badge,
  message,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
