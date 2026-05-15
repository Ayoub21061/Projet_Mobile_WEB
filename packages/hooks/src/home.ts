import { useQuery } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";

type ORPCUtils = typeof orpcType;

export function useHome(orpc: ORPCUtils) {
    const privateDataQuery = useQuery(orpc.privateData.queryOptions());

    const userName =
        privateDataQuery.data?.user?.name ||
        privateDataQuery.data?.user?.email ||
        "";

    return {
        userName,
        isLoading: privateDataQuery.isLoading,
    };
}