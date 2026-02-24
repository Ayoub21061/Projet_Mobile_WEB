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
import user_sport from "./user_sport";
import user_equipment from "./user_equipment";
import match_participant from "./match_participant";
import field from "./field";
import schedule from "./schedule";
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
  matches: match,
  location,
  rating,
  badge,
  message,
  user_sport,
  user_equipment,
  match_participant,
  field,
  schedule,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
