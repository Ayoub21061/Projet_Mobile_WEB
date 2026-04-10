import { createFileRoute } from "@tanstack/react-router";

import { useFieldSchedules } from "@my-app/hooks";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute('/fields/field_schedule')({
  component: FieldSchedulePage,
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.id ?? search.fieldId;
    const fieldId =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.length > 0
          ? Number(raw)
          : Number.NaN;

    return {
      fieldId: Number.isFinite(fieldId) && fieldId > 0 ? fieldId : undefined,
    };
  },
});

function FieldSchedulePage() {
  const { fieldId: fieldIdFromSearch } = Route.useSearch();
  const fieldId = typeof fieldIdFromSearch === "number" ? fieldIdFromSearch : Number.NaN;

  if (!Number.isFinite(fieldId) || fieldId <= 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Field schedule</h1>
        <p className="mt-2">Missing or invalid field id in URL.</p>
      </div>
    );
  }

  const {
    field,
    schedulesByDay,
    isLoading,
  } = useFieldSchedules(orpc, client, fieldId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{field?.name ?? "Field schedule"}</h1>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        Object.entries(schedulesByDay).map(([day, schedules]) => (
          <div key={day}>
            <h2 className="font-bold mt-4">{day}</h2>

            <div className="grid grid-cols-4 gap-2">
              {schedules.map((s: any) => (
                <div key={s.id} className="p-2 bg-green-600 rounded">
                  {s.start} - {s.end}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
