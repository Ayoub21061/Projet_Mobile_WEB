// import { useQuery } from "@tanstack/react-query";
// import { createFileRoute } from "@tanstack/react-router";

// import { orpc } from "@/utils/orpc";

// export const Route = createFileRoute("/")({
//   component: HomeComponent,
// });

// const TITLE_TEXT = `
//  ██████╗ ███████╗████████╗████████╗███████╗██████╗
//  ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
//  ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
//  ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
//  ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
//  ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

//  ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
//  ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
//     ██║       ███████╗   ██║   ███████║██║     █████╔╝
//     ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
//     ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
//     ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
//  `;

// function HomeComponent() {
//   const healthCheck = useQuery(orpc.healthCheck.queryOptions());

//   return (
//     <div className="container mx-auto max-w-3xl px-4 py-2">
//       <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
//       <div className="grid gap-6">
//         <section className="rounded-lg border p-4">
//           <h2 className="mb-2 font-medium">API Status</h2>
//           <div className="flex items-center gap-2">
//             <div
//               className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
//             />
//             <span className="text-muted-foreground text-sm">
//               {healthCheck.isLoading
//                 ? "Checking..."
//                 : healthCheck.data
//                   ? "Connected"
//                   : "Disconnected"}
//             </span>
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }

import { createFileRoute } from '@tanstack/react-router'
import { useHome } from '@my-app/hooks'
import { orpc } from '@/utils/orpc'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { userName } = useHome(orpc)

  console.log("🔥 HOME WEB LOADED")

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        Bienvenue{userName ? ` ${userName}` : ""}
      </h1>

      <p className="text-center text-muted-foreground mb-6">
        Choisissez votre sport
      </p>

      <div className="grid grid-cols-2 gap-4">
        
        <a href="/football">
          <Card className="p-6 text-center cursor-pointer hover:bg-accent">
            ⚽ Football
          </Card>
        </a>

        <a href="/basketball">
          <Card className="p-6 text-center cursor-pointer hover:bg-accent">
            🏀 Basketball
          </Card>
        </a>

        <a href="/tennis">
          <Card className="p-6 text-center cursor-pointer hover:bg-accent">
            🎾 Tennis
          </Card>
        </a>

        <a href="/padel">
          <Card className="p-6 text-center cursor-pointer hover:bg-accent">
            🎾 Padel
          </Card>
        </a>

      </div>
    </div>
  )
}
