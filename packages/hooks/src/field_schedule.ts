import { useQuery } from "@tanstack/react-query";

export function useFieldSchedules(
    orpc: any,
    client: any,
    fieldId: number,
    currentUserId?: string | number
) {
    const isFieldIdValid = Number.isFinite(fieldId);

    // 🔹 Field
    const fieldsQuery = useQuery({
        ...orpc.field.list.queryOptions({}),
        enabled: isFieldIdValid,
    });

    const fields = (fieldsQuery.data as any[] | undefined) ?? [];
    const field = fields.find((f: any) => f.id === fieldId);

    // 🔹 Schedules
    const schedulesQuery = useQuery({
        ...orpc.schedule.listByField.queryOptions({ input: { fieldId } }),
        enabled: isFieldIdValid,
    });
    const schedules = (schedulesQuery.data as any[] | undefined) ?? [];
    const isLoading = schedulesQuery.isLoading;

    // 🔹 Matches
    const matchesQuery = useQuery({
        queryKey: ["matches.list"],
        // queryFn: async () => (client as any).matches.list(),
        queryFn: async () => client.matches.list(),
        enabled: isFieldIdValid,
    });

    // 🔹 Participants
    const participantsQuery = useQuery({
        ...orpc.match_participant.list.queryOptions(),
        enabled: isFieldIdValid,
    });
    const participants = (participantsQuery.data as any[] | undefined) ?? [];

    const matches = (matchesQuery.data as any[] | undefined) ?? [];

    // 🔥 Map schedule → match
    const matchIdByScheduleId = new Map<number, number>();
    for (const match of matches) {
        if (typeof match.scheduleId === "number") {
            matchIdByScheduleId.set(match.scheduleId, match.id);
        }
    }

    // 🔥 Count participants
    const acceptedCountByMatchId = new Map<number, number>();
    for (const participant of participants) {
        if (participant.status !== "ACCEPTED") continue;
        acceptedCountByMatchId.set(
            participant.matchId,
            (acceptedCountByMatchId.get(participant.matchId) ?? 0) + 1
        );
    }

    // 🔥 Group by day
    const schedulesByDay: Record<string, any[]> = schedules.reduce(
        (acc: Record<string, any[]>, schedule: any) => {
            const dayKey = String(schedule.day);
            (acc[dayKey] ??= []).push(schedule);
            return acc;
        },
        {}
    );

    return {
        field,
        schedules,
        schedulesByDay,
        isLoading,
        participants,
        matchIdByScheduleId,
        acceptedCountByMatchId,
        currentUserId,
    };
}