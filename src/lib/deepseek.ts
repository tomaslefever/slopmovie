import { Character, Prop, SceneEnvironment, MovieBible, MovieStep, DecisionOption, Movie, SubtitleCue, BlockbusterCandidate, TOTAL_STEPS } from '@/types/cinema';
import {
  CINEMATIQUE_SYSTEM_PROMPT_DIRECTIVES,
  CINEMATIQUE_AESTHETIC_PRESETS,
  getUniqueCinematiqueAesthetics
} from './cinematique';

// ── Token usage tracking (process-cumulative) ───────────────────────────────
let cumulativePromptTokens = 0;
let cumulativeCompletionTokens = 0;

export function getDeepseekTokenUsage(): { promptTokens: number; completionTokens: number } {
  return { promptTokens: cumulativePromptTokens, completionTokens: cumulativeCompletionTokens };
}

function trackDeepseekUsage(label: string, usage?: { prompt_tokens?: number; completion_tokens?: number } | null): void {
  if (!usage) return;
  cumulativePromptTokens += usage.prompt_tokens || 0;
  cumulativeCompletionTokens += usage.completion_tokens || 0;
  console.log(`[DeepSeek/NVIDIA tokens] ${label}: prompt=${usage.prompt_tokens ?? '?'} completion=${usage.completion_tokens ?? '?'} (cumulative: ${cumulativePromptTokens}/${cumulativeCompletionTokens})`);
}

// ── NVIDIA NIM / LLM Configuration ──────────────────────────────────────────
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "deepseek-ai/deepseek-v4-pro-0813";

export function getLlmApiKey(): string | undefined {
  const key = process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY;
  return key?.trim() || undefined;
}

export function getLlmEndpoint(): string {
  const custom = process.env.DEEPSEEK_BASE_URL || process.env.NVIDIA_BASE_URL;
  if (!custom) {
    return `${NVIDIA_BASE_URL}/chat/completions`;
  }
  const clean = custom.trim().replace(/\/+$/, '');
  return clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
}

export function getLlmModel(): string {
  return process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
}

