import { useQuery } from "@tanstack/react-query"

export function useHome(orpc: any) {
  const privateDataQuery = useQuery(orpc.privateData.queryOptions())

  const userName =
    privateDataQuery.data?.user?.name ||
    privateDataQuery.data?.user?.email ||
    ""

  return {
    userName,
    isLoading: privateDataQuery.isLoading,
  }
}