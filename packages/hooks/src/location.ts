import { type orpc as ORPC } from '../../../apps/native/utils/orpc';
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";


export function useLocation(orpc: typeof ORPC) {
  const [text, setText] = useState("");
    
    const { data: locations, isLoading: isLoadingLocations } = useQuery(
        orpc.location.list.queryOptions()
    );

    const { data: fields, isLoading: isLoadingFields } = useQuery(
        orpc.field.list.queryOptions()
    );
    // Filtrage des locations selon la recherche
    const filteredLocations = useMemo(() => {
        if (!locations) return [];
        return locations.filter(
            (location) =>
                location.name.toLowerCase().includes(text.toLowerCase()) ||
                location.address.toLowerCase().includes(text.toLowerCase())
        );
    }, [text, locations]);

    return { text, setText,
        locations, fields, isLoadingLocations, isLoadingFields, filteredLocations
    }
}