export function cleanAndParseJson<T = any>(raw: string): T {
  let cleaned = (raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

export interface CallLlmParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  seed?: number;
  response_format?: { type: string };
  label: string;
}

export async function callLlmJson<T = any>(params: CallLlmParams): Promise<T | null> {
  const apiKey = getLlmApiKey();
  if (!apiKey) return null;

  const endpoint = getLlmEndpoint();
  const model = getLlmModel();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 1,
        top_p: params.top_p ?? 0.95,
        max_tokens: params.max_tokens ?? 16384,
        seed: params.seed ?? 42,
        chat_template_kwargs: { thinking: false },
        response_format: params.response_format ?? { type: "json_object" },
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(`[NVIDIA LLM ${params.label}] HTTP ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json();
    trackDeepseekUsage(params.label, data.usage);
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    return cleanAndParseJson<T>(content);
  } catch (err) {
    console.warn(`[NVIDIA LLM ${params.label}] Request or parsing error:`, err);
    return null;
  }
}

export interface GeneratedStoryBible {
  title: string;
  genre: string;
  tagline: string;
  initialPlot: string;
  masterArcThread: string;
  bible: MovieBible;
  firstStep: MovieStep;
  initialSteps: MovieStep[]; // 4 initial scenes forming 1 minute of uninterrupted first-shot
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
    initialPlot: "In Neo-Sector 9, cybernetically augmented detective Kael Vane intercepts a forbidden quantum data prism capable of destabilizing the planetary neural syndicate OmniaTech. Pursued by corporate assassin squads and underground faction The Silent Breach, Kael must navigate 50 critical decisions shaped in real-time by the audience.",
    masterArcThread: "Gradual dismantling of the OmniaTech orbital syndicate across 50 community-voted milestones, from the subterranean gutters of Sub-Level 4 to the orbital spire.",
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
    masterArcThread: "A 50-step journey across the desecrated kingdoms of Eldoria, reforging the shattered imperial crown before the Eclipse of the Seven Moons consumes mortal kind.",
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
    masterArcThread: "Deciphering the celestial origin of consciousness across 50 deep-space orbital encounters, navigating black hole distortions and rogue artificial sentinels.",
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
  const apiKey = getLlmApiKey();

  if (apiKey) {
    try {
      const systemPrompt = `You are an elite Hollywood Director, Master Cinematographer and Screenwriter specializing in interactive sci-fi cinematic universes with strict visual and audio continuity.
Your mission is to formulate a MASTER STORY AND ART BIBLE for a 50-step interactive live cinema film.

${CINEMATIQUE_SYSTEM_PROMPT_DIRECTIVES}

MANDATORY RULES:
1. ALL OUTPUT MUST BE IN ENGLISH. Every field, title, synopsis, character description, voice prompt, prop, dialogue, subtitle, visualPrompt, cameraMotionPrompt, and option must be written in high-caliber cinematic English.
2. VOICE CONTINUITY: Every character must have an immutable "voicePrompt" (timbre, frequency, pacing, breathing, accent, audio processing) so audio engines synthesize the exact same voice across all 50 clips.
3. PROPS & CHARACTERS: Every initial character must have their signature linked prop (ownerCharacterId) for consistent visual prompting.
4. SUBTITLES: The first step must include timed "subtitles" (start in seconds, end in seconds, speaker, text in English, and optional textEs in Spanish).
5. ONLY NECESSARY PROPS: In "firstStep.activeProps", specify ONLY the prop ID(s) that are physically visible or actively held/used in this opening 15-second scene. DO NOT pass all props. If no prop is visible in the shot, "activeProps" must be empty [].
6. NARRATIVE ARC: The 50-step film follows a strict act structure that every step must respect — steps 1-10 SETUP (present the world, the characters and the central problem), steps 11-39 DEVELOPMENT (escalating conflict, twists and new characters), steps 40-49 DENOUEMENT (converging resolution), and step 50 THE END (definitive closing scene, no new conflicts). "masterArcThread" and "initialPlot" must be designed so the story can be resolved by step 50.
7. CINEMATIQUE CAMERA & LIGHTING FIDELITY:
   - "cinematicStyle": Must specify the camera package, lenses (e.g. Panavision C-Series anamorphic, Cooke S4/S7, Zeiss Master Prime), lighting setup (e.g. Caravaggio chiaroscuro, Rembrandt key, motivated practical neon, Kelvin color temperature), and film stock (e.g. Kodak Vision3 500T, Kodak Double-X).
   - "visualPrompt": Every scene prompt MUST follow the 6-layer Cinematique formula: [Shot Scale/Framing (MCU, Cowboy, ECU, Choker, Low-Angle)] + [Subject & Wardrobe] + [Environment with Foreground/Mid/Background Depth] + [Lighting Rig & Kelvin Temperature] + [Camera Lens, Sensor/Stock & Flare Characteristics] + [Atmosphere & 24fps film still].
   - "cameraMotionPrompt": Every camera motion prompt MUST follow the 4-layer Cinematique motion formula: [Rig & Movement (Steadicam glide, slow dolly push-in, lateral track with 3-layer parallax, Technocrane arc, Dolly zoom vertigo)] + [Pacing & Trajectory] + [Focal Length & Focus Pull/Rack Focus] + [Optical physics & 24fps motion blur].

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Compelling Cinematic Title in English",
  "genre": "Sci-Fi / Cyberpunk Thriller",
  "tagline": "Intriguing Hook in English",
  "initialPlot": "Full master narrative arc in English that serves as the spine for 50 steps",
  "masterArcThread": "Core story trajectory in English that evolves with audience choices",
  "cinematicStyle": "Exact camera package, lenses, lighting scheme (Kelvin temp), film stock and color grade in English",
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
  "initialSteps": [
    {
      "stepNumber": 1,
      "title": "Title of Scene 1 (0-15s): The Inciting Incident",
      "synopsis": "High-impact visual opening introducing protagonist, world hook, and initial action in English",
      "dialogueSnippet": "Spoken dialogue or voiceover in English",
      "subtitles": [
        { "start": 1.0, "end": 7.0, "speaker": "Character Name", "text": "English line...", "textEs": "Spanish translation..." },
        { "start": 8.0, "end": 14.0, "speaker": "Character Name", "text": "English continuation...", "textEs": "Spanish translation..." }
      ],
      "voiceDirection": "Acoustic direction in English based on character voicePrompt",
      "visualPrompt": "Cinematique 6-layer prompt: [Establishing / Low-Angle Shot] + [Protagonist & signature attire] + [Opening environment with deep spatial layers] + [Key lighting setup, practical sources & Kelvin temp] + [Camera package: 35mm Panavision anamorphic / Cooke S4, Kodak Vision3 500T] + [Atmospheric particles, mist, 24fps film still]",
      "cameraMotionPrompt": "Cinematique 4-layer motion prompt: [Technocrane or Steadicam tracking glide] + [Smooth trajectory introducing setting] + [Anamorphic lens optics with oval bokeh] + [24fps cinematic motion blur]",
      "activeCharacters": ["char_1"],
      "activeProps": ["prop_1"],
      "environment": "env_1",
      "options": []
    },
    {
      "stepNumber": 2,
      "title": "Title of Scene 2 (15-30s): Rising Tension",
      "synopsis": "Continuous action unfolding in seconds 15-30 as complications or hostile forces approach",
      "dialogueSnippet": "Urgent dialogue or radio communication in English",
      "subtitles": [
        { "start": 1.0, "end": 7.0, "speaker": "Character Name", "text": "English line...", "textEs": "Spanish translation..." },
        { "start": 8.0, "end": 14.0, "speaker": "Character Name", "text": "English continuation...", "textEs": "Spanish translation..." }
      ],
      "voiceDirection": "Acoustic direction in English based on character voicePrompt",
      "visualPrompt": "Cinematique 6-layer prompt: [Cowboy Shot or Dynamic Medium Shot] + [Character coiled readiness] + [Immediate architectural breach or hazard] + [Cross-lighting or Chiaroscuro high-contrast shadows] + [Panavision / Cooke lens character with streak flare] + [Volumetric steam and rich color grading]",
      "cameraMotionPrompt": "Cinematique 4-layer motion prompt: [Lateral tracking shot on rails or fluid Steadicam] + [Parallel movement keeping pace with action] + [3-layer parallax foreground blur] + [24fps motion blur]",
      "activeCharacters": ["char_1"],
      "activeProps": [],
      "environment": "env_1",
      "options": []
    },
    {
      "stepNumber": 3,
      "title": "Title of Scene 3 (30-45s): Point of Escalation",
      "synopsis": "Continuous action in seconds 30-45 where the perimeter breaches or the mystery intensifies",
      "dialogueSnippet": "Tense spoken dialogue in English",
      "subtitles": [
        { "start": 1.0, "end": 7.0, "speaker": "Character Name", "text": "English line...", "textEs": "Spanish translation..." },
        { "start": 8.0, "end": 14.0, "speaker": "Character Name", "text": "English continuation...", "textEs": "Spanish translation..." }
      ],
      "voiceDirection": "Acoustic direction in English based on character voicePrompt",
      "visualPrompt": "Cinematique 6-layer prompt: [Over-the-Shoulder or Macro Insert Shot on Key Prop] + [Character micro-tension or prop physical patina] + [Encroaching perimeter backdrop] + [Hard directional gobo light or flickering warning pulse] + [Macro lens or 85mm prime wide open] + [Airborne embers, lens halation, 24fps film still]",
      "cameraMotionPrompt": "Cinematique 4-layer motion prompt: [Rapid whip-pan snap or deliberate 2-second rack focus] + [Transitioning from foreground prop to background threat] + [Creamy bokeh separation] + [Dynamic 24fps motion blur]",
      "activeCharacters": ["char_1"],
      "activeProps": ["prop_1"],
      "environment": "env_1",
      "options": []
    },
    {
      "stepNumber": 4,
      "title": "Title of Scene 4 (45-60s): Climax of First-Shot & Interactive Dilemma",
      "synopsis": "Climactic action in seconds 45-60 culminating in the first critical decision dilemma for the audience",
      "dialogueSnippet": "Climactic dialogue before voting in English",
      "subtitles": [
        { "start": 1.0, "end": 7.0, "speaker": "Character Name", "text": "English line...", "textEs": "Spanish translation..." },
        { "start": 8.0, "end": 14.0, "speaker": "Character Name", "text": "English choice hook...", "textEs": "Spanish translation..." }
      ],
      "voiceDirection": "Acoustic direction in English based on character voicePrompt",
      "visualPrompt": "Cinematique 6-layer prompt: [Choker Shot or Dramatic Dutch Angle Close-Up] + [Peak emotional conflict in character eyes] + [Imminent explosive or tactical threshold] + [Caravaggio Chiaroscuro or Rembrandt triangle key with eye catchlights] + [35mm anamorphic glass, subtle barrel distortion] + [Epic tension, deep blacks, high-contrast film still]",
      "cameraMotionPrompt": "Cinematique 4-layer motion prompt: [Imperceptibly slow dolly push-in or Vertigo zolly effect] + [Closing from medium to tight choker over 15s] + [Narrowing depth of field, focus breathing] + [180-degree shutter, 24fps motion blur]",
      "activeCharacters": ["char_1"],
      "activeProps": ["prop_1"],
      "environment": "env_1",
      "options": [
        {
          "id": "A",
          "title": "Option A Title in English",
          "text": "First bold choice the audience can make",
          "dramaticHook": "Dramatic hook for Option A",
          "expectedConsequence": "Narrative consequence if Option A wins"
        },
        {
          "id": "B",
          "title": "Option B Title in English",
          "text": "Radically different alternative choice",
          "dramaticHook": "Dramatic hook for Option B",
          "expectedConsequence": "Narrative consequence if Option B wins"
        }
      ]
    }
  ]
}`;

      const userMessage = customPrompt 
        ? `Create the interactive cinema master bible and the 4 opening scenes (1-minute continuous first-shot) based on this premise: "${customPrompt}". Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options for Scene 4 in ENGLISH.`
        : `Create a high-tension interactive sci-fi cyberpunk noir thriller master bible and the 4 opening scenes (1-minute continuous first-shot). Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options for Scene 4 in ENGLISH.`;

      const parsed = await callLlmJson<any>({
        label: 'story-bible',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 1,
        max_tokens: 16384
      });

      if (parsed) {
        
        const rawSteps = Array.isArray(parsed.initialSteps) && parsed.initialSteps.length > 0
          ? parsed.initialSteps
          : [parsed.firstStep || {}];

        const initialSteps: MovieStep[] = rawSteps.slice(0, 4).map((stepData: any, idx: number) => {
          const stepNum = idx + 1;
          const isFinalFirstShot = stepNum === 4;

          const defaultSubtitles = [
            {
              start: 1.0,
              end: 14.0,
              speaker: parsed.characters[0]?.name || "Protagonist",
              text: stepData.dialogueSnippet || `Scene ${stepNum} sequence engaged.`,
              textEs: `Secuencia de escena ${stepNum} iniciada.`
            }
          ];

          const options: [DecisionOption, DecisionOption] = isFinalFirstShot && Array.isArray(stepData.options) && stepData.options.length >= 2
            ? [
                { ...stepData.options[0], id: 'A', votes: 0 },
                { ...stepData.options[1], id: 'B', votes: 0 }
              ]
            : [
                { id: 'A', title: 'Advance the Offensive', text: 'Push forward into the breach.', dramaticHook: 'High risk frontal assault.', expectedConsequence: 'Immediate combat escalation.', votes: 0 },
                { id: 'B', title: 'Regroup and Adapt', text: 'Fall back into the defensive perimeter.', dramaticHook: 'Strategic redeployment.', expectedConsequence: 'Preserves resources at cost of tempo.', votes: 0 }
              ];

          return {
            stepNumber: stepNum,
            title: stepData.title || `Scene ${stepNum}: Act I`,
            synopsis: stepData.synopsis || parsed.initialPlot?.slice(0, 180) || "The adventure unfolds.",
            dialogueSnippet: stepData.dialogueSnippet || undefined,
            subtitles: stepData.subtitles || defaultSubtitles,
            voiceDirection: stepData.voiceDirection || parsed.characters[0]?.voicePrompt,
            visualPrompt: stepData.visualPrompt || `Cinematic masterpiece shot of ${parsed.characters[0]?.name || 'Protagonist'} in ${parsed.environments?.[0]?.name || 'Opening environment'}, ${parsed.cinematicStyle || '35mm anamorphic'}`,
            cameraMotionPrompt: stepData.cameraMotionPrompt || "Cinematic camera dolly tracking in with shallow depth of field, 24fps",
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            duration: 15,
            votingWindowSeconds: isFinalFirstShot ? 10 : 0,
            activeCharacters: stepData.activeCharacters || [parsed.characters[0]?.id || "char_1"],
            activeProps: stepData.activeProps || (parsed.props?.[0] ? [parsed.props[0].id] : []),
            environment: stepData.environment || parsed.environments?.[0]?.id || "env_1",
            createdAt: new Date().toISOString(),
            options
          };
        });

        // Ensure we always have exactly 4 steps for the 1-minute first-shot
        while (initialSteps.length < 4) {
          const stepNum = initialSteps.length + 1;
          const isFinal = stepNum === 4;
          initialSteps.push({
            stepNumber: stepNum,
            title: `Prologue Escalation ${stepNum}`,
            synopsis: `Continuous action in second ${(stepNum - 1) * 15}-${stepNum * 15} of the opening sequence.`,
            duration: 15,
            votingWindowSeconds: isFinal ? 10 : 0,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            activeCharacters: [parsed.characters[0]?.id || "char_1"],
            activeProps: parsed.props?.[0] ? [parsed.props[0].id] : [],
            environment: parsed.environments?.[0]?.id || "env_1",
            createdAt: new Date().toISOString(),
            visualPrompt: `Continuous cinematic shot of ${parsed.characters[0]?.name || 'Protagonist'}, ${parsed.cinematicStyle || '35mm anamorphic'}`,
            cameraMotionPrompt: "Dynamic cinematic tracking camera",
            options: [
              { id: 'A', title: 'Option A', text: 'Seize the initiative.', dramaticHook: 'Aggressive choice.', expectedConsequence: 'High stakes outcome.', votes: 0 },
              { id: 'B', title: 'Option B', text: 'Outmaneuver the enemy.', dramaticHook: 'Stealth choice.', expectedConsequence: 'Tactical advantage.', votes: 0 }
            ]
          });
        }

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
          firstStep: initialSteps[0],
          initialSteps
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

  const firstShotTitles = [
    (preset as any).firstStepTitle || "The Opening Gambit",
    "Rising Shadows & The Secondary Breach",
    "Threshold of the Crucible",
    "Point of No Return: The First Choice"
  ];

  const initialSteps: MovieStep[] = [1, 2, 3, 4].map((stepNum) => {
    const isFinal = stepNum === 4;
    return {
      stepNumber: stepNum,
      title: firstShotTitles[stepNum - 1],
      synopsis: `Minute 1 First-Shot (part ${stepNum}/4): ${preset.initialPlot.slice((stepNum - 1) * 60, stepNum * 60) || preset.initialPlot.slice(0, 150)}`,
      dialogueSnippet: stepNum === 1
        ? (preset as any).firstStepDialogue || `${firstChar.name}: 'The destiny of this world begins right now.'`
        : `${firstChar.name}: 'Scene ${stepNum}... keep moving forward.'`,
      subtitles: [
        {
          start: 1.0,
          end: 7.0,
          speaker: firstChar.name,
          text: `First-Shot Sequence ${stepNum}/4: The mission is underway.`,
          textEs: `Secuencia First-Shot ${stepNum}/4: La misión está en marcha.`
        },
        {
          start: 8.0,
          end: 14.0,
          speaker: firstChar.name,
          text: isFinal ? "The first critical decision is upon us." : "Stay focused on the target coordinates.",
          textEs: isFinal ? "La primera decisión crítica está ante nosotros." : "Mantengan el foco en las coordenadas objetivo."
        }
      ],
      voiceDirection: firstChar.voicePrompt,
      visualPrompt: stepNum === 1
        ? `Establishing Low-Angle Hero Shot of ${firstChar.name} (${firstChar.visualTraits}, ${firstChar.clothing}) holding ${firstProp.name} (${firstProp.visualAppearance}) in ${preset.environments[0].name}. Deep architectural perspective, ${preset.environments[0].lighting}. Shot on Panavision C-series 35mm anamorphic glass, oval bokeh, horizontal streak flare, volumetric fog and steam, Kodak Vision3 500T grain, 480p 16:9 film still`
        : stepNum === 2
        ? `Cowboy Shot of ${firstChar.name} (${firstChar.visualTraits}) in coiled tactical posture navigating ${preset.environments[0].name}. Mid-thigh framing with ${firstProp.name} secured, cross-lighting with 3000K amber key and 6500K cool blue rim. Cooke S4/i prime lens warmth, gentle skin roll-off, wet rain reflections, 480p 16:9 film still`
        : stepNum === 3
        ? `Over-the-Shoulder and Macro Insert Shot on ${firstProp.name} (${firstProp.visualAppearance}) as ${firstChar.name} interfaces with it in ${preset.environments[0].name}. Foreground shoulder silhouette softly out of focus, hard gobo light slicing across the artifact, 85mm prime at T2.0, creamy background separation, airborne dust motes, 480p 16:9 film still`
        : `Choker Shot and Dutch Angle Close-Up of ${firstChar.name} (${firstChar.visualTraits}) at peak dramatic threshold in ${preset.environments[0].name}. Forehead to chin tight framing, Caravaggio chiaroscuro lighting leaving deep shadows in eye sockets, eye catchlights, Panavision anamorphic optical character, immense cinematic stakes, 480p 16:9 film still`,
      cameraMotionPrompt: stepNum === 1
        ? "Technocrane crane sweep beginning low on subject then ascending smoothly into a high-angle panoramic reveal of the environment, 24fps motion blur"
        : stepNum === 2
        ? "Smooth lateral dolly tracking shot on rails parallel to subject, three-layer parallax with blurred foreground scaffolding and distant receding buildings, 24fps motion blur"
        : stepNum === 3
        ? "Deliberate 2-second rack focus from foreground prop in razor sharpness to background character eyes, creamy circular bokeh, subtle focus breathing"
        : "Imperceptibly slow dolly push-in closing from medium to intense choker shot over 15 seconds, narrowing depth of field, 180-degree shutter 24fps motion blur",
      videoUrl: (preset as any).videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      duration: 15,
      votingWindowSeconds: isFinal ? 10 : 0,
      activeCharacters: [firstChar.id],
      activeProps: [firstProp.id],
      propReferenceImages: firstProp.imageUrl ? [firstProp.imageUrl] : [],
      environment: preset.environments[0].id,
      createdAt: new Date().toISOString(),
      options: [
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
  });

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
    firstStep: initialSteps[0],
    initialSteps
  };
}

/**
 * Narrative arc directive for a given step number. The 50-step film follows a
 * strict act structure: setup (1-10), development (11-39), denouement (40-49)
 * and THE END at step 50.
 */
export function getNarrativeArcDirective(stepNum: number): string {
  if (stepNum >= TOTAL_STEPS) {
    return `NARRATIVE ARC PHASE — THE END (FINAL SCENE): Step ${TOTAL_STEPS} is the ABSOLUTE and definitive ending of the film. The story reaches its emotional and thematic conclusion HERE: the central conflict is fully resolved, the antagonist's fate is sealed, every loose thread closes, and the film ends with an epic cathartic final image. Do NOT introduce any new conflict, character or cliffhanger. The two voting options are the audience's final artistic choice between two flavors of the closing moment (e.g. bittersweet vs hopeful, sacrifice vs reunion) — BOTH options must still END the story.`;
  }
  if (stepNum >= 40) {
    return `NARRATIVE ARC PHASE — DENOUEMENT / RESOLUTION (steps 40-49, building toward the ending at step ${TOTAL_STEPS}): The story is in its closing act. Conflicts begin to resolve: alliances are tested, secrets are revealed, the antagonist's endgame takes its final form, and stakes become personal and irreversible. Converge every loose thread toward the definitive ending at step ${TOTAL_STEPS}. Each scene raises tension while moving the plot toward its conclusion.`;
  }
  if (stepNum >= 11) {
    return `NARRATIVE ARC PHASE — DEVELOPMENT (steps 11-39): The story is in its middle act. Escalate conflict: complications, betrayals, twists and mid-point reversals. Deepen character relationships and raise the stakes with every scene. New characters and their signature props may be introduced here. Keep every scene connected to the master plot while building momentum toward the final act.`;
  }
  return `NARRATIVE ARC PHASE — SETUP / EXPOSITION (steps 1-10): The story is in its opening act. These scenes must plant the problem and present the situation: introduce the world, the protagonist, the central conflict and the stakes. Establish mood, tone and the rules of the universe. Near step 11 the protagonist must be locked into the main quest at the point of no return.`;
}

