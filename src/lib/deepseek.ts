import { Character, Prop, SceneEnvironment, MovieBible, MovieStep, DecisionOption, Movie, SubtitleCue, ChatMessage } from '@/types/cinema';

export interface GeneratedStoryBible {
  title: string;
  genre: string;
  tagline: string;
  initialPlot: string;
  masterArcThread: string;
  bible: MovieBible;
  firstStep: MovieStep;
}

export const BLOCKBUSTER_GENRES = [
  {
    genre: "Cyberpunk / Neo-Noir Thriller",
    theme: "Transhumanism, Megacorporations & Neural Resistance",
    style: "Anamorphic 35mm Panavision, Dark Cyberpunk, Moody Teals and Neon Amber, High Contrast Volumetric Fog"
  },
  {
    genre: "Dark Epic Fantasy / Mythic Saga",
    theme: "Ancient Runes, Blood Sorcery, Obsidian Blades & Fallen Kingdoms",
    style: "70mm Ultra Panavision, Dark Fantasy Gothic, Candelit Shadows, Volumetric Mist and Glowing Runic Embers"
  },
  {
    genre: "Cosmic Space Opera / Sci-Fi Odyssey",
    theme: "Deep Space Exploration, Dyson Spheres, First Contact & Alien Anomalies",
    style: "IMAX 65mm Cosmic Scale, Deep Void Blacks, Pulsing Starfield Glow, Chromatic Stellar Flare"
  },
  {
    genre: "Post-Apocalyptic Solarpunk / Mech Wasteland",
    theme: "Overgrown Colossal Titans, Scavenger Clans & The Lost Sun Engine",
    style: "Super 35mm Gritty Gold and Rust, Dusty Atmospheric Haze, Blinding Sunbursts and Oxidized Copper"
  },
  {
    genre: "Supernatural Steampunk Mystery",
    theme: "Victorian Alchemy, Clockwork Espionage & Forbidden Relics",
    style: "35mm Vintage Monochrome with Sepia & Brass Highlights, Heavy Fog, Gaslight Glare and Steam Plumes"
  }
];

let currentStoryRotation = 0;
export function getNextBlockbusterRotationIndex(): number {
  const index = currentStoryRotation % PRESET_STORIES.length;
  currentStoryRotation++;
  return index;
}

