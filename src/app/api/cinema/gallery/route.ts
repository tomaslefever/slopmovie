import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { Movie } from '@/types/cinema';
import { loadCompletedMoviesFromDb } from '@/lib/supabase/db';

// Showcase pre-completed movies for the gallery
const SHOWCASE_COMPLETED_MOVIES: Movie[] = [
  {
    id: "movie_completed_chrono_shift",
    title: "Chrono-Shift: La Paradoja de Neo-Tokio",
    genre: "Sci-Fi / Time-Travel Noir",
    tagline: "El futuro fue escrito por 2,400 espectadores. Este es el resultado.",
    initialPlot: "Año 2145. Un físico renegado roba el último acelerador de taquiones del laboratorio subacuático de Shin-Tokyo. A lo largo de 100 saltos temporales votados por el público, la línea temporal se fractura en realidades alternas.",
    masterArcThread: "Restauración del hilo temporal alfa mientras se elude a los saboteadores de la Guardia Cuántica.",
    status: "completed",
    currentStep: 100,
    totalSteps: 100,
    createdAt: "2026-08-15T20:00:00.000Z",
    completedAt: "2026-08-16T01:30:00.000Z",
    totalVotesCast: 14820,
    bible: {
      characters: [
        {
          id: "char_ren",
          name: "Dr. Ren Kurosawa",
          role: "Físico Temporal",
          visualTraits: "Cabello plateado corto, gafas holográficas con display numérico ámbar, abrigo blanco térmico con manchas de aceite cuántico",
          clothing: "Traje térmico aislante presurizado bajo guardapolvo balístico",
          personality: "Obsesivo, brillante, atormentado por las líneas temporales borradas",
          voicePrompt: "Voz tenor desgastada de 42 años, habla rápida con pausas súbitas, timbre nervioso y científico, reverberación suave de laboratorio",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
        },
        {
          id: "char_aiko",
          name: "Capitana Aiko Sato",
          role: "Guardia Cuántica",
          visualTraits: "Armadura exosqueleto de grafeno negro y oro, corte militar, implantes neuro-ópticos",
          clothing: "Uniforme de oficial cronal de élite",
          personality: "Inflexible, honorable, defensora del continuo espacio-tiempo",
          voicePrompt: "Voz contralto firme y resonante de 35 años, dicción militar pulcra, sin titubeos, tono grave y categórico",
          avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80"
        }
      ],
      props: [
        {
          id: "prop_tachyon",
          name: "Reloj de Fusión Taquiónica",
          description: "Manipulador de bucles temporales de bolsillo",
          visualAppearance: "Esfera de latón steampunk y fibra de carbono que emite un halo violeta en rotación",
          narrativeSignificance: "Permite rebobinar o adelantar 15 segundos en el espacio inmediato"
        }
      ],
      environments: [
        {
          id: "env_tokyo",
          name: "Distrito Flotante de Shin-Tokyo",
          lighting: "Luces estroboscópicas de neón azul cielo y dorado bajo nubes de tormenta ionizada",
          atmosphere: "Lluvia de microgotas luminosas, trenes magnéticos zumbando en el cielo",
          colorPalette: "Sky Neon #00e5ff, Imperial Gold #ffd700, Shadow Slate #0f141d",
          architecturalStyle: "Arquitectura metabolista japonesa con torres cilíndricas suspendidas"
        }
      ],
      cinematicStyle: "Cinemascope 2.39:1, Lentes Anamórficas Kowa Vintage, Aberración cromática en bordes, 24fps",
      targetTheme: "Destino vs. Casualidad, El peso del remordimiento temporal"
    },
    steps: Array.from({ length: 100 }).map((_, i) => ({
      stepNumber: i + 1,
      title: `Secuencia ${i + 1}: ${i % 2 === 0 ? "Fisura en el Vacío" : "Resonancia Temporal"}`,
      synopsis: `En el paso ${i + 1}, el Dr. Ren activa el dispositivo mientras los agentes convergen. La audiencia votó ${i % 2 === 0 ? 'Opción A' : 'Opción B'} permitiendo continuar el escape hacia el puente dimensional.`,
      dialogueSnippet: `Ren: 'Si fallamos en este salto, el año 2145 nunca habrá existido.'`,
      visualPrompt: "Dramatic shot of Dr. Ren with golden holographic glasses activating tachyon device in neo-tokyo rain, cinematic 8k",
      cameraMotionPrompt: "Fast orbital tracking shot, dynamic motion blur, lens flare",
      videoUrl: i % 2 === 0 
        ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" 
        : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
      duration: 15,
      votingWindowSeconds: 10,
      selectedOption: i % 2 === 0 ? 'A' : 'B',
      wasRandomPick: i % 7 === 0,
      activeCharacters: ["char_ren"],
      activeProps: ["prop_tachyon"],
      environment: "env_tokyo",
      createdAt: new Date(Date.now() - (100 - i) * 60000).toISOString(),
      options: [
        {
          id: "A",
          title: "Salto al Pasado Reciente",
          text: "Rebobinar 3 minutos para neutralizar la trampa",
          dramaticHook: "Crea un eco temporal peligroso",
          expectedConsequence: "Evasión del bloqueo",
          votes: 120 + (i * 3)
        },
        {
          id: "B",
          title: "Sobrecarga de Taquiones",
          text: "Disparar una onda de choque para desarmar a los perseguidores",
          dramaticHook: "Inestabilidad en la atmósfera",
          expectedConsequence: "Explosión electromagnética",
          votes: 95 + (i * 2)
        }
      ]
    }))
  }
];

export async function GET() {
  const currentActiveMovie = cinemaEngine.movie;
  
  // Fetch completed movies from Supabase if configured
  const dbCompleted = await loadCompletedMoviesFromDb();

  // Deduplicate movies by id
  const movieMap = new Map<string, Movie>();
  for (const m of SHOWCASE_COMPLETED_MOVIES) {
    movieMap.set(m.id, m);
  }
  for (const m of cinemaEngine.completedMovies) {
    movieMap.set(m.id, m);
  }
  for (const m of dbCompleted) {
    movieMap.set(m.id, m);
  }

  return NextResponse.json({
    activeMovie: currentActiveMovie,
    completedMovies: Array.from(movieMap.values())
  });
}