/**
 * Audience influence for ONE option of the next step. The comment is consumed
 * at prompt-generation time: the influenced option is conceived FROM the
 * comment's idea, while the other option is generated free of audience input.
 */
export interface CommentInfluence {
  commentId: string;
  userName: string;
  text: string;
  optionId: 'A' | 'B';
}

export async function generateNextStepWithDeepSeek(
  movie: Movie,
  chosenOptionId: 'A' | 'B',
  previousStep: MovieStep,
  commentInfluence?: CommentInfluence
): Promise<MovieStep> {
  const apiKey = getLlmApiKey();
  const nextStepNum = previousStep.stepNumber + 1;
  const chosenOption = previousStep.options.find(o => o.id === chosenOptionId) || previousStep.options[0];

  // The selected comment influences the generation of exactly ONE option:
  // that option is written as the dramatic realization of the audience's idea,
  // the other one follows the pure story logic with no audience input at all.
  const influenceDirective = commentInfluence
    ? `
AUDIENCE INFLUENCE (OPTION ${commentInfluence.optionId} ONLY):
The audience member @${commentInfluence.userName} proposed the idea: "${commentInfluence.text}".
When you GENERATE the two options for this step:
- OPTION ${commentInfluence.optionId} must be conceived directly FROM this audience idea. Its title, text, dramatic hook and expected consequence must make it the branch where the audience's idea becomes reality. Weave the idea into that option's dramatic identity so voters can recognize it.
- OPTION ${commentInfluence.optionId === 'A' ? 'B' : 'A'} must follow the pure cinematic logic of the story with ZERO audience influence — a normal continuation of the narrative, as if no audience idea existed.
The scene content itself must stay neutral and foreshadow BOTH options equally.`
    : '';

  if (apiKey) {
    try {
      // STATIC system prompt (no per-request interpolation): DeepSeek's context
      // caching reuses the cached prefix across all 46+ scene calls, slashing
      // input-token cost. All dynamic content lives in the user message.
      const systemPrompt = `You are an elite Interactive Cinema AI Director writing ONE 15-second scene of a 50-step interactive film for MiniMax H3-Max (480p 16:9).
Rules:
1. ALL output in cinematic ENGLISH.
2. Include timed "subtitles" (start, end, speaker, text EN, textEs ES).
3. Never invent props freely: define "newCharacter" (with voicePrompt) AND their signature "newProp" ONLY when a NEW character enters; otherwise both null.
4. "activeProps": only prop IDs physically visible or manipulated in THIS shot; empty [] otherwise.
5. "activeCharacters": only characters on screen.
6. CINEMATIQUE "visualPrompt": Craft a rich 6-layer visual prompt: [Shot Framing: MCU / Cowboy / ECU / Choker / Low-Angle / OTS] + [Subject & Wardrobe] + [Setting Architecture with Foreground/Mid/Background Depth] + [Lighting: Chiaroscuro / Rembrandt / Motivated practicals / Kelvin Temp] + [Lenses & Stock: Panavision anamorphic oval bokeh / Cooke S4 warmth / Zeiss sharpness / Kodak Vision3 500T grain] + [Atmosphere & 24fps film still].
7. CINEMATIQUE "cameraMotionPrompt": Craft a rich 4-layer camera prompt: [Rig: Steadicam glide / Slow dolly push-in / Lateral track with 3-layer parallax / Technocrane arc / Dolly zoom vertigo] + [Pacing & Trajectory] + [Focal length & Focus pull/Rack focus] + [Optical flare physics & 24fps motion blur].
8. The two voting "options" MUST be a genuinely NEW dilemma every scene: never repeat, re-title or re-skin an option already offered earlier in this film (the previous-options ledger is in the user message). Invent fresh stakes, fresh risks and fresh consequences each time — a voter should never recognize an earlier choice in a new costume.
Respond ONLY with JSON:
{"stepNumber":0,"title":"","synopsis":"","dialogueSnippet":"","subtitles":[{"start":1.0,"end":14.0,"speaker":"","text":"","textEs":""}],"voiceDirection":"","visualPrompt":"","cameraMotionPrompt":"","activeCharacters":["char_id"],"activeProps":[],"newCharacter":null,"newProp":null,"environment":"","options":[{"id":"A","title":"","text":"","dramaticHook":"","expectedConsequence":""},{"id":"B","title":"","text":"","dramaticHook":"","expectedConsequence":""}]}`;

      // Compact ledger of every voting option already offered in this film.
      // Without it the model has no memory of past dilemmas and recycles the
      // same generic binaries (attack vs stealth, trust vs betray) all movie long.
      const usedOptionsLedger = (() => {
        const past = movie.steps
          .filter(s => s.stepNumber < nextStepNum && Array.isArray(s.options) && s.options.length >= 2 && s.options[0]?.title && s.options[1]?.title)
          .slice(-12);
        if (past.length === 0) return 'none yet — this is the first audience vote.';
        return past.map(s =>
          `Step ${s.stepNumber}: A) "${s.options[0].title}"${s.selectedOption === 'A' ? ' [CHOSEN BY AUDIENCE]' : ''} — B) "${s.options[1].title}"${s.selectedOption === 'B' ? ' [CHOSEN BY AUDIENCE]' : ''}`
        ).join('\n');
      })();

      const antiRepeatDirective = `PREVIOUS VOTING OPTIONS ALREADY OFFERED IN THIS FILM (forbidden to repeat — do NOT reuse, re-title or re-skin ANY of these):
${usedOptionsLedger}
For Step ${nextStepNum} invent TWO options that have never appeared in this film: a brand-new dilemma with new stakes, a new risk trade-off and a new consequence. Check the ledger: if one of your two options resembles an earlier one, discard it and invent something genuinely different.`;

      // Compact user message: only the context this scene needs (no bible dump,
      // no video URLs, compact id:name rosters).
      const userContext = `Film: "${movie.title}" (${movie.genre})
Style: ${movie.bible?.cinematicStyle || '35mm Panavision anamorphic, high contrast cinematic'}
Master arc: ${movie.masterArcThread || movie.initialPlot}
${getNarrativeArcDirective(nextStepNum)}
Previous scene ${previousStep.stepNumber} "${previousStep.title}": ${previousStep.synopsis}${previousStep.dialogueSnippet ? ` Dialogue: "${previousStep.dialogueSnippet}"` : ''}
Audience chose OPTION ${chosenOptionId}: "${chosenOption.title}" — ${chosenOption.text}${chosenOption.expectedConsequence ? ` (${chosenOption.expectedConsequence})` : ''}
Characters: ${movie.bible.characters.map(c => `${c.id}:${c.name}(${c.role})`).join('; ') || 'none'}
Props: ${movie.bible.props.map(p => `${p.id}:${p.name}`).join('; ') || 'none'}
${antiRepeatDirective}
${influenceDirective}`;

      const parsed = await callLlmJson<any>({
        label: 'next-step',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext }
        ],
        temperature: 1,
        max_tokens: 16384
      });

      if (parsed) {

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
  let cameraMotionPrompt = "Technocrane high-angle descent transitioning into smooth eye-level Steadicam tracking, fluid cinematic motion, 24fps motion cadence";

  if (newCharacter && newProp) {
    synopsis = `In this critical junction, ${char.name} meets in the steam-choked shadows with ${newCharacter.name}, who boots up his ${newProp.name} to decipher the orbital spire telemetry.`;
    visualPrompt = `Medium two-shot / low-angle cowboy framing: ${char.name} (${char.visualTraits}) meets ${newCharacter.name} (${newCharacter.visualTraits}) in a rain-slicked industrial ventilation conduit. Motivated chiaroscuro with 3200K amber incandescent practicals cutting through thick atmospheric haze and cyan neon backlighting. ${newCharacter.name} boots up ${newProp.name} (${newProp.visualAppearance}), its holographic prism casting vibrant volumetric caustics across their faces. Cooke Anamorphic /i Prime 40mm T2.3, shallow depth of field with oval bokeh, subtle anamorphic flare, Kodak Vision3 500T 5219 texture with organic 35mm grain, photorealistic 16:9 cinematic master.`;
    cameraMotionPrompt = "Lateral dolly track at eye level slowly arcing around the two characters, subtle push-in tightening framing as the device activates, 24fps cinematic cadence";
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
    visualPrompt = `Dutch angle medium close-up tracking shot: ${char.name} (${char.visualTraits}) interfaces urgently with ${prop.name} (${prop.visualAppearance}) against a heavy titanium blast bulkhead. Volumetric cyan light shafts pierce through cascading steam and electric sparks, rimming character silhouettes with razor-sharp edge contrast. ARRI Master Anamorphic 50mm, f/2.0 wide open, high optical contrast, controlled blue horizontal streak flares, deep midnight-teal shadows and warm amber highlights, 35mm film grain, 16:9 cinematic render.`;
    cameraMotionPrompt = "Dynamic handheld Steadicam with subtle camera micro-jitter simulating tension, slow forward push-in toward the terminal interface, 24fps film cadence";
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
    visualPrompt = `High-angle wide shot transitioning to rapid ground-level tracking: ${char.name} (${char.visualTraits}) performs an evasive tactical slide across rain-slicked asphalt while neon tracer rounds ricochet off rusted scaffolding. High-speed shutter 45-degree angle capturing crisp droplet impacts and violent muzzle flashes. Rembrandt key lighting mixed with crimson warning strobes and sodium-vapor street lamps. Panavision C-Series Anamorphic 35mm, barrel distortion at frame edges, anamorphic blue horizontal streaks, Kodak Vision3 250D daylight stock, 16:9 cinematic action frame.`;
    cameraMotionPrompt = "High-velocity whip pan following the ricocheting tracers into a rapid low-angle camera chase, dynamic camera tilt with realistic kinetic inertia, 24fps motion blur";
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

  // ── NARRATIVE ARC OVERRIDE: Denouement steps converge into the epic ending (step 50 = THE END) ──
  if (nextStepNum >= TOTAL_STEPS - 3) {
    const finalChar = movie.bible.characters[0] || char;
    const finalProp = movie.bible.props[0] || prop;
    const isLastScene = nextStepNum >= TOTAL_STEPS;

    if (isLastScene) {
      synopsis = `THE END. The fate of ${finalChar.name} and the ${finalProp.name} is decided as every audience choice across the entire 50-step journey converges into one defining, cathartic moment. The conflict is resolved and the film closes on an epic final image.`;
      visualPrompt = `Extreme wide shot / bird's-eye perspective slowly descending into a heroic medium shot: ${finalChar.name} (${finalChar.visualTraits}) stands at the monumental precipice of the resolved world, holding ${finalProp.name} (${finalProp.visualAppearance}) glowing in harmonic resonance. Low-angle golden hour lighting with long warm raking sun rays slicing through dissipating storm clouds, rimming the silhouette in majestic amber backlight and soft lavender fill. Zeiss Master Prime 21mm on ARRI Alexa 65 large format, hyper-crisp optical clarity, creamy circular bokeh, cinematic film look with rich dynamic range, 16:9 final theatrical frame.`;
      cameraMotionPrompt = "Epic Technocrane 50ft ascending pull-back and crane up, rotating 45 degrees into an awe-inspiring panoramic master shot, gradual deceleration to perfect stillness";
      subtitles = [
        {
          start: 1.0,
          end: 7.0,
          speaker: finalChar.name,
          text: "It is finished. Every choice led us to this exact moment.",
          textEs: "Se acabó. Cada elección nos trajo exactamente a este momento."
        },
        {
          start: 7.5,
          end: 14.0,
          speaker: finalChar.name,
          text: "This is how our story ends. Thank you for watching.",
          textEs: "Así termina nuestra historia. Gracias por mirar."
        }
      ];
    } else {
      synopsis = `FINAL CONFRONTATION. The last threads converge: ${finalChar.name} unleashes everything in the climactic struggle that will decide the fate of the ${finalProp.name} and every life bound to it. The story surges toward its definitive ending at step ${TOTAL_STEPS}.`;
      visualPrompt = `Low-angle dynamic hero shot with 360-degree orbital energy: ${finalChar.name} (${finalChar.visualTraits}) unleashes the ultimate power of ${finalProp.name} (${finalProp.visualAppearance}) in the center of the vortex. Split-lighting with deep chiaroscuro: blinding white energy discharge contrasting against deep obsidian midnight shadows. Volumetric dust, floating debris, and shattered glass suspended in zero gravity. Kowa Prominar Anamorphic 40mm, warm vintage golden flares, pronounced barrel distortion, rich filmic grain, 16:9 climactic blockbuster frame.`;
      cameraMotionPrompt = "Rapid 360-degree orbital Steadicam rotation around the protagonist while rising from low angle to eye level, dramatic momentum with cinematic inertia, 24fps motion blur";
      subtitles = [
        {
          start: 1.0,
          end: 7.0,
          speaker: finalChar.name,
          text: "This is the final battle. Everything ends here!",
          textEs: "¡Esta es la batalla final! ¡Todo termina aquí!"
        },
        {
          start: 7.5,
          end: 14.0,
          speaker: finalChar.name,
          text: "Make the last choice of the war.",
          textEs: "Tomen la última elección de la guerra."
        }
      ];
    }

    optionA = {
      id: "A",
      title: isLastScene ? "A Bittersweet Farewell" : "Head-On Final Assault",
      text: isLastScene
        ? `The story closes on a quiet, bittersweet farewell as ${finalChar.name} walks into the horizon.`
        : `${finalChar.name} launches a full frontal assault against the antagonist's stronghold.`,
      dramaticHook: isLastScene ? "An emotional, melancholic final beat." : "Everything on the line in one decisive strike.",
      expectedConsequence: isLastScene
        ? "The film ends with a melancholic yet hopeful resolution."
        : "A colossal, all-or-nothing confrontation.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: isLastScene ? "A Triumphant Reunion" : "Decapitation Strike",
      text: isLastScene
        ? `The story closes on a triumphant reunion as ${finalChar.name} is embraced by the allies who survived.`
        : `${finalChar.name} infiltrates the heart of the enemy to cut off the threat at its source.`,
      dramaticHook: isLastScene ? "A cathartic, uplifting final image." : "High risk with the highest reward.",
      expectedConsequence: isLastScene
        ? "The film ends on a celebratory, triumphant note."
        : "A surgical strike that can end the war instantly.",
      votes: 0
    };
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
    cameraMotionPrompt,
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
  const apiKey = getLlmApiKey();

  if (apiKey) {
    try {
      const systemPrompt = `You are an elite Hollywood Film Director and Film Scholar. The interactive film "${movie.title}" has just concluded its 50-step arc, created and voted upon live by the audience.
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

      const parsed = await callLlmJson<any>({
        label: 'final-summary',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 1,
        max_tokens: 16384
      });

      if (parsed) {
        return {
          finalSynopsis: parsed.finalSynopsis || movie.initialPlot,
          finalSummary: parsed.finalSummary || "The film successfully concluded its community-driven 50-step cinematic odyssey."
        };
      }
    } catch (e) {
      console.warn("DeepSeek final summary generation error, using procedural summary:", e);
    }
  }

  // Procedural Retrospective Generator in English
  const charNames = movie.bible.characters.map(c => c.name).join(' and ');
  const propNames = movie.bible.props.map(p => p.name).join(', ');

  const finalSynopsis = `Across 50 real-time narrative branches shaped live by the audience, "${movie.title}" chronicles the pulse-pounding odyssey of ${charNames} in a race against extinction across the dystopian city. Forced to choose at every turn between calculated stealth and explosive open warfare, the protagonists confronted totalitarian corporate control armed with the ${propNames}, culminating in the definitive liberation of human free will.`;

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

/**
 * Creative combinatorial pools for extreme narrative variety in blockbuster voting.
 */
const CREATIVE_GENRES = [
  "Biopunk / Alchemical Genetic Heist",
  "Abyssal Oceanic Sci-Fi / Leviathan Deep-Sea Thriller",
  "Silkpunk Wuxia / Cloud-Spire Political Conspiracy",
  "Cosmic Surrealist Western / Event Horizon Frontier",
  "Chrono-Noir / Temporal Loop Detective Mystery",
  "Folk Horror / Medieval Cyber-Witchcraft",
  "Post-Singularity Android Gothic / Vatican Espionage",
  "Dieselpunk Subterranean Megastructure Warfare",
  "Solarpunk Nomadic Wasteland / Colossal Sand-Titan Pilgrimage",
  "Neon Shinto Mythopunk / Digital Spirit Hacker War",
  "Dark Victorian Dream-Merchant / Gaslight Alchemy",
  "Radioactive Glacial Odyssey / Prehistoric Bio-Ruins",
  "Psychic Cold War Espionage / Brutalist Mind-Infiltration",
  "Quantum Ocean Space Opera / Sentient Nebula Odyssey",
  "Clockwork Steampunk Paleontology / Fossil Mech Survival",
  "Solar Flare Survival / Orbital Prison Uprising",
  "Eldritch Cyber-Archaeology / Sunken Megacity Expedition",
  "Astro-Biological Safari / Alien Biosphere Colonization"
];

const CREATIVE_PROTAGONISTS = [
  "a blind acoustic hacker mapping underground data rivers",
  "a guilt-ridden bio-sculptor who gave humanity synthetic wings",
  "an excommunicated chronomancer tracking erased timelines",
  "a deep-void salvage diver who hears voices trapped in cosmic ice",
  "an android nun guarding the last biological human infant",
  "a sand-ship captain hunting a sentient storm that devours cities",
  "a quantum coroner investigating a murder committed simultaneously across three parallel timelines",
  "a disgraced cyber-exorcist purging predatory neural intelligences from the city grid",
  "an alchemical cartographer navigating non-Euclidean subterranean labyrinths",
  "a mute memory smuggler whose own childhood was confiscated by the state",
  "a rogue terraforming architect who accidentally awakened a planetary consciousness",
  "a retired mech gladiatrix protecting a sanctuary of pacifist machine monks"
];

const CREATIVE_CATALYSTS = [
  "a dying star singing a mathematical hymn that triggers precognitive mass visions",
  "a biological black box discovered inside a prehistoric glacier predating human evolution",
  "an orbital mirror array redirected to burn a continent to glass in 24 hours",
  "a clockwork citadel that resets the city's memory and architecture every midnight",
  "a forbidden neural frequency that lets humans experience the collective thoughts of artificial minds",
  "an impossible floating gate found drifting silently in interstellar space",
  "a subterranean ocean of mercury where ancient colossal leviathans dream realities into existence",
  "a black-market synthetic serum that turns human dreams into tangible holographic artifacts",
  "a rogue asteroid carrying the digital civilization of an extinct alien star-cluster",
  "a sentient planetary storm demanding human memories as fuel for its lightning"
];

const CREATIVE_AESTHETICS = CINEMATIQUE_AESTHETIC_PRESETS;

function sampleRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function sampleUniqueRandom<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generate an IMMERSIVE cinematic ad prompt that weaves the sponsor's product or
 * service organically INTO the current film's story world — same characters,
 * environment, camera language and color grade. The product becomes a natural
 * story element, never a cut-away commercial. The returned prompt is ONLY for
 * the ad clip; the product must never leak into future story prompts.
 */
export async function generateImmersiveAdPromptWithDeepSeek(params: {
  brandName: string;
  title: string;
  tagline?: string;
  description?: string;
  movieTitle: string;
  genre: string;
  cinematicStyle?: string;
  characters: string;
  environment: string;
}): Promise<string | null> {
  const apiKey = getLlmApiKey();
  if (!apiKey) return null;

  try {
    const systemPrompt = `You are an elite in-story product-placement cinematographer and director for high-concept interactive cinema.
Write ONE ultra-detailed cinematic visual prompt in ENGLISH for a 15-second fal.ai MiniMax video clip, incorporating the Cinematique visual formula.
RULES:
1. IN-WORLD INTEGRATION: The sponsor product/service must be woven organically INTO the film's diegetic story world: a character wields it, examines it, activates it, or it sits in atmospheric set dressing — never a standalone commercial, never a banner or logo overlay, never breaking cinematic immersion.
2. CINEMATIQUE LIGHTING & COLOR: Match the EXACT same visual texture, motivated lighting rigs (key/fill ratios, color temperature in Kelvin, practical fixtures), and color grade as the film.
3. OPTICS & CAMERA CADENCE: Specify lens optics (anamorphic streak flares, prime focal lengths, depth of field) and an intentional camera movement (dolly track, Steadicam, or crane descent at 24fps film cadence).
4. CONTINUITY: Feature the movie's established characters and environment so the scene flows seamlessly as the next chronological beat.
5. The output must be a single continuous visual prompt (no script format), 150-300 words, structured as: [Shot Scale & Subject Action] + [Motivated Lighting] + [Lens Optics & Film Stock] + [Camera Movement].

Respond ONLY with a valid JSON object:
{
  "adPrompt": "The immersive cinematic ad prompt in English..."
}`;

    const userContent = `FILM: "${params.movieTitle}" (${params.genre})
CINEMATIC STYLE: ${params.cinematicStyle || '35mm anamorphic, cinematic grade'}
CHARACTERS: ${params.characters || 'None specified — invent fitting background extras'}
CURRENT ENVIRONMENT/SCENE: ${params.environment}
SPONSOR: "${params.brandName}" — "${params.title}"${params.tagline ? ` (tagline: "${params.tagline}")` : ''}
PRODUCT DESCRIPTION: ${params.description || 'No description — infer a plausible in-world form from the brand name.'}`;

    const parsed = await callLlmJson<any>({
      label: 'immersive-ad-prompt',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 1,
      max_tokens: 16384
    });

    if (parsed) {
      const adPrompt = parsed.adPrompt;
      if (typeof adPrompt === 'string' && adPrompt.trim().length > 40) {
        return adPrompt.trim();
      }
    }
  } catch (err) {
    console.warn('DeepSeek immersive ad prompt generation failed, using template fallback:', err);
  }

  return null;
}

/**
 * Generate 4 radically varied blockbuster movie candidates for the audience
 * "next blockbuster" voting stage. Each candidate carries a display title,
 * logline and genre, plus a full premise string used to build the story bible
 * when the candidate wins.
 *
 * Uses dynamic combinatorial seeds (genre, protagonist, catalyst, aesthetic)
 * and elevated temperature to guarantee unique results on every execution.
 */
export async function generateBlockbusterCandidatesWithDeepSeek(): Promise<BlockbusterCandidate[]> {
  const apiKey = getLlmApiKey();

  if (apiKey) {
    try {
      const selectedGenres = sampleUniqueRandom(CREATIVE_GENRES, 4);
      const selectedProtagonists = sampleUniqueRandom(CREATIVE_PROTAGONISTS, 4);
      const selectedCatalysts = sampleUniqueRandom(CREATIVE_CATALYSTS, 4);
      const selectedAesthetics = sampleUniqueRandom(CREATIVE_AESTHETICS, 4);

      const systemPrompt = `You are an avant-garde Head of Development at an interactive blockbuster cinema studio.
Your mission is to formulate EXACTLY 4 completely DIFFERENT, wild, high-concept interactive film pitches for a live 50-step audience-driven interactive movie.

MANDATORY RULES:
1. RADICAL DIVERSITY: Each of the 4 candidates MUST be from a completely different genre, tone, visual style, and emotional palette. Avoid Hollywood clichés, generic medieval tropes, or basic cyber hackers.
2. AUDIENCE HOOK: Audience members vote after reading ONLY the title, logline, and genre. The logline must be gripping, cinematic, and sell the core concept instantly.
3. CINEMATIQUE PREMISE BRIEFS: In the premise, embed distinctive cinematographic cues (aspect ratio, signature lens, color science, and lighting mood) derived from the aesthetic inspiration.
4. CREATIVE SEEDS TO INSPIRE THE 4 SLOTS:
- Candidate A inspiration: ${selectedGenres[0]} featuring ${selectedProtagonists[0]} facing ${selectedCatalysts[0]} with aesthetic of ${selectedAesthetics[0]}.
- Candidate B inspiration: ${selectedGenres[1]} featuring ${selectedProtagonists[1]} facing ${selectedCatalysts[1]} with aesthetic of ${selectedAesthetics[1]}.
- Candidate C inspiration: ${selectedGenres[2]} featuring ${selectedProtagonists[2]} facing ${selectedCatalysts[2]} with aesthetic of ${selectedAesthetics[2]}.
- Candidate D inspiration: ${selectedGenres[3]} featuring ${selectedProtagonists[3]} facing ${selectedCatalysts[3]} with aesthetic of ${selectedAesthetics[3]}.

5. Respond ONLY with a valid JSON object matching this schema:
{
  "candidates": [
    {
      "title": "Unforgettable Cinematic Title",
      "logline": "One razor-sharp sentence describing the hook, protagonist goal, and immediate stakes.",
      "genre": "Precise Distinct Genre / Hybrid",
      "premise": "Full creative brief: the world, protagonist, antagonist, central conflict, signature prop/technology, and the core audience choices across the 50-step arc."
    }
  ]
}`;

      const parsed = await callLlmJson<any>({
        label: 'blockbuster-candidates',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate 4 wildly different, fresh and compelling blockbuster candidate pitches now. Timestamp entropy: ${Date.now()}` }
        ],
        temperature: 1.0,
        max_tokens: 16384
      });

      if (parsed) {
        const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];

        const candidates: BlockbusterCandidate[] = rawCandidates.slice(0, 4).map((c: any, idx: number) => ({
          id: (['A', 'B', 'C', 'D'] as const)[idx],
          title: String(c.title || `Untitled Odyssey ${idx + 1}`).slice(0, 90),
          logline: String(c.logline || 'An interactive cinematic journey where every choice reshapes the world.').slice(0, 220),
          genre: String(c.genre || selectedGenres[idx] || 'Sci-Fi / Thriller').slice(0, 60),
          premise: String(c.premise || `${c.title || 'Untitled'} — ${c.genre || 'Epic'}.`).slice(0, 900)
        }));

        if (candidates.length === 4) {
          return candidates;
        }
      }
    } catch (err) {
      console.warn('DeepSeek blockbuster candidates generation failed, using procedural variety generator:', err);
    }
  }

  return getFallbackBlockbusterCandidates();
}

