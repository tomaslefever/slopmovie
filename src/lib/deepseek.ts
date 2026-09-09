import { Character, Prop, SceneEnvironment, MovieBible, MovieStep, DecisionOption, Movie } from '@/types/cinema';

export interface GeneratedStoryBible {
  title: string;
  genre: string;
  tagline: string;
  initialPlot: string;
  masterArcThread: string;
  bible: MovieBible;
  firstStep: MovieStep;
}

// Preset high-fidelity stories for mock/fallback mode
const PRESET_STORIES = [
  {
    title: "Proyecto Némesis: Código 2099",
    genre: "Cyberpunk / Neo-Noir Thriller",
    tagline: "En una metrópolis de titanio y lluvia ácida, cada decisión altera el pulso de la ciudad.",
    initialPlot: "En Neo-Barcelona 2099, el detective bio-aumentado Kael Vane descubre un fragmento de código prohibido capaz de desarticular la red neural que controla la conciencia colectiva. Perseguido por las fuerzas corporativas de OmniaTech y los insurgentes de la Brecha Silenciosa, Kael debe descifrar el origen del código a lo largo de 100 hitos críticos.",
    masterArcThread: "Desarticulación gradual de la conspiración de OmniaTech a través de 100 decisiones comunitarias, desde las profundidades del Sub-Nivel 0 hasta la aguja orbital.",
    cinematicStyle: "Anamorphic 35mm Panavision, Dark Cyberpunk, Moody Teals and Neon Amber, High Contrast Volumetric Fog",
    targetTheme: "Transhumanismo, Libre Albedrío y Resistencia Urbana",
    characters: [
      {
        id: "char_kael",
        name: "Kael Vane",
        role: "Detective Protagonista",
        visualTraits: "Hombre de 34 años, ojo biónico izquierdo con iris cian luminiscente, cicatriz metálica en la mejilla, mirada penetrante y cansada",
        clothing: "Gabardina de cuero sintético grafito de cuello alto con refuerzos balísticos de fibra de carbono, guantes tácticos sin dedos",
        personality: "Cínico, analítico, guiado por un código de honor estricto",
        voiceStyle: "Grave, pausado, modulado con leve resonancia cibernética",
        voicePrompt: "Voz barítono grave y áspera de 34 años, ritmo lento y meditado, leve zumbido metálico sintético por implante laríngeo, acento urbano sobrio, respiración controlada y tono detectivesco cinematográfico",
        avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_lyra",
        name: "Dra. Lyra Chen",
        role: "Neurogenetista Rebelde",
        visualTraits: "Mujer de 29 años, cabello azabache asimétrico con reflejos violetas, tatuaje de circuito luminoso en el cuello",
        clothing: "Bata técnica translúcida sobre traje negro hermético de operaciones clandestinas",
        personality: "Brillante, calculadora, dispuesta a sacrificarlo todo por la verdad",
        voiceStyle: "Firme, rápida, impregnada de urgencia científica",
        voicePrompt: "Voz mezzosoprano limpia y precisa de 29 años, articulación rápida y elocuente con cadencia técnica, tono seguro con matices de urgencia emocional reprimida",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_neural_drive",
        name: "Prisma Neural Cero",
        description: "Dispositivo de almacenamiento cuántico de datos prohibidos",
        visualAppearance: "Prisma triangular de obsidiana negra pulida que emite pulsos de luz dorada interna",
        narrativeSignificance: "Contiene la llave para liberar o esclavizar la red neural humana",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_kael",
        ownerCharacterName: "Kael Vane",
        icon: "zap"
      },
      {
        id: "prop_revolver",
        name: "Cañón de Pulso Valkyrie",
        description: "Arma reglamentaria modificada de Kael",
        visualAppearance: "Revólver pesado de aleación de tungsteno con cañón electroluminiscente cian",
        narrativeSignificance: "Último recuerdo de su antiguo escuadrón de asalto",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_kael",
        ownerCharacterName: "Kael Vane",
        icon: "crosshair"
      }
    ],
    environments: [
      {
        id: "env_sublevel",
        name: "Distrito Neón Sub-Nivel 4",
        lighting: "Luces de neón parpadeantes magenta y cian reflejadas en charcos de asfalto aceitoso",
        atmosphere: "Lluvia incesante, vapor emergiendo de rejillas subterráneas, drones de vigilancia a la distancia",
        colorPalette: "Deep Navy #050b14, Electric Cyan #00f0ff, Cyber Magenta #ff0055",
        architecturalStyle: "Brutalismo hiper-denso con rascacielos monolíticos cubiertos de pantallas holográficas gigantes"
      },
      {
        id: "env_lab",
        name: "Búnker Clandestino de la Brecha",
        lighting: "Tiras LED ámbar tenues y pantallas de monitorización médica resplandecientes",
        atmosphere: "Silencio tenso, zumbido de servidores criogénicos y olor a ozono",
        colorPalette: "Matte Charcoal #12141a, Amber Warmth #ff9900, Pure White Accents",
        architecturalStyle: "Laboratorio subterráneo retro-futurista con muros de hormigón reforzado y cableado expuesto"
      }
    ]
  }
];