// Preset high-fidelity stories for diverse blockbuster rotation
const PRESET_STORIES = [
  // 1. Cyberpunk Neo-Noir
  {
    title: "Project Nemesis: Protocol 2099",
    genre: "Cyberpunk / Neo-Noir Thriller",
    tagline: "In a metropolis of chrome and acid rain, every audience choice reconfigures the city's pulse.",
    initialPlot: "In Neo-Sector 9, cybernetically augmented detective Kael Vane intercepts a forbidden quantum data prism capable of destabilizing the planetary neural syndicate OmniaTech. Pursued by corporate assassin squads and underground faction The Silent Breach, Kael must navigate 100 critical decisions shaped in real-time by the audience.",
    masterArcThread: "Gradual dismantling of the OmniaTech orbital syndicate across 100 community-voted milestones, from the subterranean gutters of Sub-Level 4 to the orbital spire.",
    cinematicStyle: "Anamorphic 35mm Panavision, Dark Cyberpunk, Moody Teals and Neon Amber, High Contrast Volumetric Fog",
    targetTheme: "Transhumanism, Free Will and Urban Resistance",
    firstStepTitle: "Awakening the Silent Protocol",
    firstStepSynopsis: "Kael Vane examines the obsidian quantum prism in a rain-drenched cyberpunk alley. His bionic eye detects hostile thermal trackers closing in at high speed.",
    firstStepDialogue: "Kael (V.O.): 'I shouldn't have taken this contract... That quantum frequency isn't human.'",
    firstStepSubtitles: [
      { start: 1.0, end: 7.0, speaker: "Kael", text: "I shouldn't have taken this contract... That quantum frequency isn't human.", textEs: "No debí haber aceptado este encargo... Esa frecuencia cuántica no es humana." },
      { start: 7.5, end: 14.0, speaker: "Kael", text: "Hostiles inbound on the thermal band. Ten seconds to decide.", textEs: "Hostiles aproximándose en la banda térmica. Diez segundos para decidir." }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    characters: [
      {
        id: "char_kael",
        name: "Kael Vane",
        role: "Lead Detective / Protagonist",
        visualTraits: "34yo male, glowing cyan bionic left iris, tungsten scar on cheek, fatigued yet sharp gaze",
        clothing: "High-collared graphite synthetic leather trench coat with carbon fiber weaves, fingerless tactical gloves",
        personality: "Cynical, analytical, bound by an unwavering street honor code",
        voiceStyle: "Gritty, measured baritone with subtle cybernetic vocal fry",
        voicePrompt: "Gritty, deep 34-year-old baritone with a deliberate cadence, subtle laryngeal synthesized resonance, calm mid-Atlantic noir detective delivery, controlled breathing and cinematic gravitas.",
        avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_lyra",
        name: "Dr. Lyra Chen",
        role: "Rebel Neurogeneticist",
        visualTraits: "29yo female, asymmetrical jet-black hair with violet luminescence, glowing neural circuit tattoo along jawline",
        clothing: "Translucent technical duster over clandestine tactical ops bodysuit",
        personality: "Brilliant, calculating, willing to sacrifice everything for the truth",
        voiceStyle: "Crisp, fast-paced, infused with scientific urgency",
        voicePrompt: "Clean, precise 29-year-old mezzosoprano, rapid articulate delivery with technical cadence, authoritative tone edged with restrained emotional urgency.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_neural_drive",
        name: "Zero Neural Prism",
        description: "Quantum storage matrix holding restricted biometric telemetry",
        visualAppearance: "Triangular polished obsidian prism pulsating with internal amber quantum light",
        narrativeSignificance: "Contains the cryptographic key to liberate or enslave the human neural mesh",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_kael",
        ownerCharacterName: "Kael Vane",
        icon: "zap"
      },
      {
        id: "prop_revolver",
        name: "Valkyrie Pulse Cannon",
        description: "Kael's custom sidearm",
        visualAppearance: "Heavy tungsten-alloy revolver with electroluminescent cyan barrel",
        narrativeSignificance: "Last relic from his defunct urban assault squad",
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
        name: "Neon District Sub-Level 4",
        lighting: "Flickering magenta and electric cyan neon reflecting on rain-slicked asphalt puddles",
        atmosphere: "Relentless drizzle, industrial steam escaping manholes, surveillance drones in distance",
        colorPalette: "Deep Navy #050b14, Electric Cyan #00f0ff, Cyber Magenta #ff0055",
        architecturalStyle: "Hyper-dense brutalism with monolithic towers cloaked in holographic billboards"
      }
    ],
    options: [
      { id: "A", title: "Decrypt the Quantum Prism", text: "Kael jacks his neural port directly into the prism to extract classified coordinates before the strike team breaches.", dramaticHook: "Risk of lethal synaptic feedback or instantaneous illumination.", expectedConsequence: "Unlocks classified coordinates but leaves him defenseless against the ambush." },
      { id: "B", title: "Tactical Ambush", text: "Kael conceals the artifact inside the ventilation conduit and unholsters his Valkyrie pulse cannon to spring a counter-trap.", dramaticHook: "Direct armed firefight against OmniaTech cyber-assassins.", expectedConsequence: "High-intensity armed confrontation in the alleyway." }
    ]
  },

  // 2. Dark Epic Fantasy
  {
    title: "The Shattered Crown: Chronicles of Eldoria",
    genre: "Dark Epic Fantasy / Mythic Saga",
    tagline: "When the ancient god-kings bled, an obsidian throne fractured the kingdoms of man forever.",
    initialPlot: "In the frostbitten citadel of Val-Khor, exiled runesmith Soren Draven unearths the Starforged Cinder: the pulsing hearth of a slain titan. With the Blood Court's wraiths encroaching upon the sanctuary gates, Soren and shadow-weaver Vespera must decide whether to consume the relic's forbidden fire or seal the realm in eternal twilight.",
    masterArcThread: "A 100-step journey across the desecrated kingdoms of Eldoria, reforging the shattered imperial crown before the Eclipse of the Seven Moons consumes mortal kind.",
    cinematicStyle: "70mm Ultra Panavision, Dark Fantasy Gothic, Candelit Shadows, Volumetric Mist and Glowing Runic Embers",
    targetTheme: "Sacrifice, Corrupted Royalty and Primordial Magic",
    firstStepTitle: "The Whispering Forge of Val-Khor",
    firstStepSynopsis: "Soren hammers the final sealing ward into the anvil as the Starforged Cinder blazes with violet luminescence. The iron cathedral doors groan under the assault of the Blood Court.",
    firstStepDialogue: "Soren: 'The ward is failing! If the cinder awakens now, it won't just burn the palace... it will incinerate our souls.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Soren", text: "The ward is failing! If the cinder awakens now, it burns our souls.", textEs: "¡El sello está fallando! Si la brasa despierta ahora, consumirá nuestras almas." },
      { start: 7.0, end: 14.0, speaker: "Vespera", text: "Let it burn. Better ashes than kneeling to the Blood Court.", textEs: "Que arda. Es mejor ser cenizas que arrodillarse ante la Corte de Sangre." }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    characters: [
      {
        id: "char_soren",
        name: "Soren Draven",
        role: "Exiled Runesmith / Protagonist",
        visualTraits: "38yo male, scarred weathered face, smoldering amber eyes, silver-streaked dark braided hair",
        clothing: "Blackened heavy chainmail draped with wolf pelt and etched runic brass vambraces",
        personality: "Stoic, haunted by fallen kin, fiercely protective of the ancient oath",
        voiceStyle: "Resonant, weathered Northern baritone with thunderous weight",
        voicePrompt: "Weathered 38-year-old Northern baritone, low rumble with gritty rasp, authoritative warrior cadence, deliberate breathing, epic gravitas.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_vespera",
        name: "Vespera Nyx",
        role: "Shadow-Weaver of the Veil",
        visualTraits: "27yo female, pale ethereal skin, raven hair interwoven with silver needles, eyes like liquid obsidian",
        clothing: "Flowing velvet cloak of midnight blue stitched with shimmering star-thread",
        personality: "Enigmatic, fearless, attuned to the whisper of old gods",
        voiceStyle: "Silky, hypnotic alto with an eerie harmonic echo",
        voicePrompt: "Hypnotic 27-year-old alto, whispered velvet cadence, subtle harmonic presence, aristocratic mystery, calm poise amid chaos.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_cinder",
        name: "Starforged Cinder",
        description: "Living crystalline hearth of a fallen primordial titan",
        visualAppearance: "Faceted heart-shaped meteor mineral glowing with inner violet and gold flames",
        narrativeSignificance: "Capable of reforging broken realms or sundering mountain ranges",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_soren",
        ownerCharacterName: "Soren Draven",
        icon: "flame"
      },
      {
        id: "prop_blade",
        name: "Eclipse Brand",
        description: "Runic greatsword forged in dragon blood",
        visualAppearance: "Obsidian serrated greatsword etched with glowing crimson runes",
        narrativeSignificance: "Only blade capable of piercing wraith armor",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_soren",
        ownerCharacterName: "Soren Draven",
        icon: "sword"
      }
    ],
    environments: [
      {
        id: "env_cathedral",
        name: "The Runeforge of Val-Khor",
        lighting: "Flickering bonfires, glowing runic floor sigils and towering stained-glass gothic arches",
        atmosphere: "Ominous chanting, falling embers, heavy smoke and ice creeping across flagstones",
        colorPalette: "Obsidian Black #050505, Runic Violet #7b1fa2, Smoldering Gold #ffb300",
        architecturalStyle: "Colossal gothic cathedral built inside a hollowed glacial mountain"
      }
    ],
    options: [
      { id: "A", title: "Ignite the Starforged Cinder", text: "Soren channels his life essence into the cinder, releasing a radial shockwave of cosmic flame to incinerate the attackers.", dramaticHook: "Unbridled devastation that risks corrupting Soren's physical form.", expectedConsequence: "Massive thermal eruption that wipes out the vanguard but drains Soren's lifeforce." },
      { id: "B", title: "Open the Shadowveil Passage", text: "Vespera weaves the shadows to tear open a subterranean rift leading into the catacombs of the sleeping dragons.", dramaticHook: "Desperate escape into uncharted labyrinthian darkness.", expectedConsequence: "Avoids direct battle but plunges the party into ancient subterranean horrors." }
    ]
  },

  // 3. Cosmic Space Opera
  {
    title: "Aegis Horizon: Deep Void Protocol",
    genre: "Cosmic Space Opera / Sci-Fi Odyssey",
    tagline: "At the event horizon of Sector Orion, humanity discovers we were never alone — we were forgotten.",
    initialPlot: "Deep exploratory vessel USS Vanguard arrives at the perimeter of the Kepler Singularity, discovering an abandoned colossal megastructure known as the Architect's Loom. Commander Marcus Vance and Chief Astrobiologist Dr. Sean Mercer receive an impossible distress signal encoded in human DNA dating back four million years.",
    masterArcThread: "Deciphering the celestial origin of consciousness across 100 deep-space orbital encounters, navigating black hole distortions and rogue artificial sentinels.",
    cinematicStyle: "IMAX 65mm Cosmic Scale, Deep Void Blacks, Pulsing Starfield Glow, Chromatic Stellar Flare",
    targetTheme: "Cosmic Wonder, Extinction Paradigms and The Limits of Human Knowledge",
    firstStepTitle: "Threshold of the Kepler Singularity",
    firstStepSynopsis: "USS Vanguard halts before the monumental alien Dyson ring encircling the black hole. Gravitational lenses distort the stars as anomalous geometric pulses strike the bridge hull.",
    firstStepDialogue: "Marcus Vance: 'Telemetry confirms it... That structure is older than our galaxy. And it just opened its gates for us.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.8, speaker: "Marcus", text: "Telemetry confirms it... That structure is older than our galaxy.", textEs: "La telemetría lo confirma... Esa estructura es más antigua que nuestra galaxia." },
      { start: 7.2, end: 14.0, speaker: "Dr. Mercer", text: "It's transmitting on our frequency. It knows our names, Marcus.", textEs: "Está transmitiendo en nuestra frecuencia. Sabe nuestros nombres, Marcus." }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    characters: [
      {
        id: "char_marcus",
        name: "Commander Marcus Vance",
        role: "Expedition Captain / Protagonist",
        visualTraits: "42yo male, sharp jawline, graying temples, determined steel-blue eyes",
        clothing: "Pressurized deep-space flight tunic with reinforced titanium collar and mission insignia",
        personality: "Decisive, protective of his crew, guided by pragmatic scientific curiosity",
        voiceStyle: "Commanding, calm baritone with resonant cockpit radio acoustics",
        voicePrompt: "Mature 42-year-old command baritone, authoritative naval cadence, steady composure under extreme gravimetric crisis.",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_nav_key",
        name: "Chronos Grav-Beacon",
        description: "Zero-point quantum navigational device",
        visualAppearance: "Floating gyroscopic sphere of white gold with counter-rotating tachyon rings",
        narrativeSignificance: "Stabilizes wormhole traversals and prevents spaghettification near singularities",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_marcus",
        ownerCharacterName: "Marcus Vance",
        icon: "compass"
      }
    ],
    environments: [
      {
        id: "env_bridge",
        name: "USS Vanguard Observation Deck",
        lighting: "Ultramarine starlight, orange emergency HUD displays, gleaming chrome consoles",
        atmosphere: "Low hum of ion drives, cosmic radiation reflections, total silence of outer space",
        colorPalette: "Deep Space Black #020204, Stellar Cyan #00d2ff, Warning Amber #ff9100",
        architecturalStyle: "Sleek aerodynamic hard sci-fi bridge overlooking a massive curved viewport"
      }
    ],
    options: [
      { id: "A", title: "Pilot Vanguard into the Aperture", text: "Vance orders full sub-light burn directly through the alien ring's Iris before the gravitational collapse.", dramaticHook: "Unknown spatial jump beyond known physics.", expectedConsequence: "Transports the Vanguard into the megastructure core but risks engine overload." },
      { id: "B", title: "Deploy Remote Drone Probes", text: "Maintain defensive orbital distance and launch autonomous tachyon probes to analyze the DNA signal.", dramaticHook: "Safer tactical posture with risk of alien defenses engaging.", expectedConsequence: "Gathers telemetry safely but alerts the Loom's guardian drones." }
    ]
  }
];