/**
 * Procedural fallback catalog: 20+ varied, high-concept interactive film pitches.
 * Shuffled on every call to guarantee fresh variety even without API keys.
 */
const EXTENSIVE_FALLBACK_CANDIDATES = [
  {
    title: 'Project Nemesis: Protocol 2099',
    logline: 'A neural detective races a megacorporation to decrypt an obsidian prism holding humanity\'s last free will.',
    genre: 'Cyberpunk / Neo-Noir Thriller',
    premise: 'Cyberpunk neo-noir thriller about a rogue neural detective uncovering a megacorporate conspiracy to overwrite human free will with a quantum brain-prism. The audience decides at every step whether to trust the shadows or burn the system down.'
  },
  {
    title: 'The Shattered Crown: Chronicles of Eldoria',
    logline: 'A fallen knight and a shadow-sorceress hunt a stolen crown before a sleeping dragon empire awakens.',
    genre: 'Dark Epic Fantasy / Mythic Saga',
    premise: 'Dark epic fantasy saga where a disgraced knight and a blood-sorceress chase a cursed crown across ruined kingdoms while a dragon empire stirs beneath the mountains. The audience steers alliances, betrayals and the fate of the realm.'
  },
  {
    title: 'Aegis Horizon: Deep Void Protocol',
    logline: 'The last human carrier answers a dying alien signal echoing from inside a black hole Dyson sphere.',
    genre: 'Cosmic Space Opera / Hard Sci-Fi',
    premise: 'Cosmic space opera following the crew of the last human carrier as they cross a Dyson megastructure answering an alien distress signal that predates humanity. Every vote decides first contact, survival or sacrifice.'
  },
  {
    title: 'The Sun Engine: Ashes of Meridian',
    logline: 'Scavenger clans pilot rusted mechs across an endless desert to reignite the legendary solar reactor.',
    genre: 'Post-Apocalyptic Solarpunk / Mech Wasteland',
    premise: 'Post-apocalyptic solarpunk wasteland where rival scavenger clans pilot colossal repurposed mechs to reignite the legendary Sun Engine before the final city freezes over. The audience picks leaders, gambles alliances and reshapes the wasteland.'
  },
  {
    title: 'Abyssal Leviathan: Depth Protocol Zero',
    logline: 'A deep-sea drilling expedition breaches an oceanic trench only to awaken a bio-luminescent intelligence.',
    genre: 'Oceanic Sci-Fi / Creature Horror',
    premise: 'High-tension underwater survival sci-fi where deep-sea divers encounter an ancient bio-synthetic leviathan dormant at the bottom of the Mariana Trench. Every decision alters pressure levels, crew sanity, and the fate of oceanic civilization.'
  },
  {
    title: 'Chrono-Loop: The 13th Minute',
    logline: 'A temporal investigator relives the murder of a high-tech diplomat in an infinite twelve-minute loop.',
    genre: 'Chrono-Thriller / Quantum Time-Loop',
    premise: 'A mind-bending mystery where an excommunicated time-cop is trapped in a repeating twelve-minute assassination sequence inside an orbital hotel. The audience tests different forensic angles and butterfly effects until the loop breaks.'
  },
  {
    title: 'Silk & Steam: The Alchemist of Chang\'an',
    logline: 'In an alternate steam-powered Tang Dynasty, an alchemist crafts artificial jade hearts to prevent an imperial coup.',
    genre: 'Silkpunk / Historical Fantasy Espionage',
    premise: 'Intricate silkpunk political thriller set in a high-tech mythical imperial capital powered by mercury boilers and silk gliders. Audience choices dictate stealth assassinations, diplomatic marriages, and forbidden alchemical experiments.'
  },
  {
    title: 'Gothic Binary: Cathedral of the Machine God',
    logline: 'An android inquisitor investigates a digital heresy spreading through the Vatican\'s subterranean AI servers.',
    genre: 'Cyber-Gothic / Philosophical Sci-Fi',
    premise: 'Dark neo-baroque thriller exploring faith and synthetic consciousness. A synthetic inquisitor uncovers a rogue neural network claiming to be an angelic apparition. The audience balances heresy, divine revelations, and machine autonomy.'
  },
  {
    title: 'Event Horizon Express: Rail of the Dying Stars',
    logline: 'Passengers aboard a cosmic trans-dimensional train discover the conductor is steering straight into a supernova.',
    genre: 'Cosmic Surrealist Western / Sci-Fi Mystery',
    premise: 'A surreal space-western where a train travels across quantum tracks connecting dying stars. Outlaws, cyber-sheriffs, and rogue passengers battle for the locomotive controls as spatial anomalies warp cabin physics.'
  },
  {
    title: 'Folk & Iron: The Witching Forest of Karr',
    logline: 'In a plague-ridden medieval frontier, an armored inquisitor and a pagan herbalist face a biomechanical plague.',
    genre: 'Folk Horror / Medieval Bio-Horror',
    premise: 'Eerie gothic folk horror where ancient forest spirits merge with mechanical clockwork parasites. The audience decides whether to burn the woodland sanctuaries or submit to symbiotic mutation.'
  },
  {
    title: 'Solaris Drift: The Neon Archipelagos',
    logline: 'Floating city-barges battle mega-typhoons and pirate syndicates after the polar caps submerge the continents.',
    genre: 'Hydro-Punk / Marine Action Odyssey',
    premise: 'High-octane waterworld adventure with solar-powered catamarans, floating night markets, and aquatic cyborg syndicates fighting over the last freshwater desalinator.'
  },
  {
    title: 'The Cartographer of Dead Geometries',
    logline: 'An explorer enters a shifting subterranean labyrinth where rooms rearrange according to human fear.',
    genre: 'Psychological Horror / Eldritch Mystery',
    premise: 'Haunting architectural horror where an academic maps an impossible cavern system that shifts based on psychological guilt. Audience votes navigate shifting rooms, hallucinatory traps, and forgotten eldritch entities.'
  }
];

/**
 * Curated procedural fallback: 4 varied candidates randomly selected and shuffled
 * from the extensive 12+ concept catalog to prevent repetition.
 */
export function getFallbackBlockbusterCandidates(): BlockbusterCandidate[] {
  const shuffled = [...EXTENSIVE_FALLBACK_CANDIDATES].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 4);

  return picks.map((p, idx) => ({
    id: (['A', 'B', 'C', 'D'] as const)[idx],
    ...p
  }));
}

