import { createFileRoute } from '@tanstack/react-router'
import { useSport } from "@my-app/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { orpc } from "@/utils/orpc"

export const Route = createFileRoute('/basketball')({
  component: BasketballPage,
})

function BasketballPage() {
  const {
    text,
    setText,
    filteredLocations,
    selectedFields,
    selectedLocationId,
    setSelectedLocationId,
    isLoadingLocations,
    isLoadingFields,
  } = useSport(orpc, 2) // 🏀

  console.log("🔥 BASKETBALL WEB PAGE LOADED");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Basketball</h1>
          <p className="text-muted-foreground text-sm">Adresse de terrain de basketball :</p>
        </div>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rechercher un terrain"
        />

        <div className="space-y-2">
          {isLoadingLocations ? (
            <div className="text-muted-foreground text-sm">Loading locations...</div>
          ) : (
            filteredLocations.map((item: any) => (
              <Card
                key={item.id}
                className={item.id === selectedLocationId ? "ring-2 ring-ring" : undefined}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLocationId(item.id === selectedLocationId ? null : item.id)
                  }
                  className="w-full text-left"
                >
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.address}</CardDescription>
                  </CardHeader>
                </button>
              </Card>
            ))
          )}
        </div>

        {selectedLocationId && (
          <Card>
            <CardHeader>
              <CardTitle>Terrains disponibles</CardTitle>
              <CardDescription>Choisis un terrain pour voir le planning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingFields ? (
                <div className="text-muted-foreground text-sm">Loading fields...</div>
              ) : selectedFields.length === 0 ? (
                <div className="text-muted-foreground text-sm">Aucun terrain disponible</div>
              ) : (
                selectedFields.map((field: any) => (
                  <button
                    key={field.id}
                    className="w-full border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() =>
                      window.location.assign(`/fields/field_schedule?id=${field.id}`)
                    }
                  >
                    {field.name}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}