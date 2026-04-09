import { useLocation } from './location'
import { useMemo, useState } from 'react'

export function useSport(orpc: any, sportId: number) {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const {
    text,
    setText,
    locations,
    fields,
    isLoadingLocations,
    isLoadingFields,
  } = useLocation(orpc);

  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    return locations.filter(
      (location) =>
        location.sportId === sportId &&
        (
          location.name.toLowerCase().includes(text.toLowerCase()) ||
          location.address.toLowerCase().includes(text.toLowerCase())
        )
    );
  }, [text, locations, sportId]);

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