export async function generateStoryBibleWithDeepSeek(customPrompt?: string): Promise<GeneratedStoryBible> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (apiKey) {
    try {
      const systemPrompt = `You are an elite Hollywood Director and Screenwriter specializing in interactive sci-fi cinematic universes with strict visual and audio continuity.
Your mission is to formulate a MASTER STORY AND ART BIBLE for a 100-step interactive live cinema film.

MANDATORY RULES:
1. ALL OUTPUT MUST BE IN ENGLISH. Every field, title, synopsis, character description, voice prompt, prop, dialogue, subtitle, and option must be written in high-caliber cinematic English.
2. VOICE CONTINUITY: Every character must have an immutable "voicePrompt" (timbre, frequency, pacing, breathing, accent, audio processing) so audio engines synthesize the exact same voice across all 100 clips.
3. PROPS & CHARACTERS: Every initial character must have their signature linked prop (ownerCharacterId) for consistent visual prompting.
4. SUBTITLES: The first step must include timed "subtitles" (start in seconds, end in seconds, speaker, text in English, and optional textEs in Spanish).
5. ONLY NECESSARY PROPS: In "firstStep.activeProps", specify ONLY the prop ID(s) that are physically visible or actively held/used in this opening 15-second scene. DO NOT pass all props. If no prop is visible in the shot, "activeProps" must be empty [].

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Compelling Cinematic Title in English",
  "genre": "Sci-Fi / Cyberpunk Thriller",
  "tagline": "Intriguing Hook in English",
  "initialPlot": "Full master narrative arc in English that serves as the spine for 100 steps",
  "masterArcThread": "Core story trajectory in English that evolves with audience choices",
  "cinematicStyle": "Detailed visual style (lenses, lighting, film grain, color grading)",
  "targetTheme": "Underlying philosophical theme",
  "characters": [
    {
      "id": "char_1",
      "name": "Full Character Name",
      "role": "Lead Detective / Protagonist",
      "visualTraits": "IMMUTABLE physical and facial traits (eyes, age, hair, scars)",
      "clothing": "Iconic signature wardrobe and permanent tactical gear",
      "personality": "Key psychological traits",
      "voiceStyle": "Short descriptive voice label",
      "voicePrompt": "Detailed acoustic voice prompt in English (timbre, pitch, tempo, accent, texture)",
      "avatarUrl": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300"
    }
  ],
  "props": [
    {
      "id": "prop_1",
      "name": "Key Prop Name",
      "description": "Narrative purpose in English",
      "visualAppearance": "Specific, unmistakable physical visual traits for image/video prompts",
      "narrativeSignificance": "Why it is critical to the story",
      "ownerCharacterId": "char_1",
      "ownerCharacterName": "Owner Character Name",
      "imageUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"
    }
  ],
  "environments": [
    {
      "id": "env_1",
      "name": "Opening Environment Name",
      "lighting": "Lighting temperature and sources",
      "atmosphere": "Visual and acoustic mood",
      "colorPalette": "Dominant tones and neon accents",
      "architecturalStyle": "Architectural or natural aesthetic"
    }
  ],
  "firstStep": {
    "stepNumber": 1,
    "title": "Title of First 15s Scene in English",
    "synopsis": "Action unfolding in these first 15 seconds in English",
    "dialogueSnippet": "Spoken dialogue line or voiceover in English",
    "subtitles": [
      {
        "start": 1.0,
        "end": 7.0,
        "speaker": "Character Name",
        "text": "First spoken line in English...",
        "textEs": "Spanish subtitle translation..."
      },
      {
        "start": 8.0,
        "end": 14.0,
        "speaker": "Character Name",
        "text": "Second line in English before voting begins...",
        "textEs": "Segunda línea en español..."
      }
    ],
    "voiceDirection": "Acoustic direction in English based on the speaking character's voicePrompt",
    "visualPrompt": "Ultra-detailed visual prompt in English for fal.ai Minimax H3-Max (480p 16:9) with character and prop tokens",
    "cameraMotionPrompt": "Cinematic camera movement in English (e.g. Slow tracking dolly-in, 35mm anamorphic, shallow depth of field)",
    "activeCharacters": ["char_1"],
    "activeProps": ["prop_1"],
    "environment": "env_1",
    "options": [
      {
        "id": "A",
        "title": "Option A Title in English",
        "text": "Immediate action taken by the protagonist in English",
        "dramaticHook": "Suspense hook in English",
        "expectedConsequence": "Estimated consequence if Option A wins"
      },
      {
        "id": "B",
        "title": "Option B Title in English",
        "text": "Radically diverging alternative action in English",
        "dramaticHook": "Suspense hook in English",
        "expectedConsequence": "Estimated consequence if Option B wins"
      }
    ]
  }
}`;

      const userMessage = customPrompt 
        ? `Create the interactive cinema master bible based on this premise: "${customPrompt}". Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options in ENGLISH.`
        : `Create a high-tension interactive sci-fi cyberpunk noir thriller. Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options in ENGLISH.`;

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
        
        const firstStepSubtitles = parsed.firstStep.subtitles || [
          {
            start: 1.0,
            end: 14.0,
            speaker: parsed.characters[0]?.name || "Protagonist",
            text: parsed.firstStep.dialogueSnippet || "Protocol engaged. The choice belongs to you.",
            textEs: "Protocolo iniciado. La elección les pertenece."
          }
        ];

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
            subtitles: firstStepSubtitles,
            duration: 15,
            votingWindowSeconds: 10,
            options: parsed.firstStep.options.map((opt: DecisionOption) => ({ ...opt, votes: 0 })),
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            createdAt: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.warn("DeepSeek API error, falling back to cinematic mockup:", error);
    }
  }

  // Fallback Mockup Generator in English with Blockbuster Genre Rotation
  const rotationIndex = getNextBlockbusterRotationIndex();
  const preset = PRESET_STORIES[rotationIndex] || PRESET_STORIES[0];
  const firstChar = preset.characters[0];
  const firstProp = preset.props[0];

  const firstStep: MovieStep = {
    stepNumber: 1,
    title: (preset as any).firstStepTitle || "The Opening Gambit",
    synopsis: (preset as any).firstStepSynopsis || preset.initialPlot.slice(0, 180),
    dialogueSnippet: (preset as any).firstStepDialogue || `${firstChar.name}: 'The destiny of this world begins right now.'`,
    subtitles: (preset as any).firstStepSubtitles || [
      {
        start: 1.0,
        end: 7.0,
        speaker: firstChar.name,
        text: "The choice has been forged in silence. Now we decide.",
        textEs: "La elección se ha forjado en silencio. Ahora decidimos."
      },
      {
        start: 7.5,
        end: 14.0,
        speaker: firstChar.name,
        text: "Ten seconds before the path is sealed forever.",
        textEs: "Diez segundos antes de que el camino quede sellado para siempre."
      }
    ],
    voiceDirection: firstChar.voicePrompt,
    visualPrompt: `Cinematic masterpiece shot of ${firstChar.name} (${firstChar.visualTraits}) holding ${firstProp.name} in ${preset.environments[0].name}, ${preset.environments[0].lighting}, ${preset.cinematicStyle}, photorealistic 8k, IMAX anamorphic framing`,
    cameraMotionPrompt: "Slow tracking camera dollying in with dramatic cinematic depth of field and anamorphic lens flares, 24fps",
    videoUrl: (preset as any).videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: 15,
    votingWindowSeconds: 10,
    activeCharacters: [firstChar.id],
    activeProps: [firstProp.id],
    propReferenceImages: firstProp.imageUrl ? [firstProp.imageUrl] : [],
    environment: preset.environments[0].id,
    createdAt: new Date().toISOString(),
    options: (preset as any).options || [
      {
        id: "A",
        title: "Claim the Initiative",
        text: `${firstChar.name} executes an aggressive offensive strike to seize the upper hand.`,
        dramaticHook: "High-risk direct confrontation.",
        expectedConsequence: "Maximum dramatic tension with immediate fallout.",
        votes: 0
      },
      {
        id: "B",
        title: "Tactical Withdrawal",
        text: `${firstChar.name} conceals their presence to outmaneuver the enemy in the shadows.`,
        dramaticHook: "Unlocks clandestine intelligence pathways.",
        expectedConsequence: "Strategic advantage at the expense of territory.",
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
  previousStep: MovieStep,
  audienceComments?: ChatMessage[]
): Promise<MovieStep> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const nextStepNum = previousStep.stepNumber + 1;
  const chosenOption = previousStep.options.find(o => o.id === chosenOptionId) || previousStep.options[0];

  const audienceSuggestionsText = audienceComments && audienceComments.length > 0
    ? `\n\nLIVE AUDIENCE CHAT SUGGESTIONS & TOP-VOTED IDEAS (Last 30 seconds):
${audienceComments.map(c => `- @${c.userName} (Votes: ${c.votesCount || 0}): "${c.text}"`).join('\n')}

AUDIENCE INSPIRATION DIRECTIVE:
The interactive audience has posted the above comments and ideas in the live chat during the last 30 seconds.
Carefully review their suggestions. If any comment features an intriguing twist, clever dialogue idea, or dramatic escalation that complements the winning option (${chosenOptionId}: "${chosenOption.title}"), incorporate or be inspired by this audience concept to give a surprising twist to this scene while maintaining film continuity!`
    : '';

  if (apiKey) {
    try {
      const systemPrompt = `You are an elite Interactive Cinema AI Director. The film spans a coherent 100-step arc.
The audience just voted for OPTION ${chosenOptionId}: "${chosenOption.title}" (${chosenOption.text}).
You are generating STEP ${nextStepNum} of 100 (exactly a 15-second cinematic clip for MiniMax H3-Max in 480p 16:9).

CRITICAL REQUIREMENTS:
1. ALL OUTPUT MUST BE IN ENGLISH. Every field, title, synopsis, dialogue snippet, subtitle, option, and hook must be in evocative, cinematic English.
2. SUBTITLES: Include timed "subtitles" array (start, end, speaker, text in English, and optional textEs translation in Spanish).
3. PROPS & CHARACTERS: Props are NEVER created arbitrarily. They are created ONLY when the narrative introduces a NEW CHARACTER to the story:
   - If a new character enters in this step (informant, enforcer, rogue AI, fixer, operative), define "newCharacter" (with immutable acoustic voicePrompt in English) AND SIMULTANEOUSLY define their signature "newProp" (their weapon, gadget, or device essential for visual consistency).
   - If no new character enters in this step, both "newCharacter" and "newProp" must be null.
4. ONLY NECESSARY PROPS: In "activeProps", include ONLY the specific prop IDs that physically appear or are actively manipulated on screen in this specific 15-second shot. DO NOT pass all movie props. If the scene is pure dialogue or movement without an on-screen prop, "activeProps" MUST be empty []. Passing unnecessary props degrades video generation quality.

Respond ONLY with valid JSON:
{
  "stepNumber": ${nextStepNum},
  "title": "Scene Title in English",
  "synopsis": "Action taking place during these 15 seconds in English",
  "dialogueSnippet": "Short spoken line or voiceover in English",
  "subtitles": [
    {
      "start": 1.0,
      "end": 7.0,
      "speaker": "Speaker Name",
      "text": "First spoken line in English...",
      "textEs": "Línea en español..."
    },
    {
      "start": 7.5,
      "end": 14.0,
      "speaker": "Speaker Name",
      "text": "Second spoken line in English...",
      "textEs": "Segunda línea en español..."
    }
  ],
  "voiceDirection": "Vocal direction in English based on the speaking character's voicePrompt",
  "visualPrompt": "Cinematic visual prompt in English for fal.ai minimax/h3-max with consistency tokens",
  "cameraMotionPrompt": "Cinematic camera movement in English (dolly, pan, tracking, lens specs)",
  "activeCharacters": ["char_kael"],
  "activeProps": [], // ONLY include prop IDs if actively held or visible in these 15 seconds! Otherwise empty [].
  "newCharacter": null, 
  "newProp": null,
  "environment": "env_sublevel",
  "options": [
    {
      "id": "A",
      "title": "Option A Short Title in English",
      "text": "Proposed immediate action in English",
      "dramaticHook": "Suspense hook in English",
      "expectedConsequence": "Estimated consequence if Option A wins"
    },
    {
      "id": "B",
      "title": "Option B Short Title in English",
      "text": "Radical alternative action in English",
      "dramaticHook": "Suspense hook in English",
      "expectedConsequence": "Estimated consequence if Option B wins"
    }
  ]
}`;

      const userContext = `Film: "${movie.title}".
Master plot: "${movie.initialPlot}".
Previous step (${previousStep.stepNumber}): "${previousStep.synopsis}".
Previous video URL reference: "${previousStep.videoUrl}".
Audience-voted winning option: "${chosenOption.text}" (Expected consequence: ${chosenOption.expectedConsequence}).
Existing characters: ${JSON.stringify(movie.bible.characters.map(c => ({ id: c.id, name: c.name, role: c.role })))};
Existing props: ${JSON.stringify(movie.bible.props.map(p => ({ id: p.id, name: p.name, owner: p.ownerCharacterName })))};${audienceSuggestionsText}`;

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

        // Collect prop reference images ONLY for props actively needed in this scene
        const activePropIds: string[] = parsed.activeProps || [];
        const availableProps = [...movie.bible.props];
        if (newProp) availableProps.push(newProp);

        const propReferenceImages = availableProps
          .filter(p => activePropIds.includes(p.id))
          .map(p => p.imageUrl)
          .filter(Boolean) as string[];

        const stepSubtitles = parsed.subtitles || [
          {
            start: 1.0,
            end: 14.0,
            speaker: parsed.activeCharacters?.[0] || "Character",
            text: parsed.dialogueSnippet || "We must choose our path immediately.",
            textEs: "Debemos elegir nuestro camino de inmediato."
          }
        ];

        return {
          stepNumber: nextStepNum,
          title: parsed.title,
          synopsis: parsed.synopsis,
          dialogueSnippet: parsed.dialogueSnippet,
          subtitles: stepSubtitles,
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

  // Procedural Mockup Generator: Introduces a new character & its associated prop ONLY at critical narrative turns (e.g. step 4)
  const char = movie.bible.characters[0] || { 
    name: "Kael Vane", 
    visualTraits: "cyborg detective with cyan eye",
    voicePrompt: "Gritty, deep 34-year-old baritone with deliberate cadence and subtle laryngeal buzz"
  };
  const prop = movie.bible.props[0] || { 
    id: "prop_neural_drive",
    name: "Zero Neural Prism", 
    visualAppearance: "obsidian prism with amber glow",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"
  };

  let newCharacter: Character | undefined = undefined;
  let newProp: Prop | undefined = undefined;

  // Trigger introduction of a new character & associated prop specifically when narrative demands (e.g., Step 4 introduces Zack Mercer with his Cyber-Deck)
  if (nextStepNum === 4 && !movie.bible.characters.some(c => c.id === "char_informant_zack")) {
    newCharacter = {
      id: "char_informant_zack",
      name: "Zack Mercer",
      role: "Clandestine Cyber-Infiltrator",
      visualTraits: "26yo male, refractive prism hood, cybernetic augmented reality visor over eyes, nervous twitch",
      clothing: "Waterproof insulated duster with embedded receiver antennas along sleeves",
      personality: "Paranoid, razor-sharp, broker of high-level classified intelligence",
      voiceStyle: "Whispered, rapid-fire, digitally masked vocal timbre",
      voicePrompt: "Tense 26-year-old whispery tenor, conspiratorial rapid cadence, slight vocoder modulation altering sibilants, atmosphere of relentless surveillance paranoia.",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
      stepIntroduced: nextStepNum
    };

    newProp = {
      id: "prop_spectral_deck",
      name: "Spectre-7 Cyberdeck",
      description: "Custom military-grade hardware rig for piercing encrypted mainframe firewalls.",
      visualAppearance: "Angular bakelite and carbon-fiber casing with phosphor green backlit mechanical keys and fold-out antenna",
      narrativeSignificance: "Enables Zack to override OmniaTech blast doors in real-time.",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
      stepIntroduced: nextStepNum,
      ownerCharacterId: newCharacter.id,
      ownerCharacterName: newCharacter.name,
      icon: "laptop"
    };
  }
  
  const stepTitles = [
    "Quantum Resonance in Shadows",
    "Monorail Crossfire",
    "The OmniaTech Breach",
    "Encounter with Zack Mercer",
    "Spire Infiltration",
    "Lyra's Fragmented Signal",
    "Emergency Cryo-Protocol",
    "Enforcer Ambush",
    "Downloading the Forbidden Mesh",
    "Level Zero Threshold"
  ];

  const titleIndex = (nextStepNum - 1) % stepTitles.length;
  const currentTitle = nextStepNum === 4 
    ? "Encounter with Zack Mercer"
    : `${stepTitles[titleIndex]} (Phase ${Math.ceil(nextStepNum / 10)})`;

  let synopsis = "";
  let visualPrompt = "";
  let optionA: DecisionOption;
  let optionB: DecisionOption;
  let subtitles: SubtitleCue[] = [];

  if (newCharacter && newProp) {
    synopsis = `In this critical junction, ${char.name} meets in the steam-choked shadows with ${newCharacter.name}, who boots up his ${newProp.name} to decipher the orbital spire telemetry.`;
    visualPrompt = `Cinematic shot of ${char.name} (${char.visualTraits}) meeting ${newCharacter.name} (${newCharacter.visualTraits}) in a steam-filled ventilation shaft, ${newCharacter.name} holding ${newProp.name} (${newProp.visualAppearance}), green neon reflections, 480p 16:9 film`;
    subtitles = [
      {
        start: 1.0,
        end: 7.0,
        speaker: newCharacter.name,
        text: `If OmniaTech catches me with this ${newProp.name}, my life is forfeit before dawn.`,
        textEs: `Si OmniaTech me atrapa con este ${newProp.name}, mi vida no vale nada antes del amanecer.`
      },
      {
        start: 8.0,
        end: 14.0,
        speaker: char.name,
        text: "Sync the prism. We have less than ten seconds.",
        textEs: "Sincroniza el prisma. Nos quedan menos de diez segundos."
      }
    ];
    optionA = {
      id: "A",
      title: `Trust ${newCharacter.name}`,
      text: `${char.name} hands over the prism to ${newCharacter.name} to interface directly with his ${newProp.name}.`,
      dramaticHook: "Is Zack a genuine ally or a deep-cover corporate mole?",
      expectedConsequence: "Immediate cryptographic access to the orbital freight elevator.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Maintain Tactical Leverage",
      text: `${char.name} refuses to surrender the artifact and demands that Zack unlock the blast doors first.`,
      dramaticHook: "Armed Mexican standoff in the tight ventilation shaft.",
      expectedConsequence: "Zack complies under duress, but fragile trust is shattered.",
      votes: 0
    };
  } else if (chosenOptionId === 'A') {
    synopsis = `Following the decision to ${chosenOption.title.toLowerCase()}, ${char.name} gains a temporary tactical edge. Biometric telemetry exposes a hidden conduit as the ${prop.name} emits an ultrasonic pulse.`;
    visualPrompt = `Dramatic cinema shot of ${char.name} (${char.visualTraits}) interacting with ${prop.name} (${prop.visualAppearance}), neon sparks, intense cyberpunk action, volumetric lighting, 480p 16:9 anamorphic film`;
    subtitles = [
      {
        start: 1.0,
        end: 7.0,
        speaker: char.name,
        text: "The data matrix is unlocking... It's pointing straight to the orbital relay.",
        textEs: "La matriz de datos se está desbloqueando... Apunta directo al enlace orbital."
      },
      {
        start: 7.5,
        end: 14.0,
        speaker: char.name,
        text: "Security grid triggered. Time to make our move.",
        textEs: "Red de seguridad activada. Es hora de movernos."
      }
    ];
    optionA = {
      id: "A",
      title: "Override the Blast Gate",
      text: `${char.name} overcharges the access junction to force entry before the biometric scanner locks down.`,
      dramaticHook: "Full alarm broadcast across the sector or ghost entry into the sub-grid.",
      expectedConsequence: "Rapid breach with imminent lockdown risk.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Deploy Diversionary Pulse",
      text: `${char.name} hurls an electromagnetic pulse canister at the transformer to blackout three city blocks.`,
      dramaticHook: "Plunges the district into pitch blackness, blinding patrol gunships.",
      expectedConsequence: "Provides silent stealth evacuation through shadows.",
      votes: 0
    };
  } else {
    synopsis = `Following the choice to ${chosenOption.title.toLowerCase()}, armed confrontation erupts. Hunter-killer drones saturate the alley with targeting lasers as the squad scrambles for cover.`;
    visualPrompt = `Action cinematic sequence of ${char.name} (${char.visualTraits}) in evasive tactical maneuver, muzzle flash in rain, flying sparks, high velocity cinematography, neon reflections`;
    subtitles = [
      {
        start: 1.0,
        end: 7.0,
        speaker: char.name,
        text: "They've got us pinned! Cover the crossfire corridor!",
        textEs: "¡Nos tienen acorralados! ¡Cubran el pasillo de fuego cruzado!"
      },
      {
        start: 7.5,
        end: 14.0,
        speaker: char.name,
        text: "Decide: extraction ship or subterranean tunnels?",
        textEs: "Decidan: ¿nave de extracción o túneles subterráneos?"
      }
    ];
    optionA = {
      id: "A",
      title: "Call Clandestine Extraction",
      text: `Transmit an encrypted distress beacon to Dr. Lyra Chen for immediate aerial extraction.`,
      dramaticHook: "Can Lyra arrive before the gunships deliver a lethal barrage?",
      expectedConsequence: "Arrival of a low-altitude stealth dropship.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Descend into Cryo-Tunnels",
      text: `Slide down the liquid coolant conduit into the decommissioned Cold War service catacombs.`,
      dramaticHook: "Sub-zero temperatures and uncharted bio-mechanical mutations.",
      expectedConsequence: "Thermal-shielded escape route evading all drone sensors.",
      votes: 0
    };
  }

  // Pass ONLY the props strictly necessary for this specific 15-second scene
  let activeProps: string[] = [];
  let activePropImages: string[] = [];

  if (newCharacter && newProp) {
    // Only Zack's custom cyberdeck is actively on screen and manipulated
    activeProps = [newProp.id];
    activePropImages = [newProp.imageUrl].filter(Boolean) as string[];
  } else if (chosenOptionId === 'A') {
    // Only the neural prism is actively interacting with the biometric lock
    activeProps = [prop.id];
    activePropImages = [prop.imageUrl].filter(Boolean) as string[];
  } else {
    // Tactical evasion / shootout in shadows: No specific gadget on screen
    activeProps = [];
    activePropImages = [];
  }

  return {
    stepNumber: nextStepNum,
    title: currentTitle,
    synopsis,
    dialogueSnippet: newCharacter 
      ? `${newCharacter.name}: 'If OmniaTech catches me with this ${newProp?.name}, my life is forfeit before dawn.'`
      : `${char.name}: 'The choices made right here are rewriting the city's living code.'`,
    subtitles,
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
    activeProps,
    newCharacter,
    newProp,
    environment: "env_sublevel",
    createdAt: new Date().toISOString()
  };
}

export async function generateMovieFinalSummaryWithDeepSeek(movie: Movie): Promise<{ finalSummary: string; finalSynopsis: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (apiKey) {
    try {
      const systemPrompt = `You are an elite Hollywood Film Director and Film Scholar. The interactive film "${movie.title}" has just concluded its 100-step arc, created and voted upon live by the audience.
Your mission is to generate:
1. "finalSynopsis": A definitive, thrilling master synopsis (2-3 paragraphs in ENGLISH) summarizing the full story created by the audience.
2. "finalSummary": A detailed retrospective breakdown in ENGLISH (divided into Act I: The Catalyst & The Breach, Act II: Divergent Alliances & Shadow Warfare, and Act III: The Zenith Climax & Liberation), celebrating the characters introduced, key props utilized, and the philosophical weight of the audience's choices.

Respond ONLY with a valid JSON object:
{
  "finalSynopsis": "Definitive master synopsis in English...",
  "finalSummary": "Comprehensive narrative retrospective in English..."
}`;

      const userContent = `Title: "${movie.title}"
Initial Plot: "${movie.initialPlot}"
Total Steps Completed: ${movie.steps.length}
Characters in story: ${movie.bible.characters.map(c => `${c.name} (${c.role})`).join(', ')}
Key props used: ${movie.bible.props.map(p => `${p.name} (${p.narrativeSignificance})`).join(', ')}
Major milestones: ${movie.steps.slice(0, 15).map(s => `Step ${s.stepNumber}: Option ${s.selectedOption} won (${s.title})`).join(' | ')}...`;

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
            { role: "user", content: userContent }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0]?.message?.content);
        return {
          finalSynopsis: parsed.finalSynopsis || movie.initialPlot,
          finalSummary: parsed.finalSummary || "The film successfully concluded its community-driven 100-step cinematic odyssey."
        };
      }
    } catch (e) {
      console.warn("DeepSeek final summary generation error, using procedural summary:", e);
    }
  }

  // Procedural Retrospective Generator in English
  const charNames = movie.bible.characters.map(c => c.name).join(' and ');
  const propNames = movie.bible.props.map(p => p.name).join(', ');

  const finalSynopsis = `Across 100 real-time narrative branches shaped live by the audience, "${movie.title}" chronicles the pulse-pounding odyssey of ${charNames} in a race against extinction across the dystopian city. Forced to choose at every turn between calculated stealth and explosive open warfare, the protagonists confronted totalitarian corporate control armed with the ${propNames}, culminating in the definitive liberation of human free will.`;

  const finalSummary = `### Cinematic Retrospective & Narrative Arc
**Act I: The Catalyst & The Quantum Breach**
The story ignited in the drenched gutters of Sub-Level 4, where detective Kael Vane discovered the Zero Neural Prism. When the audience voted to decrypt the data matrix under fire, a relentless manhunt by OmniaTech hunter-killer drones was unleashed, setting the stakes for survival.

**Act II: Divergent Alliances in the Shadows**
The integration of new clandestine allies reshaped the balance of power. At key turning points, the arrival of operatives equipped with custom hardware allowed the team to bypass security blast doors and decode corporate encryption keys. Every vote continuously tested loyalties and redrew the tactical landscape.

**Act III: The Zenith Climax at the Orbital Spire**
In the final confrontation, the audience made the ultimate high-risk gamble: detonating the quantum overload at the root of the planetary syndicate. The city's surveillance network shattered, etching the legend of the heroes guided step-by-step by the collective audience into cinematic history.`;

  return {
    finalSynopsis,
    finalSummary
  };
}
