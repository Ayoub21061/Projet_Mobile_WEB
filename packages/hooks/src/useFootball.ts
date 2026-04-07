import { useMemo, useState } from "react";
import { useLocation } from "./location";

export function useFootball(orpc: any) {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const {
    text,
    setText,
    locations,
    fields,
    isLoadingLocations,
    isLoadingFields,
  } = useLocation(orpc);

  // 🔥 filtrage football uniquement
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    return locations.filter(
      (location) =>
        location.sportId === 1 &&
        (
          location.name.toLowerCase().includes(text.toLowerCase()) ||
          location.address.toLowerCase().includes(text.toLowerCase())
        )
    );
  }, [text, locations]);

  // 🔥 fields selon location sélectionnée
  const selectedFields = useMemo(() => {
    if (!fields || selectedLocationId === null) return [];
    return fields.filter((field) => field.locationId === selectedLocationId);
  }, [fields, selectedLocationId]);

  return {
    text,
    setText,
    filteredLocations,
    selectedFields,
    selectedLocationId,
    setSelectedLocationId,
    isLoadingLocations,
    isLoadingFields,
  };
}