export async function generateStoryBibleWithDeepSeek(customPrompt?: string): Promise<GeneratedStoryBible> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (apiKey) {
    try {
      const systemPrompt = `Eres un Director de Cine y Guionista de Hollywood de élite experto en universos cinematográficos interactivos de alto impacto y consistencia visual y de audio estricta.
Tu misión es crear una BIBLIA NARRATIVA Y DE ARTE para una película interactiva comunitaria de 100 pasos.

REGLA CLAVE DE VOCES: Cada personaje debe tener un "voicePrompt" sumamente específico (timbre, tono, edad percibida, cadencia, acento, textura y procesado sonoro) para que los motores de audio/voz reproduzcan la misma voz a lo largo de los 100 clips.

REGLA DE PROPS Y PERSONAJES: Cada personaje inicial debe poseer su prop característico vinculado (ownerCharacterId) para asegurar su consistencia visual en imagen y video.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "title": "Título cinematográfico potente",
  "genre": "Género principal",
  "tagline": "Lema comercial intrigante",
  "initialPlot": "Argumento maestro completo que servirá de hilo conductor para 100 pasos",
  "masterArcThread": "Descripción del arco central que evolucionará con las decisiones del público",
  "cinematicStyle": "Estilo cinematográfico visual detallado (óptica, iluminación, atmósfera, grano de película)",
  "targetTheme": "Tema filosófico de fondo",
  "characters": [
    {
      "id": "char_1",
      "name": "Nombre completo",
      "role": "Protagonista / Aliado / Antagonista",
      "visualTraits": "Rasgos faciales y físicos INMUTABLES (ojos, edad, cabello, marcas distintivas)",
      "clothing": "Vestimenta icónica y accesorios permanentes",
      "personality": "Rasgos psicológicos clave",
      "voiceStyle": "Tono descriptivo corto",
      "voicePrompt": "Prompt acústico detallado (timbre, frecuencia, ritmo, respiración, textura)",
      "avatarUrl": "https://images.unsplash.com/..."
    }
  ],
  "props": [
    {
      "id": "prop_1",
      "name": "Nombre del objeto clave",
      "description": "Función narrativa",
      "visualAppearance": "Detalles visuales específicos e inconfundibles para prompts de IA",
      "narrativeSignificance": "Por qué es crucial en la trama",
      "ownerCharacterId": "char_1",
      "ownerCharacterName": "Nombre del personaje dueño",
      "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"
    }
  ],
  "environments": [
    {
      "id": "env_1",
      "name": "Nombre del escenario inicial",
      "lighting": "Tipo y temperatura de luz",
      "atmosphere": "Ambiente sonoro y visual",
      "colorPalette": "Colores dominantes y acentos",
      "architecturalStyle": "Estilo arquitectónico o natural"
    }
  ],
  "firstStep": {
    "stepNumber": 1,
    "title": "Título del primer clip de 15 segundos",
    "synopsis": "Acción que ocurre exactamente en los primeros 15 segundos",
    "dialogueSnippet": "Frase de diálogo o voz en off corta",
    "voiceDirection": "Dirección de voz basada en el voicePrompt del personaje que habla",
    "visualPrompt": "Prompt visual ultra detallado para fal.ai Minimax H3-Max con tokens del personaje y props",
    "cameraMotionPrompt": "Movimiento de cámara cinemático (ej: Slow tracking shot, 35mm anamorphic, dolly in)",
    "activeCharacters": ["char_1"],
    "activeProps": ["prop_1"],
    "environment": "env_1",
    "options": [
      {
        "id": "A",
        "title": "Opción A (Título conciso)",
        "text": "Acción inmediata que tomará el personaje",
        "dramaticHook": "Gancho de suspenso de esta opción",
        "expectedConsequence": "Consecuencia prevista si gana el voto A"
      },
      {
        "id": "B",
        "title": "Opción B (Título conciso alternativo)",
        "text": "Acción alternativa radicalmente opuesta",
        "dramaticHook": "Gancho de suspenso de esta opción",
        "expectedConsequence": "Consecuencia prevista si gana el voto B"
      }
    ]
  }
}`;

      const userMessage = customPrompt 
        ? `Crea la biblia cinematográfica interactiva basada en esta premisa: "${customPrompt}". Diseña el paso 1 con 2 opciones de votación intensas y define los prompts de voz de los personajes y sus props asociados.`
        : `Crea una historia cinematográfica interactiva de alta tensión con temática Cyberpunk o Thriller de Ciencia Ficción. Diseña el paso 1 de 15 segundos con 2 opciones de votación electrizantes y define los prompts de voz de los personajes y sus props asociados.`;

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        const parsed = JSON.parse(content);
        
        return {
          title: parsed.title,
          genre: parsed.genre,
          tagline: parsed.tagline,
          initialPlot: parsed.initialPlot,
          masterArcThread: parsed.masterArcThread,
          bible: {
            characters: parsed.characters.map((c: any) => ({ ...c, stepIntroduced: 1 })),
            props: parsed.props.map((p: any) => ({
              ...p,
              stepIntroduced: 1,
              imageUrl: p.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"
            })),
            environments: parsed.environments,
            cinematicStyle: parsed.cinematicStyle,
            targetTheme: parsed.targetTheme
          },
          firstStep: {
            ...parsed.firstStep,
            duration: 15,
            votingWindowSeconds: 10,
            options: parsed.firstStep.options.map((opt: DecisionOption) => ({ ...opt, votes: 0 })),
            videoUrl: "/videos/cyberpunk_step_1.mp4",
            createdAt: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.warn("DeepSeek API error, falling back to cinematic mockup:", error);
    }
  }

  // Fallback Mockup Generator
  const preset = PRESET_STORIES[0];
  const firstStep: MovieStep = {
    stepNumber: 1,
    title: "El Despertar del Código Silencioso",
    synopsis: "Kael Vane examina el prisma luminoso en el callejón bajo la lluvia torrencial. Su ojo biónico detecta un rastreador térmico aproximándose a gran velocidad.",
    dialogueSnippet: "Kael (V.O.): 'No debí haber aceptado este encargo... La firma cuántica no es de este mundo.'",
    voiceDirection: preset.characters[0].voicePrompt,
    visualPrompt: "Cinematic shot of Kael Vane (34yo male cyborg detective with glowing cyan bionic eye, dark leather trench coat) holding a triangular obsidian prisma glowing with amber light in a rainy cyberpunk alleyway, reflections on wet asphalt, volumetric cyan and magenta neon fog, 480p 16:9, photorealistic, anamorphic 35mm",
    cameraMotionPrompt: "Slow tracking camera dollying toward Kael's face, rain drops catching anamorphic lens flares, shallow depth of field, 24fps",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: 15,
    votingWindowSeconds: 10,
    activeCharacters: ["char_kael"],
    activeProps: ["prop_neural_drive"],
    propReferenceImages: [preset.props[0].imageUrl!],
    environment: "env_sublevel",
    createdAt: new Date().toISOString(),
    options: [
      {
        id: "A",
        title: "Descifrar el Prisma",
        text: "Kael conecta su interfaz neural directamente al prisma para leer los datos antes de que lleguen los perseguidores.",
        dramaticHook: "Riesgo de sobrecarga sináptica letal o revelación instantánea de la verdad.",
        expectedConsequence: "Obtendrá coordenadas secretas pero quedará vulnerable a la emboscada.",
        votes: 0
      },
      {
        id: "B",
        title: "Emboscada Táctica",
        text: "Kael oculta el artefacto en el conducto de ventilación y desenfunda su cañón de pulso para tender una trampa.",
        dramaticHook: "Enfrentamiento directo contra los asesinos cibernéticos de OmniaTech.",
        expectedConsequence: "Combate armado inmediato de alta intensidad en el callejón.",
        votes: 0
      }
    ]
  };

  return {
    title: preset.title,
    genre: preset.genre,
    tagline: preset.tagline,
    initialPlot: preset.initialPlot,
    masterArcThread: preset.masterArcThread,
    bible: {
      characters: preset.characters,
      props: preset.props,
      environments: preset.environments,
      cinematicStyle: preset.cinematicStyle,
      targetTheme: preset.targetTheme
    },
    firstStep
  };
}

export async function generateNextStepWithDeepSeek(
  movie: Movie,
  chosenOptionId: 'A' | 'B',
  previousStep: MovieStep
): Promise<MovieStep> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const nextStepNum = previousStep.stepNumber + 1;
  const chosenOption = previousStep.options.find(o => o.id === chosenOptionId) || previousStep.options[0];

  if (apiKey) {
    try {
      const systemPrompt = `Eres un Director de Cine Interactivo de IA. La película tiene un hilo conductor de 100 pasos.
El público acaba de votar por la OPCIÓN ${chosenOptionId}: "${chosenOption.title}" (${chosenOption.text}).
Estás generando el PASO ${nextStepNum} de 100 (un clip de exactamente 15 segundos para MiniMax H3-Max en 480p 16:9).

REGLA FUNDAMENTAL DE INTEGRACIÓN DE PROPS:
Los props NO se crean al azar. Se crean ÚNICAMENTE cuando la narrativa introduce un NUEVO PERSONAJE a la historia.
- Si en este paso la historia hace entrar a un nuevo personaje (aliado, informante, villano, androide, mercenario):
  Debes definir el objeto "newCharacter" (con su voicePrompt acústico inmutable) Y SIMULTÁNEAMENTE su objeto característico "newProp" (su arma, artefacto o herramienta personal imprescindible para su consistencia visual).
- Si en este paso NO entra un nuevo personaje, tanto "newCharacter" como "newProp" deben ser null.

Responde ÚNICAMENTE en formato JSON:
{
  "stepNumber": ${nextStepNum},
  "title": "Título del clip",
  "synopsis": "Acción en estos 15 segundos",
  "dialogueSnippet": "Línea hablada corta",
  "voiceDirection": "Dirección vocal basada en el voicePrompt del personaje que habla",
  "visualPrompt": "Prompt visual cinemático para fal.ai minimax/h3-max con tokens de consistencia",
  "cameraMotionPrompt": "Movimiento de cámara cinematográfico (dolly, pan, tracking, lente)",
  "activeCharacters": ["char_kael"],
  "activeProps": ["prop_neural_drive"],
  "newCharacter": null, 
  "newProp": null,
  "environment": "env_sublevel",
  "options": [
    {
      "id": "A",
      "title": "Título corto",
      "text": "Acción propuesta",
      "dramaticHook": "Gancho de suspenso",
      "expectedConsequence": "Consecuencia estimada"
    },
    {
      "id": "B",
      "title": "Título corto alternativo",
      "text": "Acción alternativa",
      "dramaticHook": "Gancho de suspenso",
      "expectedConsequence": "Consecuencia estimada"
    }
  ]
}`;

      const userContext = `Película: "${movie.title}".
Argumento maestro: "${movie.initialPlot}".
Paso previo (${previousStep.stepNumber}): "${previousStep.synopsis}".
Video anterior URL de referencia: "${previousStep.videoUrl}".
Opción ganadora votada por el público: "${chosenOption.text}" (Consecuencia esperada: ${chosenOption.expectedConsequence}).
Personajes existentes en la historia: ${JSON.stringify(movie.bible.characters.map(c => ({ id: c.id, name: c.name, role: c.role })))};
Props existentes: ${JSON.stringify(movie.bible.props.map(p => ({ id: p.id, name: p.name, owner: p.ownerCharacterName })))};`;

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContext }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0]?.message?.content);

        // Collect prop reference images from active props
        const activePropsObjects = movie.bible.props.filter(p => (parsed.activeProps || []).includes(p.id));
        const propReferenceImages = activePropsObjects.map(p => p.imageUrl).filter(Boolean) as string[];

        // Formulate new character and associated prop if introduced
        let newCharacter: Character | undefined = undefined;
        let newProp: Prop | undefined = undefined;

        if (parsed.newCharacter && parsed.newCharacter.name) {
          const charId = parsed.newCharacter.id || `char_${Date.now()}`;
          newCharacter = {
            ...parsed.newCharacter,
            id: charId,
            stepIntroduced: nextStepNum
          };

          if (parsed.newProp && parsed.newProp.name) {
            newProp = {
              ...parsed.newProp,
              id: parsed.newProp.id || `prop_${Date.now()}`,
              stepIntroduced: nextStepNum,
              ownerCharacterId: charId,
              ownerCharacterName: parsed.newCharacter.name,
              imageUrl: parsed.newProp.imageUrl || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600"
            };
          }
        }

        return {
          stepNumber: nextStepNum,
          title: parsed.title,
          synopsis: parsed.synopsis,
          dialogueSnippet: parsed.dialogueSnippet,
          voiceDirection: parsed.voiceDirection || movie.bible.characters[0]?.voicePrompt,
          visualPrompt: parsed.visualPrompt,
          cameraMotionPrompt: parsed.cameraMotionPrompt,
          videoUrl: "", // Fal.ai will populate this
          referenceVideoUrl: previousStep.videoUrl,
          propReferenceImages,
          duration: 15,
          votingWindowSeconds: 10,
          options: parsed.options.map((opt: DecisionOption) => ({ ...opt, votes: 0 })),
          activeCharacters: parsed.activeCharacters || ["char_kael"],
          activeProps: parsed.activeProps || ["prop_neural_drive"],
          newCharacter,
          newProp,
          environment: parsed.environment || "env_sublevel",
          createdAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn("DeepSeek step generation error, using procedural step:", e);
    }
  }

  // Procedural Mockup Generator: Introduces a new character & its associated prop ONLY at critical narrative turns (e.g. step 4 or step 8)
  const char = movie.bible.characters[0] || { 
    name: "Kael Vane", 
    visualTraits: "cyborg detective with cyan eye",
    voicePrompt: "Voz barítono grave y áspera de 34 años, ritmo pausado con sutil zumbido laríngeo"
  };
  const prop = movie.bible.props[0] || { 
    id: "prop_neural_drive",
    name: "Prisma Neural Cero", 
    visualAppearance: "obsidian prism with amber glow",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"
  };

  let newCharacter: Character | undefined = undefined;
  let newProp: Prop | undefined = undefined;

  // Trigger introduction of a new character & associated prop specifically when narrative demands (e.g., Step 4 introduces an Informant with their signature prop)
  if (nextStepNum === 4 && !movie.bible.characters.some(c => c.id === "char_informant_zack")) {
    newCharacter = {
      id: "char_informant_zack",
      name: "Zack 'El Espectro'",
      role: "Hacker e Informante Clandestino",
      visualTraits: "Hombre de 26 años, capucha refractaria con reflejos prismáticos, visera de realidad aumentada sobre los ojos",
      clothing: "Chaqueta acolchada impermeable con antenas receptoras cosidas a la manga",
      personality: "Paranoico, hiperactivo, vendedor de secretos al mejor postor",
      voiceStyle: "Susurrante, entrecortado, con modulación digital enmascarada",
      voicePrompt: "Voz tenor susurrada de 26 años, dicción rápida y conspirativa, modulador de voz que altera las consonantes, tono de paranoia constante",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
      stepIntroduced: nextStepNum
    };

    newProp = {
      id: "prop_spectral_deck",
      name: "Cyber-Deck 'Espectro 7'",
      description: "Terminal portátil artesanal para saltar cortafuegos de grado militar.",
      visualAppearance: "Dispositivo rectangular de baquelita y fibra de carbono con teclado mecánico retroiluminado verde fósforo y antena plegable",
      narrativeSignificance: "Permite a Zack abrir las esclusas de OmniaTech en tiempo real.",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
      stepIntroduced: nextStepNum,
      ownerCharacterId: newCharacter.id,
      ownerCharacterName: newCharacter.name,
      icon: "laptop"
    };
  }
  
  const stepTitles = [
    "Resonancia Cuántica en la Oscuridad",
    "Fuego Cruzado en el Monorriel",
    "La Sombra de OmniaTech",
    "El Encuentro con el Informante 'Espectro'",
    "Infiltración en la Torre Aguja",
    "El Mensaje Fragmentado de Lyra",
    "Protocolo de Emergencia Subterránea",
    "La Emboscada del Enforcer",
    "Descarga en la Red Prohibida",
    "El Umbral del Nivel Cero"
  ];

  const titleIndex = (nextStepNum - 1) % stepTitles.length;
  const currentTitle = nextStepNum === 4 
    ? "El Encuentro con el Informante 'Espectro'"
    : `${stepTitles[titleIndex]} (Fase ${Math.ceil(nextStepNum / 10)})`;

  let synopsis = "";
  let visualPrompt = "";
  let optionA: DecisionOption;
  let optionB: DecisionOption;

  if (newCharacter && newProp) {
    synopsis = `En este corte crucial, ${char.name} se reúne en las sombras con ${newCharacter.name}, quien empuña su ${newProp.name} para revelar las coordenadas de la torre.`;
    visualPrompt = `Cinematic shot of ${char.name} (${char.visualTraits}) meeting ${newCharacter.name} (${newCharacter.visualTraits}) in a steam-filled ventilation shaft, ${newCharacter.name} holding ${newProp.name} (${newProp.visualAppearance}), green neon reflections, 480p 16:9 film`;
    optionA = {
      id: "A",
      title: `Confiar en ${newCharacter.name}`,
      text: `${char.name} entrega el prisma a ${newCharacter.name} para sincronizarlo con su ${newProp.name}.`,
      dramaticHook: "¿Es Zack un aliado genuino o un topo corporativo?",
      expectedConsequence: "Acceso inmediato al ascensor de la aguja con cifrado de Zack.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Mantener Distancia Táctica",
      text: `${char.name} rehúsa entregar el artefacto y exige que Zack desbloquee la puerta primero.`,
      dramaticHook: "Tensión armada entre ambos en el conducto de ventilación.",
      expectedConsequence: "Zack coopera bajo amenaza, pero la relación de confianza se fractura.",
      votes: 0
    };
  } else if (chosenOptionId === 'A') {
    synopsis = `Tras decidir ${chosenOption.title.toLowerCase()}, ${char.name} logra una ventaja temporal. Una señal biométrica revela una compuerta secreta mientras el ${prop.name} emite una frecuencia ultrasónica.`;
    visualPrompt = `Dramatic cinema shot of ${char.name} (${char.visualTraits}) interacting with ${prop.name} (${prop.visualAppearance}), neon sparks, intense cyberpunk action, volumetric lighting, 480p 16:9 anamorphic film`;
    optionA = {
      id: "A",
      title: "Hackear la Compuerta",
      text: `${char.name} sobrecarga el terminal de acceso para forzar la entrada antes del escaneo corporal.`,
      dramaticHook: "Alarma general activada o acceso sin rastro a la sub-red.",
      expectedConsequence: "Infiltración rápida pero con riesgo de bloqueo del sector.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Desviar la Atención",
      text: `${char.name} arroja una granada de pulso electromagnético al generador para provocar un apagón en 3 manzanas.`,
      dramaticHook: "La ciudad queda a oscuras, creando caos entre drones y patrullas.",
      expectedConsequence: "Facilita la fuga en sigilo a través de las sombras.",
      votes: 0
    };
  } else {
    synopsis = `Siguiendo la decisión ${chosenOption.title.toLowerCase()}, la confrontación estalla. Los drones de seguridad barren el sector con láseres de fijación térmica mientras el equipo se reagrupa.`;
    visualPrompt = `Action cinematic sequence of ${char.name} (${char.visualTraits}) in evasive tactical maneuver, muzzle flash in rain, flying sparks, high velocity cinematography, neon reflections`;
    optionA = {
      id: "A",
      title: "Llamar al Contacto Clandestino",
      text: `Sincronizar frecuencia cifrada con la Dra. Lyra Chen para pedir extracción táctica inmediata.`,
      dramaticHook: "¿Es Lyra verdaderamente confiable o una trampa corporativa?",
      expectedConsequence: "Llegada de una nave aerodeslizadora clandestina.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Descender a los Túneles Criogénicos",
      text: `Deslizarse por el ducto de refrigeración líquida hacia las instalaciones abandonadas de los años 80.`,
      dramaticHook: "Temperaturas bajo cero y criaturas mutadas en el desagüe.",
      expectedConsequence: "Ruta fría que elude cualquier sensor térmico de OmniaTech.",
      votes: 0
    };
  }

  const activePropImages = [prop.imageUrl, newProp?.imageUrl].filter(Boolean) as string[];

  return {
    stepNumber: nextStepNum,
    title: currentTitle,
    synopsis,
    dialogueSnippet: newCharacter 
      ? `${newCharacter.name}: 'Si OmniaTech se entera de que te di mi ${newProp?.name}, mi cabeza tiene precio antes del amanecer.'`
      : `${char.name}: 'Las decisiones que tomamos aquí están reescribiendo el código de la ciudad.'`,
    voiceDirection: newCharacter ? newCharacter.voicePrompt : char.voicePrompt,
    visualPrompt,
    cameraMotionPrompt: "Dynamic handheld steadycam, cinematic lens flare, motion blur on fast turns, 24fps film stock",
    videoUrl: "", // Assigned by fal-video engine
    referenceVideoUrl: previousStep.videoUrl,
    propReferenceImages: activePropImages,
    duration: 15,
    votingWindowSeconds: 10,
    options: [optionA, optionB],
    activeCharacters: newCharacter ? [char.id, newCharacter.id] : [char.id || "char_kael"],
    activeProps: newProp ? [prop.id, newProp.id] : [prop.id || "prop_neural_drive"],
    newCharacter,
    newProp,
    environment: "env_sublevel",
    createdAt: new Date().toISOString()
  };
}
