import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";

type ORPCUtils = typeof orpcType;

export function useLocation(orpc: ORPCUtils) {
    const [text, setText] = useState("");

    const { data: locations, isLoading: isLoadingLocations } = useQuery(
        orpc.location.list.queryOptions()
    );

    const { data: fields, isLoading: isLoadingFields } = useQuery(
        orpc.field.list.queryOptions()
    );

    const filteredLocations = useMemo(() => {
        if (!locations) return [];
        return locations.filter(
            (location) =>
                location.name.toLowerCase().includes(text.toLowerCase()) ||
                location.address.toLowerCase().includes(text.toLowerCase())
        );
    }, [text, locations]);

    return {
        text,
        setText,
        locations,
        fields,
        isLoadingLocations,
        isLoadingFields,
        filteredLocations,
    };
}