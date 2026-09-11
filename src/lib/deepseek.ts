import { Character, Prop, SceneEnvironment, MovieBible, MovieStep, DecisionOption, Movie, SubtitleCue, BlockbusterCandidate, TOTAL_STEPS } from '@/types/cinema';
import {
  CINEMATIQUE_SYSTEM_PROMPT_DIRECTIVES,
  CINEMATIQUE_AESTHETIC_PRESETS,
  getUniqueCinematiqueAesthetics
} from './cinematique';
import { CINEMATIC_MOCK_VIDEOS } from './fal-video';

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
  timeoutMs?: number;
}

export async function callLlmJson<T = any>(params: CallLlmParams): Promise<T | null> {
  const apiKey = getLlmApiKey();
  if (!apiKey) return null;

  const endpoint = getLlmEndpoint();
  const model = getLlmModel();
  const timeoutMs = params.timeoutMs ?? 30000;

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(timeoutMs),
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
        max_tokens: params.max_tokens ?? 2500,
        seed: params.seed ?? Math.floor(Math.random() * 2147483647),
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
    genre: "Superhéroes / Comic Book Cinematic",
    theme: "Vigilantism, Hidden Identities, Moral Duty & World-Threatening Supervillains",
    style: "IMAX 65mm Superhero Spectacle, High-Octane Key Lighting, Heroic Low-Angle Framing, Vivid Primary Colors, Deep Anamorphic Flares"
  },
  {
    genre: "Anime / Shonen & Seinen Cinematic",
    theme: "Unbreakable Will, Inner Fire, Destined Rivals & Emotional Climax",
    style: "Luminous Cel-Shaded Art Direction, God Rays Piercing Clouds, Dynamic Action Speed Lines, High-Saturation Azure and Sunset Gradients"
  },
  {
    genre: "Animación 3D Estilizada / Family Adventure",
    theme: "Whimsical Inventions, Found Family, Heartfelt Courage & Pure Wonder",
    style: "Pixar & Spider-Verse Stylized 3D Animation, Tactile Textures, Subsurface Scattering, Warm Bounce Lighting, Expressive Character Physics"
  },
  {
    genre: "Horror Clásico / Gothic Supernatural",
    theme: "Haunted Legacies, Demonic Invocations, Ancient Curses & Shadows in the Mist",
    style: "35mm Grainy Chiaroscuro, Cold 4500K Moonlight through Decaying Windows, Unsettling Negative Space, Flickering Candelabra"
  },
  {
    genre: "Cine Noir Clásico / Hardboiled 1940s",
    theme: "Cynical Private Eyes, Femme Fatales, Urban Corruption & Moral Ambiguity",
    style: "Kodak Double-X Black & White, Hard 8:1 Contrast Ratio, Venetian Blind Gobo Shadows, Rain-Slicked Pavements and Cigarette Smoke"
  },
  {
    genre: "Drama Emocional / High-Stakes Human Struggle",
    theme: "Family Sacrifices, Unspoken Truths, Moral Dilemmas & Emotional Redemption",
    style: "Cooke S4 Organic Warmth, Intimate 50mm Medium Close-Ups, Natural Soft Window Light, Authentic Emotional Depth"
  },
  {
    genre: "Policial / Gritty Crime Investigation",
    theme: "Homicide Detectives, Cold Cases, Forensic Clues & The Dark Heart of the City",
    style: "35mm Telephoto Compression, Muted Street Realism, Fluorescent Precinct Lighting, Handheld Steadicam Energy"
  },
  {
    genre: "Comedia de Acción / Buddy Cop Adventure",
    theme: "Clashing Personalities, Outrageous Heists, Witty Banter & Escaping by a Hair",
    style: "High-Key Saturated Visuals, Wide Comedic Framing, Snappy Dynamic Camera Pans, Crisp Commercial Contrast"
  },
  {
    genre: "Thriller Psicológico / Suspense & Mind Games",
    theme: "Unreliable Narrators, Claustrophobic Paranoia, Fractured Memories & Hidden Motives",
    style: "David Fincher Precision, Desaturated Green-Amber Palette, Split-Diopter Focus, Symmetrical Framing and Ominous Slow Dolly Creep"
  },
  {
    genre: "Fantasía Épica Medieval / Sword & Sorcery",
    theme: "Ancient Kingdoms, Royal Prophecies, Mythic Beasts & Legendary Blades",
    style: "70mm Ultra Panavision, Torchlit Stone Castles, Sweeping Misty Mountain Panoramas, Rich Velvet and Weathered Iron"
  },
  {
    genre: "Western Clásico / Frontier Justice",
    theme: "Rival Gunslingers, Dusty Saloons, Desert Standoffs & The Frontier Code",
    style: "Sergio Leone Techniscope 2.35:1 Widescreen, Blinding Desert Sunlight, Extreme Close-Up Eye Standoffs, Golden Hour Horizon"
  },
  {
    genre: "Aventura Arqueológica Pulp / Lost Relic Hunter",
    theme: "Forbidden Tombs, Ancient Traps, Cryptic Maps & Ruthless Mercenary Rivals",
    style: "Warm Firelight & Amber Lanterns, Dusty Cavern God Rays, Weathered Leather Patina, 35mm Rich Kodachrome Earth Tones"
  },
  {
    genre: "Espionaje Guerra Fría / Clandestine Agents",
    theme: "Divided Cities, Encrypted Microfilm, Double Agents & Paranoia Behind the Curtain",
    style: "Grainy 16mm Surveillance Camera Aesthetic, Wet Cobblestone Alleys, Trench Coats under Sodium Lamps, Muted Slate Blues"
  },
  {
    genre: "Samuráis & Chambara / Bushido Honor",
    theme: "Wandering Ronin, Feudal Feuds, Sacred Katana Oaths & Sacrificial Duels",
    style: "Akira Kurosawa Compositions, Driving Rainstorms, Howling Pampas Winds, Razor-Sharp Katana Draw Cadence"
  },
  {
    genre: "Romance de Época / Regency & Victorian Intrigue",
    theme: "Forbidden Passions, Gilded Ballrooms, High Society Scandals & Written Letters",
    style: "Lush 35mm Celluloid, Soft Silk Diffusion, 2800K Glowing Candelabras, Opulent Silk and Velvet Costumes"
  },
  {
    genre: "Bélico Histórico / Brotherhood in the Trenches",
    theme: "Frontline Bravery, Survival in the Trenches, Camaraderie & The Cost of War",
    style: "Desaturated Gritty Film Stock, Explosive Debris & Dirt Particle Scatter, Handheld Trench Run Tracking, Hard Direct Sunlight"
  },
  {
    genre: "Misterio Whodunnit de Mansión / Manor Puzzle",
    theme: "Eccentric Sleuths, Secret Wills, Poisoned Teacups & Twelve Suspicious Heirs",
    style: "Ornate Victorian Interiors, Symmetrical Knives Out Framing, Deep Mahogany & Emerald Tones, Razor-Sharp Optical Clarity"
  },
  {
    genre: "Piratas & Swashbuckling / High Seas Odyssey",
    theme: "Cursed Treasure Maps, Galleon Broadside Battles, Mutiny & The Lawless Ocean",
    style: "Technicolor 3-Strip Azure Seas, Sun-Drenched Wooden Decks, Billowing White Canvas, Salty Spray across the Lens"
  },
  {
    genre: "Fantasía Mitológica / Odisea de Dioses y Héroes",
    theme: "Olympian Quests, Mythic Monsters, Divine Oracles & Legendary Heroism",
    style: "IMAX Colossal Scale, Radiant Golden Divine Auras, Crashing Marble Columns, Chiaroscuro Lightning Flares"
  },
  {
    genre: "Catástrofe & Supervivencia Natural / Extreme Elements",
    theme: "Raging Volcanoes, Glacial Avalanches, Family Rescue & Defying Nature",
    style: "Immersive Wide 18mm Lens, Dynamic Shaking Camera Rigs, Blinding Atmospheric Ash and Snow, High Dynamic Range"
  }
];

let currentStoryRotation = 0;
export function getNextBlockbusterRotationIndex(): number {
  const index = currentStoryRotation % PRESET_STORIES.length;
  currentStoryRotation++;
  return index;
}

// Preset high-fidelity stories for diverse blockbuster rotation
export const PRESET_STORIES = [
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
      },
      {
        id: "char_mercer",
        name: "Dr. Sean Mercer",
        role: "Chief Astrobiologist",
        visualTraits: "36yo male, wireframe glasses, contemplative expression, sharp features",
        clothing: "Zero-G biological containment suit with diagnostic forearm display",
        personality: "Inquisitive, cautious, fascinated by xenomorphic artifacts",
        voiceStyle: "Reflective, soft-spoken with scientific cadence",
        voicePrompt: "Thoughtful 36-year-old tenor, precise academic delivery with breathless awe under discovery.",
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80",
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
      },
      {
        id: "prop_dna_capsule",
        name: "Primordial DNA Capsule",
        description: "Alien artifact containing ancestral genetic strands",
        visualAppearance: "Cylindrical cryo-crystal tube pulsing with bioluminescent blue helical strands",
        narrativeSignificance: "Proves extraterrestrial seeding of early Earth",
        imageUrl: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_mercer",
        ownerCharacterName: "Sean Mercer",
        icon: "disc"
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
  },

  // 4. Solarpunk / Mech Wasteland
  {
    title: "The Sun Engine: Ashes of Meridian",
    genre: "Post-Apocalyptic Solarpunk / Mech Wasteland",
    tagline: "When the skies cooled into ice, the last scavengers marched to reignite the heart of a fallen star.",
    initialPlot: "Across the frozen desert of the Salt Plains, scavenger pilot Jax Carrow steers his refurbished bipedal Titan 'Goliath' toward the ruins of the Meridian Caldera. Within the fortress lies the Sun Engine, humanity's final geothermal fusion core, fiercely guarded by the rogue automated war-sentinels of the Old Dawn.",
    masterArcThread: "A 50-step cross-desert expedition fighting rival scavenger caravans and automated defense grids to ignite the perpetual solar reactor.",
    cinematicStyle: "Super 35mm Gritty Gold and Rust, Dusty Atmospheric Haze, Blinding Sunbursts and Oxidized Copper",
    targetTheme: "Hope, Ecological Rebirth and Machine Loyalty",
    firstStepTitle: "The Caldera Approach",
    firstStepSynopsis: "Jax's rusted mech breaks through an iron dune ridge. The monumental solar reactor tower gleams on the horizon as automated missile warning alarms chirp in his cockpit.",
    firstStepDialogue: "Jax: 'Goliath, reroute all battery cells to forward shields. We are taking that reactor today.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Jax", text: "Goliath, reroute all battery cells to forward shields.", textEs: "Goliath, redirige todas las celdas de batería a los escudos frontales." },
      { start: 7.0, end: 14.0, speaker: "AI Goliath", text: "Shields at seventy percent. Sentinel drones locked onto our signature.", textEs: "Escudos al setenta por ciento. Drones centinela fijaron nuestra firma." }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    characters: [
      {
        id: "char_jax",
        name: "Jax Carrow",
        role: "Scavenger Mech Pilot / Protagonist",
        visualTraits: "28yo male, dirt-streaked jaw, bronze-tinted aviator goggles, messy copper hair",
        clothing: "Padded ballistic vest with salvaged hydraulic braces and insulated sand-poncho",
        personality: "Resourceful, daring, fiercely loyal to his salvage crew",
        voiceStyle: "Raspy, youthful baritone filled with grit and quick wit",
        voicePrompt: "Energetic 28-year-old baritone, gravelly midwest delivery, high adrenaline breathing, authentic cockpit comms crackle.",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_mara",
        name: "Engineer Mara Vex",
        role: "Chief Mechanist",
        visualTraits: "31yo female, grease smudge across cheek, electric green cybernetic eyepiece",
        clothing: "Reinforced flame-resistant jumpsuit with multi-tool utility harness",
        personality: "Genius mechanic, sharp-tongued, refuses to let machines fail",
        voiceStyle: "Confident, rapid-fire cadence with sharp command",
        voicePrompt: "Sharp 31-year-old alto, rapid mechanical assessment delivery, authoritative tone under fire.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_fusion_key",
        name: "Solar Igniter Cell",
        description: "Supercharged plasma cartridge capable of jump-starting the Sun Engine",
        visualAppearance: "Cylindrical heavy brass canister glowing with searing yellow fusion plasma",
        narrativeSignificance: "Without it, the reactor cannot be sparked back to life",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_jax",
        ownerCharacterName: "Jax Carrow",
        icon: "sun"
      },
      {
        id: "prop_wrench",
        name: "Hydraulic Breaching Hammer",
        description: "Heavy pneumatic ram used for breaching hardened bunker blast doors",
        visualAppearance: "Two-handed industrial pneumatic hammer with pneumatic coils",
        narrativeSignificance: "Sole tool able to force the Caldera vault entrance",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_mara",
        ownerCharacterName: "Mara Vex",
        icon: "tool"
      }
    ],
    environments: [
      {
        id: "env_salt_plains",
        name: "The Meridian Salt Dunes",
        lighting: "Blinding harsh amber sunlight, long dramatic sand shadows, shimmering heat mirage",
        atmosphere: "Howling dust winds, rumbling diesel engines, distant metallic shudders",
        colorPalette: "Rust Orange #d84315, Sun Gold #ffb300, Weathered Copper #00897b",
        architecturalStyle: "Shattered pre-collapse solar arrays towering above wind-sculpted salt dunes"
      }
    ],
    options: [
      { id: "A", title: "Full Throttle Jump-Jet Breach", text: "Fire Goliath's auxiliary boosters to leap the blast trench and crash-land inside the reactor courtyard.", dramaticHook: "High-risk aerial drop directly into enemy firing lines.", expectedConsequence: "Bypasses the minefield but risks catastrophic landing gear failure." },
      { id: "B", title: "Deploy EMP Dust Cannons", text: "Discharge the titan's conductive sand canisters to blind the automated defense turrets for a flanking approach.", dramaticHook: "Stealthier tactical maneuver that depletes limited defensive supplies.", expectedConsequence: "Disables defense sensors temporarily while leaving flanks vulnerable to ambush." }
    ]
  },

  // 5. Oceanic Biopunk / Deep Sea Horror
  {
    title: "Abyssal Leviathan: Trench 114",
    genre: "Oceanic Sci-Fi / Creature Horror",
    tagline: "Eight miles beneath the sunlight, the darkest depths are not empty — they are hungry.",
    initialPlot: "At deep-sea research station Hadal Prime in the Mariana Trench, Dr. Elena Rostova and deep-submersible pilot Mateo Silva breach a sealed geothermal cavern. What they awaken is not geothermal energy, but an ancient bioluminescent biomechanical leviathan that pulses with a sentient hive frequency.",
    masterArcThread: "A 50-step subterranean survival odyssey through flooded corridors, failing ballast tanks, and deep oceanic rifts to prevent the entity from ascending to surface waters.",
    cinematicStyle: "Underwater Anamorphic, Inky Abyssal Blacks, Bioluminescent Azure and Toxic Greens, Micro-Particulate Marine Snow",
    targetTheme: "The Terrors of the Deep, Human Hubris and Unknowable Life",
    firstStepTitle: "The Breach at Hadal Prime",
    firstStepSynopsis: "Elena gazes through the reinforced titanium viewport as massive bioluminescent tendrils wrap around the thermal drill mast, crushing steel like glass.",
    firstStepDialogue: "Elena: 'Pressure gauges are spiking... Mateo, that isn't a seismic fault. It's a pulse.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Elena", text: "Pressure gauges are spiking... That isn't a fault. It's a pulse.", textEs: "Los manómetros se disparan... No es una falla. Es un pulso." },
      { start: 7.0, end: 14.0, speaker: "Mateo", text: "Hull integrity at eighty-four percent! Emergency ballast blow now!", textEs: "¡Integridad del casco al ochenta y cuatro por ciento! ¡Soplado de lastre ya!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    characters: [
      {
        id: "char_elena",
        name: "Dr. Elena Rostova",
        role: "Chief Oceanographer / Protagonist",
        visualTraits: "35yo female, intense hazel eyes, damp auburn hair tied back, thermal pressure suit",
        clothing: "Deep-submersible neoprene dive tunic with illuminated vital sensor bands",
        personality: "Tenacious, highly rational, refusing to panic under crushing pressures",
        voiceStyle: "Low, controlled contralto with clipped emergency precision",
        voicePrompt: "Controlled 35-year-old contralto, steady rhythmic breathing, crisp scientific articulation under extreme hydrostatic peril.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_mateo",
        name: "Mateo Silva",
        role: "Deep Submersible Pilot",
        visualTraits: "40yo male, broad shoulders, salt-and-pepper beard, steady hands",
        clothing: "Waterproof flight suit with hydraulic manipulator sleeve",
        personality: "Pragmatic mariner with decades of bathypelagic experience",
        voiceStyle: "Gruff baritone with maritime cadence",
        voicePrompt: "Calm, deep 40-year-old baritone, experienced sailor cadence, unshakeable nerves.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_sonar_beacon",
        name: "Bioluminescent Acoustic Lure",
        description: "Frequency decoy designed to distract benthic predators",
        visualAppearance: "Heavy bronze cylinder with swirling cyan chemical light and acoustic sonar horns",
        narrativeSignificance: "Can steer the leviathan away from vital habitat hulls",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_elena",
        ownerCharacterName: "Elena Rostova",
        icon: "radio"
      },
      {
        id: "prop_torch",
        name: "Underwater Plasma Cutter",
        description: "High-yield thermal cutting lance operating at 10,000 atmospheres",
        visualAppearance: "Heavy industrial yellow lance with intense sapphire plasma arc",
        narrativeSignificance: "Can seal flooded watertight doors or sever creature tentacles",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_mateo",
        ownerCharacterName: "Mateo Silva",
        icon: "zap"
      }
    ],
    environments: [
      {
        id: "env_trench",
        name: "Hadal Station Moon Pool",
        lighting: "Dim emergency red beacons cut by brilliant bioluminescent cyan flares from the deep water below",
        atmosphere: "Creaking metal under hydrostatic load, condensation dripping, deep infrasonic rumbles",
        colorPalette: "Deep Navy #000a12, Abyssal Cyan #00e5ff, Hazard Amber #ff6d00",
        architecturalStyle: "Heavy reinforced titanium pressure dome with thick acrylic observation hatches"
      }
    ],
    options: [
      { id: "A", title: "Flood the Cavern with Acoustic Flares", text: "Fire acoustic pulse decoys into the rift to disorient the leviathan's sensory organs.", dramaticHook: "May repel the beast or provoke an instantaneous thrashing frenzy.", expectedConsequence: "Buys time to evacuate Sub-Level 3 but permanently damages sonar sensors." },
      { id: "B", title: "Seal Watertight Bulkhead Sector 7", text: "Slam the blast gates down to isolate the breach, sealing trapped research drones inside.", dramaticHook: "Cold utilitarian sacrifice to save the primary command sphere.", expectedConsequence: "Protects main habitat but cuts off access to the thermal power grid." }
    ]
  },

  // 6. Chrono-Loop / Quantum Heist
  {
    title: "Chrono-Shift: The 13th Minute",
    genre: "Chrono-Thriller / Quantum Time-Loop",
    tagline: "Twelve minutes to prevent the end of the world. In the thirteenth, reality rewinds.",
    initialPlot: "Trapped aboard the orbital transit station Chronos-7, chronal investigator Vincent Hall relives the same fatal twelve minutes leading up to the detonation of an antimatter reactor. Each restart gives Vincent and rogue chronosurgeon Maya Lin new forensic clues, but each iteration warps their physical memory.",
    masterArcThread: "Navigating 50 critical decision junctures across multiple cascading timelines to expose the saboteur and break the endless temporal feedback loop.",
    cinematicStyle: "Cooke S4 High-Speed Primes, Split-Diopter Dual Focus, Subtle Chromatic Aberration, Stroboscopic Shutter Shifts",
    targetTheme: "Fate, Paradox and The Weight of Unremembered Choices",
    firstStepTitle: "Minute Zero: The Ticking Glass",
    firstStepSynopsis: "Vincent awakens with a violent start as his pocket tachyon chronometer strikes 11:48 PM. Sirens howl in the station corridor as the reactor countdown begins anew.",
    firstStepDialogue: "Vincent: 'Twelve minutes... again. Every clue points to the maintenance conduit.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Vincent", text: "Twelve minutes... again. Every clue points to the conduit.", textEs: "Doce minutos... otra vez. Cada pista apunta al conducto." },
      { start: 7.0, end: 14.0, speaker: "Maya", text: "Vincent, your tachyon readings are decaying! This loop might be our last.", textEs: "¡Vincent, tus lecturas de taquiones decaen! Este bucle puede ser el último." }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    characters: [
      {
        id: "char_vincent",
        name: "Vincent Hall",
        role: "Temporal Detective / Protagonist",
        visualTraits: "37yo male, tired gray eyes with temporal dilation rings, silver hairline, dark wool overcoat",
        clothing: "Tailored charcoal trench with hidden chronal regulator wrist-cuffs",
        personality: "Obsessive, haunted by previous failed loops, razor-sharp deduction",
        voiceStyle: "Fast-talking, intense baritone with breathless urgency",
        voicePrompt: "Intense, rapid 37-year-old baritone, rhythmic nervous pace, articulate forensic deductions with controlled tension.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_maya",
        name: "Dr. Maya Lin",
        role: "Quantum Chronosurgeon",
        visualTraits: "29yo female, sharp geometric bob, glowing neural patch behind ear",
        clothing: "Cleanroom white laboratory parka over high-density graphite fibers",
        personality: "Cool-headed theorist, refuses to believe in predestination",
        voiceStyle: "Measured, crystal-clear soprano with mathematical authority",
        voicePrompt: "Crisp 29-year-old soprano, calm mathematical cadence, emotional grounding against temporal panic.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_tachyon_watch",
        name: "Tachyon Pocket Chronometer",
        description: "Handheld analog watch that ticks backward during temporal shifts",
        visualAppearance: "Damascus steel pocket watch with counter-rotating sapphire hands glowing ultraviolet",
        narrativeSignificance: "Only artifact that retains physical entropy across loop resets",
        imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_vincent",
        ownerCharacterName: "Vincent Hall",
        icon: "clock"
      },
      {
        id: "prop_phasic_key",
        name: "Phasic Lockdown Key",
        description: "Quantum bypass drive allowing entry into locked reactor bulkheads",
        visualAppearance: "Hexagonal glass cartridge with pulsating golden quantum filament",
        narrativeSignificance: "Bypasses station security override before detonation",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_maya",
        ownerCharacterName: "Maya Lin",
        icon: "key"
      }
    ],
    environments: [
      {
        id: "env_station_hub",
        name: "Chronos-7 Central Atrium",
        lighting: "Cold sterile white fluorescent lighting strobing with amber reactor emergency beacons",
        atmosphere: "Zero-G floating dust particles, echoing blaring alarms, shatter-resistant glass flexing",
        colorPalette: "Chrome Silver #e0e0e0, Tachyon Violet #7c4dff, Warning Red #d50000",
        architecturalStyle: "Sleek orbital hub with soaring geometric glass arches looking out onto Earth's curve"
      }
    ],
    options: [
      { id: "A", title: "Confront the Chief Engineer Immediately", text: "Sprint directly to the reactor control dais to intercept Chief Engineer Vance before he inputs the override.", dramaticHook: "Direct confrontation with unknown armed resistance.", expectedConsequence: "May stop the bomb early or trigger an immediate premature countdown." },
      { id: "B", title: "Hack the Sub-Level Server Archives", text: "Divert through the ventilation shaft to download the black-box security feed and confirm the saboteur's identity.", dramaticHook: "Gains irrefutable proof at the cost of four precious minutes.", expectedConsequence: "Secures critical evidence but leaves only eight minutes to disarm the core." }
    ]
  },

  // 7. Silkpunk / Alchemical Espionage
  {
    title: "Silk & Steam: The Alchemist of Chang'an",
    genre: "Silkpunk / Historical Fantasy Espionage",
    tagline: "In an empire bound by clockwork silk and mercury dragons, the emperor's heart is a lie.",
    initialPlot: "In the imperial capital of Chang'an, where clockwork automatons glide along mercury aqueducts and silk zeppelins cloud the sky, master alchemist Jin Song uncovers a palace secret: the Celestial Emperor died a year ago, replaced by a clockwork homunculus governed by the sinister Shadow Eunuchs.",
    masterArcThread: "A 50-step high-stakes palace intrigue across gilded pagodas, clandestine tea houses, and steam-belching workshops to expose the shadow court.",
    cinematicStyle: "35mm Vintage Warm Gold and Jade, Heavy Incense Haze, Flickering Silk Lanterns, Liquid Mercury Glare",
    targetTheme: "Tradition vs Automation, Deception and Dynastic Duty",
    firstStepTitle: "The Whispering Pavilion",
    firstStepSynopsis: "Jin Song operates on a defective imperial guard automaton in his hidden pavilion. As the brass breastplate clicks open, mercury fluid drips onto the floor, revealing a forbidden mechanical cipher.",
    firstStepDialogue: "Jin Song: 'This isn't an automaton gear... It's the imperial seal. What have they built?'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Jin Song", text: "This isn't a gear... It's the imperial seal. What have they built?", textEs: "Esto no es un engranaje... Es el sello imperial. ¿Qué han construido?" },
      { start: 7.0, end: 14.0, speaker: "Mei Ling", text: "The Eunuchs' shadow guard is already at the courtyard gate! We must move!", textEs: "¡La guardia de las sombras de los eunucos está en la puerta! ¡Debemos movernos!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    characters: [
      {
        id: "char_jin",
        name: "Jin Song",
        role: "Master Clockwork Alchemist / Protagonist",
        visualTraits: "32yo male, sharp obsidian eyes, bamboo spectacles, calloused fingertips stained with mercury",
        clothing: "Embroidered indigo silk robes lined with brass magnifying loupes and leather tool pockets",
        personality: "Methodical, inquisitive, bound by philosophical honor",
        voiceStyle: "Calm, cultured baritone with poetic cadence",
        voicePrompt: "Measured 32-year-old baritone, contemplative Eastern cadence, scholarly poise laced with lethal street instinct.",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_meiling",
        name: "Mei Ling",
        role: "Shadow Courtesan & Rebel Blade",
        visualTraits: "26yo female, porcelain skin, crimson silk ribbon braided through hair, piercing gaze",
        clothing: "Layered emerald silk traveling robes concealing twin spring-loaded jade daggers",
        personality: "Fierce, calculating, lethal in palace politics",
        voiceStyle: "Melodic, whispered alto with dangerous charm",
        voicePrompt: "Silky 26-year-old alto, whispered courtly charm covering steel lethality.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_mercury_vial",
        name: "Celestial Mercury Elixir",
        description: "Alchemical fuel that powers the empire's artificial automata",
        visualAppearance: "Carved jade flask containing swirling silver liquid with glowing golden suspended runes",
        narrativeSignificance: "Can disable clockwork constructs or reveal concealed mechanical conduits",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_jin",
        ownerCharacterName: "Jin Song",
        icon: "droplet"
      },
      {
        id: "prop_jade_dagger",
        name: "Twin Cicada Blades",
        description: "Spring-loaded concealed blades crafted from sharpened black jade",
        visualAppearance: "Slender throwing daggers etched with silent wind talismans",
        narrativeSignificance: "Can bypass the magnetic armor of imperial guardians",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_meiling",
        ownerCharacterName: "Mei Ling",
        icon: "crosshair"
      }
    ],
    environments: [
      {
        id: "env_chang_an",
        name: "Pavilion of the Thousand Springs",
        lighting: "Warm amber lantern light reflecting off flowing mercury channels and polished dark cedar",
        atmosphere: "Gentle chiming of brass wind-chimes, soft hiss of steam exhaust, drifting sandalwood incense",
        colorPalette: "Imperial Gold #ffd700, Lacquer Crimson #c62828, Deep Jade #004d40",
        architecturalStyle: "Soaring multi-tiered pagoda with intricate wooden joinery and exposed brass waterwheels"
      }
    ],
    options: [
      { id: "A", title: "Dissect the Imperial Cipher Core", text: "Take three minutes to pry the cipher from the automaton's chest to prove the conspiracy to the Grand Chancellor.", dramaticHook: "Risk being cornered inside the pavilion by the advancing guard.", expectedConsequence: "Obtains concrete proof of treason but forces an immediate close-quarters fight." },
      { id: "B", title: "Escape via Silk Glider over the Rooftops", text: "Ignite the smoke pots and launch Mei Ling's folding silk glider from the upper balcony into the night air.", dramaticHook: "Breathless rooftop escape pursued by clockwork falcons.", expectedConsequence: "Safely escapes the encirclement but leaves the automaton behind for enemies to trace." }
    ]
  },

  // 8. Cyber-Gothic / Planetary Siege
  {
    title: "Gothic Binary: Cathedral of the Machine God",
    genre: "Cyber-Gothic / Philosophical Sci-Fi",
    tagline: "In the shadow of a billion prayer-servers, the angels are made of titanium and code.",
    initialPlot: "On the war-torn forge-world of Sanctum Primus, cyber-inquisitor Sister Vaelen investigates a sentient neural anomaly deep within the subterranean basilica of the Machine Cult. The anomaly claims to be the resurrection of the world's divine architect — but its transmission is corrupting the battle servitors into an apocalyptic rebellion.",
    masterArcThread: "A 50-step gothic investigation through soaring basalt cathedrals and smoking data crypts to decide whether to venerate the synthetic deity or purge it in atomic fire.",
    cinematicStyle: "70mm Dark Monochrome with Runic Gold Key, Heavy Incense Smog, Blinding Stained-Glass Flares, Chiaroscuro",
    targetTheme: "Faith, Transhumanist Deification and Divine Machine Madness",
    firstStepTitle: "The Descent into the Data Vault",
    firstStepSynopsis: "Sister Vaelen descends the spiral stone staircase into the grand nave of the cathedral. Holographic cherubs flickers with glitching red errors as prayer-server bells toll.",
    firstStepDialogue: "Vaelen: 'The logic-chant is broken. The Machine God is not speaking in prayers... It is screaming.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Vaelen", text: "The logic-chant is broken. It is not speaking in prayers... It is screaming.", textEs: "El canto lógico está roto. No está rezando... Está gritando." },
      { start: 7.0, end: 14.0, speaker: "Deacon Cruz", text: "The cathedral servitors have severed their link to the synod! Cleanse them!", textEs: "¡Los servidores de la catedral cortaron el enlace con el sínodo! ¡Purifíquenlos!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    characters: [
      {
        id: "char_vaelen",
        name: "Sister Vaelen",
        role: "Cyber-Inquisitor / Protagonist",
        visualTraits: "33yo female, stark white cropped hair, golden bionic eye engraved with holy scripture, porcelain skin",
        clothing: "Matte-black power armor covered in parchment purity seals and heavy silver rosary chains",
        personality: "Unwavering faith tempered by fierce skepticism of church bureaucracy",
        voiceStyle: "Solemn, reverberant contralto with acoustic chapel resonance",
        voicePrompt: "Solemn, resonant 33-year-old contralto, cathedral acoustic reverb, majestic gravitas, controlled fury.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_cruz",
        name: "Deacon Cruz",
        role: "Techno-Priest of the Crypts",
        visualTraits: "50yo male, face obscured by brass breathing grill and multiple optical lenses",
        clothing: "Crimson hooded cassock with cybernetic mechadendrite tendrils curled around his shoulders",
        personality: "Fanatical, paranoid, terrified of heresy",
        voiceStyle: "Mechanical, synthesized rasp with clicking relays",
        voicePrompt: "Dry 50-year-old synthesized rasp, mechanical clicks between syllables, zealous urgency.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_purifier",
        name: "Consecrated Plasma Halberd",
        description: "Ceremonial polearm channeling superheated plasma along its sanctified edge",
        visualAppearance: "Towering runic polearm with glowing blue plasma blade and inscribed scripture",
        narrativeSignificance: "Capable of cutting through reinforced vault bulkheads and heavy servitors",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_vaelen",
        ownerCharacterName: "Sister Vaelen",
        icon: "shield"
      },
      {
        id: "prop_censer",
        name: "Electrosmoke Censer",
        description: "Incense burner dispensing conductive metallic particles that scramble wireless neural feeds",
        visualAppearance: "Heavy brass skull censer swinging from thick iron chains emitting violet smoke",
        narrativeSignificance: "Disrupts hostile servitor targeting matrices",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_cruz",
        ownerCharacterName: "Deacon Cruz",
        icon: "flame"
      }
    ],
    environments: [
      {
        id: "env_basilica",
        name: "The Crypt of Archangel Zero",
        lighting: "Towering stained-glass windows illuminated by orbital artillery explosions, casting crimson and gold shafts across dark flagstones",
        atmosphere: "Heavy choir chanting, ozone crackle, echoing hydraulic heavy footfalls",
        colorPalette: "Basalt Black #111115, Holy Crimson #b71c1c, Consecrated Gold #ffd54f",
        architecturalStyle: "Monumental brutalist gothic cathedral with miles of exposed copper cables draped like tapestries"
      }
    ],
    options: [
      { id: "A", title: "Commune with the Corrupted Altar", text: "Vaelen kneels and connects her neural inquisitor interface to the altar to interrogate the entity directly.", dramaticHook: "Risk of heretical viral infection or enlightenment.", expectedConsequence: "Learns the true origin of the anomaly but exposes her mind to severe digital trauma." },
      { id: "B", title: "Deploy Sanctified Thermal Charges", text: "Order the deacon to set melta-charges at the structural pillars to bury the crypt and the anomaly under a thousand tons of stone.", dramaticHook: "Immediate destruction of irreplaceable sacred relics.", expectedConsequence: "Cuts off the contagion at once but traps the squad in the lower ruins." }
    ]
  },

  // 9. Cosmic Space-Western
  {
    title: "Event Horizon Express: Rail of the Dying Stars",
    genre: "Cosmic Surrealist Western / Sci-Fi Mystery",
    tagline: "The quantum tracks cross supernova graveyards. The ticket price is your memories.",
    initialPlot: "Aboard the star-locomotive 'The Iron Comet', drifting along ancient tachyon rails between decaying star systems, ex-marshal Cole Travis discovers the mysterious conductor has locked the controls on a collision course with a supermassive black hole. Along with gambler Jesse Valentine, Cole must battle outlaws and spatial paradoxes.",
    masterArcThread: "A 50-step carriage-by-carriage battle across shifting dimensional train cars to reach the locomotive core and halt the cosmic plunge.",
    cinematicStyle: "Panavision 2.39:1 Anamorphic, Dusty Sunset Sepia against Deep Cosmic Voids, Whistling Steam, Brass Flare",
    targetTheme: "Redemption, Drifting Frontiers and The Inevitability of Time",
    firstStepTitle: "Carriage 13: The Parlor of Broken Mirrors",
    firstStepSynopsis: "Cole kicks open the mahogany saloon door of Carriage 13. Outside the panoramic observation glass, a dying blue giant star collapses into a dazzling accretion disk.",
    firstStepDialogue: "Cole: 'Ten miles of iron riding a tachyon beam, and every passenger in here is a ghost.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Cole", text: "Ten miles of iron riding a tachyon beam, and every passenger is a ghost.", textEs: "Diez millas de hierro sobre un haz taquiónico, y cada pasajero es un fantasma." },
      { start: 7.0, end: 14.0, speaker: "Jesse", text: "The conductor just dumped the coolant rods into space. We've got twenty minutes!", textEs: "El conductor acaba de expulsar las barras de refrigerante. ¡Tenemos veinte minutos!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    characters: [
      {
        id: "char_cole",
        name: "Cole Travis",
        role: "Ex-Frontier Marshal / Protagonist",
        visualTraits: "45yo male, weather-beaten face, steel-gray mustache, cybernetic right hand with gunmetal finish",
        clothing: "Duster coat of heavy dust-proof canvas over a silver-embroidered vest, wide-brimmed hat",
        personality: "Laconic, observant, haunted by past law enforcement failures",
        voiceStyle: "Low, gravelly Southern drawl with weary authority",
        voicePrompt: "Deep, gravelly 45-year-old Southern baritone, slow drawl, quiet deadly calm in high crisis.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_jesse",
        name: "Jesse Valentine",
        role: "Rogue Quantum Card-Sharp",
        visualTraits: "27yo female, clever green eyes, smirk, fingers constantly shuffling holographic cards",
        clothing: "Velvet tailored waistcoat with brass pocket watch and concealed wrist-derringers",
        personality: "Daring, quick-witted, treats cosmic danger like a high-stakes poker hand",
        voiceStyle: "Playful, energetic mezzo with sardonic bite",
        voicePrompt: "Brisk 27-year-old mezzo, playful cadence, mocking optimism under lethal danger.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_revolver_peace",
        name: "Six-Shot Grav-Revolver",
        description: "Heavy sidearm firing micro-singularities that implode upon target impact",
        visualAppearance: "Blued steel revolver with rotating brass cylinder glowing with gravity distortions",
        narrativeSignificance: "Can punch through magnetic security bulkheads",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_cole",
        ownerCharacterName: "Cole Travis",
        icon: "crosshair"
      },
      {
        id: "prop_quantum_deck",
        name: "Deck of Shifting Fates",
        description: "Holographic cards storing probabilistic reality glitches",
        visualAppearance: "Translucent deck glowing with shifting geometric runes and neon edges",
        narrativeSignificance: "Can jam electronic door locks or briefly freeze local time",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_jesse",
        ownerCharacterName: "Jesse Valentine",
        icon: "disc"
      }
    ],
    environments: [
      {
        id: "env_train_saloon",
        name: "The Gilded Nebula Parlor",
        lighting: "Warm gas lamps illuminating polished mahogany paneling while stellar flares cast electric blue shadows through panoramic windows",
        atmosphere: "Rhythmic clack-clack of tachyon rails, clinking crystal glasses, deep bass hum of fusion boiler",
        colorPalette: "Mahogany Warm Brown #3e2723, Stellar Azure #00b0ff, Brass Gold #ffd700",
        architecturalStyle: "Victorian luxury parlor car merged with interstellar titanium frame and panoramic glass ceiling"
      }
    ],
    options: [
      { id: "A", title: "Uncouple Carriage 13 and Charge the Roof", text: "Sever the magnetic coupler behind them and climb onto the locomotive roof in zero-gravity to sprint toward the engine.", dramaticHook: "Exposed to lethal stellar radiation and vacuum on the train's outer hull.", expectedConsequence: "Bypasses five occupied carriages but exposes the party to cosmic vacuum hazards." },
      { id: "B", title: "Shoot Through the Saloon Barricade", text: "Draw weapons and breach through the outlaw gang entrenched inside the armored sleeper car.", dramaticHook: "Immediate violent firefight at point-blank range.", expectedConsequence: "Secures the carriage with high ammo expenditure and risk of injury." }
    ]
  },

  // 10. Folk & Iron Bio-Horror
  {
    title: "Folk & Iron: The Witching Forest of Karr",
    genre: "Folk Horror / Medieval Bio-Horror",
    tagline: "In the roots beneath the village, wood and clockwork have learned to bleed.",
    initialPlot: "Sent to the isolated mountain village of Karr to investigate a string of missing woodcutters, armored inquisitor Nicholas Thorne and herbalist Greta find the ancient pine forest infected with clockwork parasites that fuse organic timber, human flesh, and brass gears into twisted predatory effigies.",
    masterArcThread: "A 50-step atmospheric journey through ancient misty woods, wicker sanctuaries, and subterranean clockwork roots to sever the parasitic hive heart.",
    cinematicStyle: "35mm Grainy Earth Tones, Thick Volumetric Fog, Candelight and Peat Smoke, Pale Flesh Highlights",
    targetTheme: "Nature corrupted by machine, Ancient Superstition and Sacrificial Guilt",
    firstStepTitle: "The Effigy at the Crossroads",
    firstStepSynopsis: "Nicholas dismounts before an ancient weeping willow. Suspended in its branches is a stag whose heart has been replaced with a ticking brass pendulum that still pulses with blood.",
    firstStepDialogue: "Nicholas: 'This is not pagan witchcraft. Someone planted iron into the very marrow of this wood.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Nicholas", text: "This is not witchcraft. Someone planted iron into the marrow of this wood.", textEs: "Esto no es brujería. Alguien plantó hierro en la médula de este bosque." },
      { start: 7.0, end: 14.0, speaker: "Greta", text: "Listen to the trees... The ticking is spreading underground!", textEs: "Escucha los árboles... ¡El tictac se expande bajo tierra!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    characters: [
      {
        id: "char_nicholas",
        name: "Inquisitor Nicholas Thorne",
        role: "Iron Inquisitor / Protagonist",
        visualTraits: "41yo male, grim chiseled features, blind right eye covered by a scorched iron patch",
        clothing: "Heavy blackened steel breastplate draped in wool traveling cowl, heavy leather boots",
        personality: "Disciplined, observant, haunted by village burnings he commanded in his youth",
        voiceStyle: "Low, stony baritone with measured weight",
        voicePrompt: "Grave, stony 41-year-old baritone, deep breathing, slow deliberate cadence.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_greta",
        name: "Greta of the Pine",
        role: "Village Herbalist & Hedge-Witch",
        visualTraits: "25yo female, moss-green eyes, dark tangled hair adorned with rowan berries, pale skin",
        clothing: "Roughspun linen kirtle with sheepskin vest and leather herb satchel",
        personality: "Intimate with ancient forest lore, fierce, protective of the living woods",
        voiceStyle: "Earthy, melodic alto with urgent intensity",
        voicePrompt: "Warm, earthy 25-year-old alto, whispered folklore cadence, raw emotional honesty.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_flanged_mace",
        name: "Consecrated Sun Mace",
        description: "Heavy iron mace engraved with radiant solar sigils",
        visualAppearance: "Blackened iron mace with flanged blades that glow with heat when striking corrupted clockwork",
        narrativeSignificance: "Only weapon that shatters the hardened bronze bark of the effigies",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_nicholas",
        ownerCharacterName: "Nicholas Thorne",
        icon: "shield"
      },
      {
        id: "prop_rowan_salt",
        name: "Rowan Ash & Salt Pouch",
        description: "Herbal compound that dissolves parasitic machine vines upon contact",
        visualAppearance: "Embroidered leather pouch containing crystalline silver-white powder",
        narrativeSignificance: "Neutralizes clockwork parasites before they burrow into human flesh",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_greta",
        ownerCharacterName: "Greta",
        icon: "feather"
      }
    ],
    environments: [
      {
        id: "env_witch_forest",
        name: "The Gnarled Grove of Karr",
        lighting: "Pale moonlight filtering through dense canopy mist, pierced by the dim amber glow of a burning pine pitch torch",
        atmosphere: "Oppressive silence, metallic clicks echoing in the hollow trunks, heavy scent of wet pine and copper",
        colorPalette: "Pine Green #1b5e20, Peat Brown #3e2723, Rust Amber #ff8f00",
        architecturalStyle: "Twisted primeval pine forest interspersed with moss-covered pagan standing stones"
      }
    ],
    options: [
      { id: "A", title: "Burn the Effigy with Greek Fire", text: "Douse the clicking stag effigy with alchemical pitch and ignite it to incinerate the hive spores.", dramaticHook: "Risk of starting a forest blaze that will alert the clockwork abominations.", expectedConsequence: "Destroys the localized infection but summons predatory effigies from the surrounding mist." },
      { id: "B", title: "Follow the Subterranean Copper Root", text: "Use Greta's rowan salts to track the pulsing root as it burrows deeper into the forgotten coal mines.", dramaticHook: "Descending into pitch-black subterranean labyrinths.", expectedConsequence: "Locates the central nesting chamber while keeping silent." }
    ]
  },

  // 11. Hydro-Punk / Marine Odyssey
  {
    title: "Solaris Drift: The Neon Archipelagos",
    genre: "Hydro-Punk / Marine Action Odyssey",
    tagline: "After the continents drowned, only the swift survive the open waters.",
    initialPlot: "On an Earth whose continents drowned two centuries ago, hydrofoil courier Ren Drake and navigator Lana Kai transport a stolen solar desalination filter across the lawless floating metropolises of the Coral Belt. Hunted by the ironclad war-barges of the Megalodon Consortium, they must navigate coral reefs, typhoons, and corsairs.",
    masterArcThread: "A 50-step high-speed marine odyssey across floating neon markets and sunken skyscraper reefs to bring fresh water to the Free Atolls.",
    cinematicStyle: "Super 35mm Glossy Teals and Vivid Citrus Oranges, Spray Droplets on Lens, Blinding Tropical Sunlight",
    targetTheme: "Freedom, Scarcity and Human Resilience across the Drowned World",
    firstStepTitle: "The Corsairs of Sector Coral",
    firstStepSynopsis: "Ren's dual-engine solar hydrofoil skims across turquoise swells at sixty knots. Behind them, two smoke-belching diesel gunboats breach the waves with harpoon launchers trained on their stern.",
    firstStepDialogue: "Ren: 'Hold on to the deck railing! I am cutting through the submerged highway!'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Ren", text: "Hold on to the deck! I'm cutting through the submerged highway!", textEs: "¡Sujétate a la barandilla! ¡Voy a cortar por la autopista sumergida!" },
      { start: 7.0, end: 14.0, speaker: "Lana", text: "Harpoon locks at two hundred meters! Evasive maneuvers now!", textEs: "¡Fijación de arpones a doscientos metros! ¡Maniobras evasivas ya!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    characters: [
      {
        id: "char_ren",
        name: "Ren Drake",
        role: "Hydrofoil Skimmer Pilot / Protagonist",
        visualTraits: "27yo male, sun-bleached unruly hair, athletic build, polarized amber goggles around neck",
        clothing: "Wetsuit vest over faded denim overalls with magnetic harness clips",
        personality: "Adrenaline junkie, fiercely independent, brilliant improviser on water",
        voiceStyle: "Vibrant, high-energy tenor with maritime slang",
        voicePrompt: "Energetic 27-year-old tenor, outdoor maritime volume, confident laugh under pressure.",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_lana",
        name: "Lana Kai",
        role: "Tide Navigator & Diver",
        visualTraits: "24yo female, deep bronze skin, athletic diver physique, tribal wave tattoos on arms",
        clothing: "Technical dive skin with sonar wrist unit and utility knife strapped to thigh",
        personality: "Intuitive, attuned to ocean currents, cool-headed tactician",
        voiceStyle: "Clear, rhythmic soprano with steady warmth",
        voicePrompt: "Clear 24-year-old soprano, rhythmic cadence, calm authoritative navigation.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_filter",
        name: "Solar Osmosis Core",
        description: "Miniaturized zero-power desalination unit capable of supplying an entire atoll",
        visualAppearance: "Cylindrical chrome and glass pod filled with glowing blue porous crystalline membranes",
        narrativeSignificance: "The priceless device that can end the water wars of the Coral Belt",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_ren",
        ownerCharacterName: "Ren Drake",
        icon: "droplet"
      },
      {
        id: "prop_flare_gun",
        name: "Pneumatic Harpoon Flare",
        description: "Heavy maritime launcher firing magnesium tracking flares and tether lines",
        visualAppearance: "Heavy anodized aluminum pistol with reinforced pneumatic gas canister",
        narrativeSignificance: "Can blind enemy helmsmen or tether floating salvage",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_lana",
        ownerCharacterName: "Lana Kai",
        icon: "crosshair"
      }
    ],
    environments: [
      {
        id: "env_atoll",
        name: "The Neon Floating Market of Typhoon Bay",
        lighting: "Blinding tropical midday sun reflecting off turquoise ocean waves, contrasted with glowing neon signs on tethered barges",
        atmosphere: "Roar of outboard hydrofoil engines, saltwater spray hitting the camera, calls of sea gulls and shouting market traders",
        colorPalette: "Turquoise Azure #00e5ff, Coral Orange #ff5722, Sun Bleached White #ffffff",
        architecturalStyle: "Sprawling floating city built of lashed-together supertankers, shipping containers, and solar catamarans"
      }
    ],
    options: [
      { id: "A", title: "Skim Across the Shallow Coral Atoll", text: "Drop foil foils and skip across the 1-meter shallow reef where heavy pirate gunboats will run aground.", dramaticHook: "Extreme risk of puncturing hydrofoil hulls on razor-sharp staghorn coral.", expectedConsequence: "Loses the pursuers instantly but risks beaching the craft at high speed." },
      { id: "B", title: "Release the Magnesium Oil Slick", text: "Discharge the skimmer's auxiliary biofuel tank and fire a flare to ignite a blazing wall of fire on the water.", dramaticHook: "Burns precious escape fuel in exchange for defensive screen.", expectedConsequence: "Forces gunboats to peel off while cutting your operational range in half." }
    ]
  },

  // 12. Psychological Eldritch Horror
  {
    title: "The Cartographer of Dead Geometries",
    genre: "Psychological Horror / Eldritch Mystery",
    tagline: "The labyrinth doesn't have an exit. It has an appetite.",
    initialPlot: "Architectural historian Arthur Finch enters the subterranean catacombs beneath an abandoned Prague monastery to map an undocumented vault. Inside, he and his assistant Clara discover the walls rearrange themselves according to the surveyor's repressed guilt, leading them into an non-Euclidean city that predates humanity.",
    masterArcThread: "A 50-step mind-bending descent through impossible angular geometries and psychological illusions to solve the mystery of the Architect without losing sanity.",
    cinematicStyle: "German Expressionist Angles, Heavy Chiaroscuro Shadows, Desaturated Sepia with Blood Crimson Accents",
    targetTheme: "Guilt, Madness and The Fragility of Spatial Reality",
    firstStepTitle: "The Hall of Non-Euclidean Arches",
    firstStepSynopsis: "Arthur shines his brass carbide lantern down a corridor whose perspective defies physics. The floor angles upward at forty degrees, yet gravity pulls him sideways.",
    firstStepDialogue: "Arthur: 'The transit compass is spinning... Clara, these walls weren't built by human hands.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Arthur", text: "The compass is spinning... Clara, these walls weren't built by humans.", textEs: "La brújula está girando... Clara, estos muros no fueron hechos por humanos." },
      { start: 7.0, end: 14.0, speaker: "Clara", text: "Look behind you. The doorway we entered through... it's gone.", textEs: "Mira detrás de ti. La puerta por la que entramos... ha desaparecido." }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    characters: [
      {
        id: "char_arthur",
        name: "Dr. Arthur Finch",
        role: "Architectural Historian / Protagonist",
        visualTraits: "46yo male, gaunt features, wire-rim spectacles, disheveled tweed coat, nervous tic in left hand",
        clothing: "Victorian woolen vest, dark overcoat with surveyor compass leather strap across chest",
        personality: "Obsessive academic, analytical, vulnerable to psychological guilt",
        voiceStyle: "Tremulous, cultured British baritone with rising anxiety",
        voicePrompt: "Cultured 46-year-old British baritone, intellectual precision trembling with mounting psychological dread.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_clara",
        name: "Clara Brandt",
        role: "Surveyor Apprentice & Draftswoman",
        visualTraits: "25yo female, observant dark eyes, dark hair pinned in practical chignon, steady gaze",
        clothing: "Sturdy canvas surveyor tunic with brass measuring rulers and leather folio case",
        personality: "Grounded, rational, reluctant to surrender to superstition",
        voiceStyle: "Crisp, determined alto with calm reassurance",
        voicePrompt: "Firm, grounded 25-year-old alto, steady breathing, defiant rationality against madness.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_theodolite",
        name: "Aetheric Brass Theodolite",
        description: "Custom surveying instrument capable of measuring non-Euclidean angles",
        visualAppearance: "Intricate brass instrument with multiple rotating prisms and glowing mercury levels",
        narrativeSignificance: "Detects structural shifts before the stone walls slam shut",
        imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_arthur",
        ownerCharacterName: "Arthur Finch",
        icon: "compass"
      },
      {
        id: "prop_chalk",
        name: "Phosphorescent Survey Chalk",
        description: "Mineral chalk that glows in absolute darkness and marks temporal stable paths",
        visualAppearance: "Luminescent green crystalline chalk sticks stored in a felt-lined tin",
        narrativeSignificance: "Provides the only lifeline back through shifting corridors",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_clara",
        ownerCharacterName: "Clara Brandt",
        icon: "pen"
      }
    ],
    environments: [
      {
        id: "env_catacombs",
        name: "The Crypt of Impossible Angles",
        lighting: "Pulsing carbide lantern amber light casting erratic, stretching shadows against cyclopean black basalt blocks",
        atmosphere: "Low subterranean hum that vibrates through teeth, whispering echoes of vanished voices, complete absence of air current",
        colorPalette: "Abyssal Black #000000, Carbide Amber #ffa000, Phosphor Green #64ffda",
        architecturalStyle: "Cyclopean architecture with acute angles and impossible doorways that open onto upside-down chambers"
      }
    ],
    options: [
      { id: "A", title: "Follow the Inverted Staircase Down", text: "Descend the stairs that spiral paradoxically upward into the ceiling.", dramaticHook: "Voluntary surrender to non-Euclidean spatial vertigo.", expectedConsequence: "Leads deeper into the heart of the anomaly while disorienting physical balance." },
      { id: "B", title: "Anchor Phosphor Lines and Retrace Steps", text: "Hammer iron pitons into the stone and systematically map the perimeter with glowing chalk.", dramaticHook: "Disciplined scientific refusal to accept the illusion.", expectedConsequence: "Stabilizes the immediate chamber but risks running out of supplies." }
    ]
  },

  // 13. Military Sci-Fi / Polar Survival
  {
    title: "Valkyrie Down: Frostbite Protocol",
    genre: "Military Sci-Fi / Polar Survival",
    tagline: "Minus sixty degrees. A downed gunship. And something hunting in the whiteout.",
    initialPlot: "When stealth dropship Valkyrie-4 crashes inside the forbidden glacial Exclusion Zone of Europa, Sergeant Jack Morales and combat medic Kira Vance find themselves stranded in a howling blizzard at minus sixty. With the dropship's reactor leaking thermal heat, extraterrestrial burrowing stalkers emerge from the ice crust.",
    masterArcThread: "A 50-step military survival thriller across glacial crevasses and abandoned colonial boreholes to transmit an orbital distress beacon before hypothermia sets in.",
    cinematicStyle: "Anamorphic 35mm, Blinding Whiteout Snow, Icy Steel Blues and Emergency Flare Crimson, Frost-Vignetted Optics",
    targetTheme: "Duty, Survival Grit and Camaraderie Under Extreme Elements",
    firstStepTitle: "Crash on the Ice Shelf",
    firstStepSynopsis: "Jack kicks open the warped cockpit canopy. A howling blizzard rushes inside as the Valkyrie's starboard engine sputters with blue plasma fire in the sub-zero snow.",
    firstStepDialogue: "Jack: 'Kira, check your thermal seals! If your core temp drops below ninety, you will not wake up.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Jack", text: "Check your thermal seals! If your core temp drops, you won't wake up.", textEs: "¡Revisa tus sellos térmicos! Si tu temperatura cae, no vas a despertar." },
      { start: 7.0, end: 14.0, speaker: "Kira", text: "Motion tracker has contacts beneath the ice! Fifty meters and closing!", textEs: "¡El rastreador detecta contactos bajo el hielo! ¡A cincuenta metros y acercándose!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    characters: [
      {
        id: "char_jack",
        name: "Sgt. Jack Morales",
        role: "Drop-Infantry Squad Leader / Protagonist",
        visualTraits: "38yo male, square jaw, frostbitten cheek, tactical combat scar over left brow",
        clothing: "Heavily insulated arctic exo-rig with titanium knee braces and thermal battery pack",
        personality: "Grit-fueled survivor, protective of his squad, calm under fire",
        voiceStyle: "Low, disciplined military baritone with gravelly resolve",
        voicePrompt: "Disciplined 38-year-old military baritone, frost-chapped cadence, steady leadership under freezing combat.",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_kira",
        name: "Cpl. Kira Vance",
        role: "Combat Medic & Cryo-Specialist",
        visualTraits: "28yo female, sharp brown eyes, frost-tipped eyelashes, tactical helmet with HUD visor",
        clothing: "Cold-weather tactical armor with red medical chevron and trauma injector sleeve",
        personality: "Tenacious, highly trained, refuses to leave wounded behind",
        voiceStyle: "Sharp, urgent mezzosoprano with tactical composure",
        voicePrompt: "Focused 28-year-old mezzosoprano, rapid triage cadence, urgent clarity over blizzard howling.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_beacon",
        name: "Orbital Uplink Transponder",
        description: "High-frequency cryo-hardened transmitter capable of piercing Europa's ice-aurora",
        visualAppearance: "Heavy olive-drab tactical case with telescoping carbon-fiber antenna mast",
        narrativeSignificance: "Sole link to the fleet carrier in high orbit",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_jack",
        ownerCharacterName: "Jack Morales",
        icon: "radio"
      },
      {
        id: "prop_thermal_lance",
        name: "Magnesium Breach Flare Gun",
        description: "Survival flare gun capable of igniting underwater ice-methane deposits",
        visualAppearance: "Heavy orange break-action flare pistol loaded with phosphorus magnesium cartridges",
        narrativeSignificance: "Can blind ice predators or provide instantaneous 1000-degree emergency heat",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_kira",
        ownerCharacterName: "Kira Vance",
        icon: "crosshair"
      }
    ],
    environments: [
      {
        id: "env_ice_shelf",
        name: "The Europa Glacial Exclusion Zone",
        lighting: "Howling whiteout blizzard illuminated by the pale cyan glow of Jupiter overhead and sputtering orange engine fire",
        atmosphere: "Deafening arctic winds, shattering ice crust under foot, shrieks of unseen predators in the storm",
        colorPalette: "Glacial Cyan #00e5ff, Blizzard White #ffffff, Distress Orange #ff3d00",
        architecturalStyle: "Barren ice ridges and bottomless crevasse chasms cutting through ancient frozen seas"
      }
    ],
    options: [
      { id: "A", title: "Dig In Behind the Downed Valkyrie Hull", text: "Use the smoking engine wreckage as a thermal shelter and establish a defensive perimeter with automatic sentry guns.", dramaticHook: "Holds ground with failing battery power against subterranean burrowers.", expectedConsequence: "Provides immediate thermal warmth but pins the squad in a known crash site." },
      { id: "B", title: "March Toward the Borehole Research Outpost", text: "Venture immediately into the whiteout storm to reach the underground colonial bunker two kilometers north.", dramaticHook: "Treacherous blizzard march with zero visibility.", expectedConsequence: "Keeps moving toward permanent rescue but risks separation in the whiteout." }
    ]
  },

  // 14. Cyber-Samurai Neo-Tokyo
  {
    title: "Neon Bushido: Way of the Synthetic Ronin",
    genre: "Cyber-Samurai / Feudal Dystopia",
    tagline: "When steel meets cybernetics, honor is measured in nanoseconds.",
    initialPlot: "In the rain-drenched megacity of Neo-Kyoto in 2144, disgraced cyber-samurai Jinzo Kuroda refuses to execute an order to wipe the memories of an escaped synthetic geisha named Saki, who carries the genetic blueprints of a new human consciousness. Marked for death by the Arasaka-style Kurogane Syndicate, Jinzo draws his high-frequency monomolecular blade.",
    masterArcThread: "A 50-step stylish cyber-action epic across neon skyscraper rooftops, sensory teahouses, and industrial cyber-docks fighting syndicate executioners to reach the sanctuary shrine.",
    cinematicStyle: "Ultra-Wide Anamorphic, Wet Neon Reflections, Vibrant Sakura Pink and Deep Cobalt Blue, Razor-Sharp Motion Blur",
    targetTheme: "Honor, Sentience and The Cost of Breaking Corporate Oaths",
    firstStepTitle: "Rain on the Shinjuku Catwalk",
    firstStepSynopsis: "Jinzo stands motionless under the neon rain on an eighty-story skybridge. Ahead, four syndicate cyber-ninjas drop from cloaked hovercraft with drawn vibro-katanas.",
    firstStepDialogue: "Jinzo: 'You come with Kurogane warrants. But on this bridge, my blade answers only to Bushido.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Jinzo", text: "You come with corporate warrants. On this bridge, my blade answers to Bushido.", textEs: "Vienen con órdenes corporativas. En este puente, mi espada responde al Bushido." },
      { start: 7.0, end: 14.0, speaker: "Saki", text: "Jinzo, they've disabled the skybridge magnets! The floor is giving way!", textEs: "¡Jinzo, desactivaron los imanes del puente! ¡El suelo está cediendo!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    characters: [
      {
        id: "char_jinzo",
        name: "Jinzo Kuroda",
        role: "Rogue Cyber-Samurai / Protagonist",
        visualTraits: "36yo male, stoic expression, chrome cybernetic prosthetic arm with carbon-weave muscle fibers, braided topknot",
        clothing: "Graphite tactical haori coat over ballistic armor plates, traditional sandals reinforced with grav-dampeners",
        personality: "Disciplined, quiet, bound by ancient code of honor in a lawless cyberpunk era",
        voiceStyle: "Low, raspy, authoritative Japanese-accented baritone",
        voicePrompt: "Low, measured 36-year-old baritone, stoic Japanese delivery, razor-sharp discipline, quiet deadly calm.",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_saki",
        name: "Saki",
        role: "Awakened Synthetic Courier",
        visualTraits: "22yo synthetic female, porcelain face with subtle glowing seam-lines, violet irises, sleek black bob",
        clothing: "Translucent neon kimono duster over cybernetic combat chassis",
        personality: "Curious, newly emotional, determined to preserve her identity",
        voiceStyle: "Soft, melodic soprano with synthetic crystalline clarity",
        voicePrompt: "Delicate 22-year-old soprano, pure crystalline timbre, synthetic harmonic undertone, growing courage.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_katana",
        name: "Muramasa High-Frequency Blade",
        description: "Monomolecular edge vibrating at ultrasonic frequencies to slice through heavy armor",
        visualAppearance: "Matte black katana blade shimmering with a violent electric crimson vibrational aura",
        narrativeSignificance: "Jinzo's family heirloom, capable of deflecting plasma projectiles",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_jinzo",
        ownerCharacterName: "Jinzo Kuroda",
        icon: "sword"
      },
      {
        id: "prop_neural_core",
        name: "Genesis Data Shard",
        description: "Secure storage wafer containing the origin code of synthetic consciousness",
        visualAppearance: "Hexagonal glass wafer glowing with swirling liquid sakura-blossom light",
        narrativeSignificance: "The syndicate's ultimate secret that can grant machines true souls",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_saki",
        ownerCharacterName: "Saki",
        icon: "disc"
      }
    ],
    environments: [
      {
        id: "env_skybridge",
        name: "Neo-Kyoto Upper Skybridge",
        lighting: "Torrential rain reflecting towering holographic geishas and neon advertisements in blazing magenta, electric cyan, and gold",
        atmosphere: "Wind whipping rain against glass, roaring traffic of autonomous flying cars beneath, crackling thunder",
        colorPalette: "Cyber Neon Pink #ff007f, Electric Cyan #00f0ff, Wet Asphalt Black #0a0a12",
        architecturalStyle: "Futuristic suspension bridge connecting colossal megalithic skyscrapers eighty stories above street level"
      }
    ],
    options: [
      { id: "A", title: "Iaido Strike through the Vanguard", text: "Execute an ultrasonic draw-and-strike dash to bisect the squad leader before the ninjas can deploy their cloaks.", dramaticHook: "High-speed offensive gamble with instant lethality.", expectedConsequence: "Neutralizes the commander immediately but leaves Jinzo surrounded by remaining assassins." },
      { id: "B", title: "Sever the Skybridge Cables", text: "Cut the magnetic bridge suspension cables with a single strike, sending the assassin squad plunging into the lower city.", dramaticHook: "Destroys their own escape path across the chasm.", expectedConsequence: "Eliminates all attackers at once but forces a perilous leap onto a passing cargo drone." }
    ]
  },

  // 15. Retro-Futurist Dieselpunk
  {
    title: "Aether & Ash: The Iron Corsair",
    genre: "Dieselpunk Airborne Odyssey / Aerial Heist",
    tagline: "Rule the clouds, or burn on the tarmac.",
    initialPlot: "In an alternate 1938 where colossal armored dreadnought zeppelins dominate the skies, sky-pirate captain Silas Thorne plans the greatest heist in aviation history: boarding the Imperial Treasury Zeppelin 'Kaiserin' mid-flight over the stormy Alps to liberate the stolen bullion of fallen European republics.",
    masterArcThread: "A 50-step high-altitude dieselpunk thriller involving aerial dogfights, grappling-hook sky breaches, and mutinies inside smoking engine rooms.",
    cinematicStyle: "35mm Grainy Sepia and Oiled Steel, Heavy Diesel Exhaust Plumes, Blinding Searchlight Beams, Brass Rivets",
    targetTheme: "Audacity, Freedom in the Skies and Anti-Imperial Resistance",
    firstStepTitle: "Boarding the Kaiserin",
    firstStepSynopsis: "Silas leans out of his custom biplane cockpit as it matches speed with the monumental black hull of the Kaiserin Zeppelin. Lightning illuminates miles of riveted armor plating.",
    firstStepDialogue: "Silas: 'Hook deployed! Stand by to breach through the port engine gondola!'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Silas", text: "Grapple hook deployed! Stand by to breach the port gondola!", textEs: "¡Gancho desplegado! ¡Listos para penetrar la góndola de babor!" },
      { start: 7.0, end: 14.0, speaker: "Gwen", text: "Flak turrets are rotating our way! Ten seconds before they open fire!", textEs: "¡Las torretas antiaéreas rotan hacia aquí! ¡Diez segundos antes de que disparen!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    characters: [
      {
        id: "char_silas",
        name: "Capt. Silas Thorne",
        role: "Sky Corsair Captain / Protagonist",
        visualTraits: "39yo male, rakish smirk, leather aviator cap, scarred jawline, piercing gray eyes",
        clothing: "Heavy shearling flight jacket with brass brassard and twin shoulder holsters",
        personality: "Dashing, fearless tactician, sworn enemy of imperial despots",
        voiceStyle: "Booming, charismatic mid-Atlantic baritone with pirate swagger",
        voicePrompt: "Resonant, charismatic 39-year-old baritone, 1930s newsreel clarity, confident swagger under fire.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_gwen",
        name: "Gwen 'Spark' Kelly",
        role: "Chief Sky-Wrench & Demolitionist",
        visualTraits: "26yo female, copper goggles pushed up into curly red hair, smudge of soot on nose",
        clothing: "Padded flight dungarees loaded with dynamite sticks, spanners, and ignition wires",
        personality: "Explosive enthusiast, genius mechanic, zero fear of heights",
        voiceStyle: "Brisk, cheerful Irish alto with punchy rhythm",
        voicePrompt: "Spirited 26-year-old alto, Irish cadence, infectious audacity under anti-aircraft bombardment.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_grapple",
        name: "Pneumatic Sky-Grapple",
        description: "High-pressure winch firing tungsten anchor claws with braided steel cable",
        visualAppearance: "Heavy brass and mahogany rifle with coiled steel cable spool and twin pneumatic tanks",
        narrativeSignificance: "Secures boarding lines to aircraft flying at 200 miles per hour",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_silas",
        ownerCharacterName: "Silas Thorne",
        icon: "tool"
      },
      {
        id: "prop_timer_bomb",
        name: "Clockwork Nitro-Bomb",
        description: "Compact demolition charge with precision Swiss brass timer",
        visualAppearance: "Bundle of red dynamite sticks bound in brass bands with ticking pocket-watch trigger",
        narrativeSignificance: "Can breach armored vault doors or disable massive propellor drives",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_gwen",
        ownerCharacterName: "Gwen Kelly",
        icon: "zap"
      }
    ],
    environments: [
      {
        id: "env_zeppelin_hull",
        name: "The Exterior Catwalk of the Kaiserin",
        lighting: "Flashing lightning strikes through heavy storm clouds, piercing searchlight beams sweeping over wet black duralumin plating",
        atmosphere: "Roar of sixteen massive Maybach diesel engines, shrieking 100-knot winds, clatter of spent flak shells",
        colorPalette: "Gunmetal Gray #37474f, Storm Navy #0d1b2a, Blinding White Searchlight #ffffff",
        architecturalStyle: "Monumental 800-foot armored airship with riveted plating, machine gun blisters, and exterior catwalks"
      }
    ],
    options: [
      { id: "A", title: "Blow the Port Engine to Cut Airship Speed", text: "Gwen plants a nitro-bomb on the main crankshaft to disable two engines, stabilizing the catwalk for boarding.", dramaticHook: "May cause the airship to list violently or catch fire.", expectedConsequence: "Slows the zeppelin down but alerts the entire imperial security battalion inside." },
      { id: "B", title: "Zip-Line Straight to the Cargo Bay Hatch", text: "Hook zip-line pulleys directly to the cargo bay guide rail and slide through open flak fire into the hangar.", dramaticHook: "Direct sky-dive through tracer ammunition.", expectedConsequence: "Breaches the interior in three seconds with heavy risk of taking fire." }
    ]
  },

  // 16. Xenobiology Alien Jungle
  {
    title: "The Genesis Seed: Jungle of the Bio-Architects",
    genre: "Xenobiology / Alien Jungle Survival",
    tagline: "The ecosystem is not wild. It is engineering a replacement for us.",
    initialPlot: "On alien exoplanet Kepler-452b, botanist Dr. Maya Thorne and scout Noah Reed explore the iridescent canopy of an alien super-organism jungle known as the Emerald Lattice. When their scout ship is seized by sentient bio-vines, they discover the planet is an ancient seed-engine designed to convert human carbon into a planetary neural matrix.",
    masterArcThread: "A 50-step xenobiological exploration across bioluminescent root bridges, spore storms, and living bio-temples to extract the master genetic key and escape the planet.",
    cinematicStyle: "Cooke Anamorphic, Radiant Emerald and Violet Bioluminescence, Floating Spore Motifs, Hyper-Detailed Macro Depth",
    targetTheme: "Symbiosis, Alien Evolution and The Definition of Consciousness",
    firstStepTitle: "The Awakening of the Spore Canopy",
    firstStepSynopsis: "Maya kneels before a massive crystalline flower that pulses with golden pollen. As she touches the petal, thousands of bio-luminescent tendrils awaken throughout the canopy above.",
    firstStepDialogue: "Maya: 'The plant's genetic sequence is responding to my body heat... Noah, it's learning our language.'",
    firstStepSubtitles: [
      { start: 1.0, end: 6.5, speaker: "Maya", text: "The sequence is responding to body heat... Noah, it's learning our language.", textEs: "La secuencia responde al calor corporal... Noah, aprende nuestro idioma." },
      { start: 7.0, end: 14.0, speaker: "Noah", text: "The vines are wrapping around our thrusters! We're losing lift!", textEs: "¡Las lianas envuelven nuestros propulsores! ¡Perdemos sustentación!" }
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    characters: [
      {
        id: "char_maya_t",
        name: "Dr. Maya Thorne",
        role: "Chief Xenobotanist / Protagonist",
        visualTraits: "30yo female, sharp green eyes, sun-bleached ponytail, scanning visor over left eye",
        clothing: "Lightweight field research biosuit with botanical specimen vials strapped to vest",
        personality: "Brilliant, empathetic towards alien life, courageous under unknown phenomena",
        voiceStyle: "Awe-filled, articulate soprano with scientific focus",
        voicePrompt: "Breathless 30-year-old soprano, articulate scientific cadence, authentic awe and scientific composure.",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      },
      {
        id: "char_noah",
        name: "Noah Reed",
        role: "Expedition Scout & Tracker",
        visualTraits: "34yo male, rugged athletic frame, watchful dark eyes, tactical knife holster on chest",
        clothing: "Camouflage survival poncho over reinforced impact armor",
        personality: "Cautious, protective, expert in reading predatory movement",
        voiceStyle: "Quiet, calm baritone with hunter instincts",
        voicePrompt: "Quiet, focused 34-year-old baritone, watchful hunter cadence, swift tactical assessment.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        stepIntroduced: 1
      }
    ],
    props: [
      {
        id: "prop_scanner",
        name: "Quantum Bio-Spectrometer",
        description: "Handheld scanner that maps xenobiological DNA sequences in real time",
        visualAppearance: "Matte white ergonomic scanner with holographic display projecting glowing helical DNA strands",
        narrativeSignificance: "Can predict predatory vine strikes before they lash out",
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_maya_t",
        ownerCharacterName: "Maya Thorne",
        icon: "disc"
      },
      {
        id: "prop_sonic_blade",
        name: "High-Frequency Machete",
        description: "Vibrating survival blade that severs tough fibrous bio-vines without sparking",
        visualAppearance: "Titanium alloy machete with glowing turquoise sonic emitter groove along the spine",
        narrativeSignificance: "Clears pathways through impenetrable living root barriers",
        imageUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=600&auto=format&fit=crop&q=80",
        stepIntroduced: 1,
        ownerCharacterId: "char_noah",
        ownerCharacterName: "Noah Reed",
        icon: "sword"
      }
    ],
    environments: [
      {
        id: "env_alien_jungle",
        name: "The Emerald Lattice Canopy",
        lighting: "Dense bioluminescent canopy glowing in pulsating emerald, violet, and gold, filtering strange dual-sunlight",
        atmosphere: "Gentle hum of vibrating plant fibers, drifting glowing spore motes, distant melodic calls of airborne xenomorphs",
        colorPalette: "Bioluminescent Emerald #00e676, Deep Spore Violet #7c4dff, Amber Pollen #ffb300",
        architecturalStyle: "Colossal miles-high alien trees intertwined with crystalline flowers that act as organic computing nodes"
      }
    ],
    options: [
      { id: "A", title: "Harvest the Primary Seed Pod", text: "Carefully extract the glowing pollen core to synthesize an antidote to the neuro-spores.", dramaticHook: "Risk triggering a defensive neurotoxic pollen release.", expectedConsequence: "Secures the vital research sample but causes surrounding bio-vines to thrash violently." },
      { id: "B", title: "Sever the Entangling Roots with Sonic Blades", text: "Slice the vines pinning the scout ship's engine nacelles to restore thrust before the hive awakens.", dramaticHook: "Direct mechanical escape before the canopy closes.", expectedConsequence: "Frees the ship's engines but damages the extraction gear." }
    ]
  }
];

/**
 * Returns a unique story preset guaranteed not to duplicate any existing movie title in the database.
 * If all 16 base presets have already been used, procedurally appends saga/part variations so
 * duplicates are mathematically impossible.
 */
export function getUniqueStoryPreset(existingTitles: string[] = []): (typeof PRESET_STORIES)[0] {
  const normalizedExisting = new Set(
    existingTitles.map(t => (t || '').trim().toLowerCase()).filter(Boolean)
  );

  // Find all presets whose base title has NOT been used in the database
  const unusedPresets = PRESET_STORIES.filter(
    p => !normalizedExisting.has(p.title.trim().toLowerCase())
  );

  if (unusedPresets.length > 0) {
    const pick = unusedPresets[currentStoryRotation % unusedPresets.length];
    currentStoryRotation++;
    return pick;
  }

  // If ALL 16 base presets have already been used in the database, procedurally
  // generate a unique saga/cycle title so no two movies ever collide.
  const base = PRESET_STORIES[currentStoryRotation % PRESET_STORIES.length];
  currentStoryRotation++;

  const romanNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const sagaSubtitles = [
    'Resurgence',
    'The Reckoning',
    'Shadows of the Fallen',
    'Ascension Protocol',
    'Blackout Echo',
    'Final Threshold',
    'Zero Hour',
    'The Obsidian Horizon',
    'Genesis Convergence',
    'Twilight of the Sentinels'
  ];

  let uniqueTitle = '';
  for (const num of romanNumerals) {
    const candidate = `${base.title}: Part ${num}`;
    if (!normalizedExisting.has(candidate.toLowerCase())) {
      uniqueTitle = candidate;
      break;
    }
  }

  if (!uniqueTitle) {
    for (const sub of sagaSubtitles) {
      const candidate = `${base.title} - ${sub}`;
      if (!normalizedExisting.has(candidate.toLowerCase())) {
        uniqueTitle = candidate;
        break;
      }
    }
  }

  if (!uniqueTitle) {
    uniqueTitle = `${base.title} (Cycle ${Date.now().toString().slice(-4)})`;
  }

  return {
    ...base,
    title: uniqueTitle
  };
}

export function buildProceduralStoryBible(candidate: {
  title: string;
  genre: string;
  logline?: string;
  premise?: string;
}): GeneratedStoryBible {
  const title = candidate.title || "The Wandering Ronin: Path of Sakura";
  const genre = candidate.genre || "Samuráis & Chambara / Bushido Honor & Duels";
  const tagline = candidate.logline || `In the world of ${title}, every audience decision shapes honor and destiny.`;
  const initialPlot = candidate.premise || `An epic samurai journey begins across driving autumn rainstorms.`;

  const isSamurai = genre.toLowerCase().includes('samur') || genre.toLowerCase().includes('chambara') || title.toLowerCase().includes('blade') || title.toLowerCase().includes('ronin');
  const isWestern = genre.toLowerCase().includes('western') || genre.toLowerCase().includes('gunslinger');
  const isHorror = genre.toLowerCase().includes('horror') || genre.toLowerCase().includes('creature');
  const isComedy = genre.toLowerCase().includes('comedy') || genre.toLowerCase().includes('comedia');
  const isFantasy = genre.toLowerCase().includes('fantas') || genre.toLowerCase().includes('sword');

  let defaultVideo = CINEMATIC_MOCK_VIDEOS[0].url;
  if (isSamurai) defaultVideo = CINEMATIC_MOCK_VIDEOS[1 % CINEMATIC_MOCK_VIDEOS.length].url;
  else if (isWestern) defaultVideo = CINEMATIC_MOCK_VIDEOS[2 % CINEMATIC_MOCK_VIDEOS.length].url;
  else if (isHorror) defaultVideo = CINEMATIC_MOCK_VIDEOS[3 % CINEMATIC_MOCK_VIDEOS.length].url;
  else if (isFantasy) defaultVideo = CINEMATIC_MOCK_VIDEOS[0].url;

  const charName = isSamurai ? "Kuroshiba (The Wandering Ronin)" : isWestern ? "Cole Travis" : isFantasy ? "Donald of Eldoria" : "Protagonist";
  const propName = isSamurai ? "Ancestral Katana of the Autumn Wind" : isWestern ? "Engraved Peacemaker Revolver" : isFantasy ? "Sun-Forged Blade" : "Sacred Artifact";
  const envName = isSamurai ? "Rain-Drenched Mountain Pass & Torii Shrine" : isWestern ? "Dusty Frontier Saloon & Main Street" : isFantasy ? "Mist-Shrouded Citadel of Valdoria" : "Opening Arena";

  const firstChar: Character = {
    id: "char_lead",
    name: charName,
    role: "Lead Protagonist",
    visualTraits: isSamurai ? "Weathered 38yo ronin with a disciplined gaze, scarred jawline, tied topknot, raindrops beading on forehead" : "Determined hero with intense focus, practical battle attire, scarred face",
    clothing: isSamurai ? "Dark indigo hemp kimono with worn shoulder stitching, leather arm guards, straw rain cloak" : "Weathered leather traveling coat and tactical boots",
    personality: "Stoic, honorable, observant, unflinching in the face of insurmountable odds",
    voiceStyle: "Deep, gravelly baritone with disciplined cadence",
    voicePrompt: "Deep, gravelly 38-year-old baritone, calm and measured tempo, subtle breath control, authentic cinematic weight",
    avatarUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300"
  };

  const firstProp: Prop = {
    id: "prop_main",
    name: propName,
    description: `Signature item central to the narrative conflict of ${title}.`,
    visualAppearance: isSamurai ? "Hand-folded tamahagane steel blade with wave hamon pattern, blackened iron tsuba, ray-skin handle wrap" : "Polished steel artifact etched with ancient runes and subtle glow",
    narrativeSignificance: "The physical catalyst that anchors the protagonist's vow and purpose.",
    ownerCharacterId: "char_lead",
    ownerCharacterName: charName,
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600"
  };

  const firstEnv: SceneEnvironment = {
    id: "env_primary",
    name: envName,
    lighting: "Cinematic moody lighting, high contrast chiaroscuro with atmospheric mist and god rays, 3200K key light",
    atmosphere: "Tense, atmospheric, epic, cinematic scale",
    colorPalette: isSamurai ? "Deep indigo, slate greys, vibrant autumn crimson, dampened earth tones" : "Muted earth tones, amber key lights, atmospheric haze",
    architecturalStyle: isSamurai ? "Feudal Japanese wooden architecture, stone lanterns, weathered cedar torii gates" : "Classical cinematic architecture with rich environmental depth"
  };

  const provisionalOptions: [DecisionOption, DecisionOption] = [
    {
      id: "A",
      title: `${charName}'s Advance`,
      text: `${charName} presses forward along the primary path.`,
      dramaticHook: "Direct continuation of current momentum.",
      expectedConsequence: "Maintains initiative while advancing the narrative.",
      votes: 0
    },
    {
      id: "B",
      title: "Tactical Reconnaissance",
      text: `${charName} scouts the perimeter for environmental advantages.`,
      dramaticHook: "Cautious survey of opposing forces.",
      expectedConsequence: "Provides tactical clarity at the cost of immediate ground.",
      votes: 0
    }
  ];

  const initialSteps: MovieStep[] = [
    {
      stepNumber: 1,
      title: "Act I: The Inciting Threshold",
      synopsis: `Minute 1 First-Shot (Part 1/4): ${initialPlot.slice(0, 160)}`,
      dialogueSnippet: `${charName}: 'The oath is sworn. The path ahead admits no hesitation.'`,
      subtitles: [
        { start: 1.0, end: 7.0, speaker: charName, text: "The oath is sworn. The path ahead admits no hesitation.", textEs: "El juramento está hecho. El camino no admite vacilación." },
        { start: 8.0, end: 14.0, speaker: charName, text: "They are approaching from the ridge. Ten seconds to prepare.", textEs: "Se aproximan desde la cresta. Diez segundos para prepararse." }
      ],
      voiceDirection: firstChar.voicePrompt,
      visualPrompt: `Establishing Low-Angle Hero Shot of ${charName} (${firstChar.visualTraits}, ${firstChar.clothing}) holding ${propName} (${firstProp.visualAppearance}) in ${envName}. Deep spatial perspective, ${firstEnv.lighting}. Shot on Panavision C-series 35mm anamorphic glass, oval bokeh, horizontal streak flare, atmospheric mist, Kodak Vision3 500T grain, 480p 16:9 film still`,
      cameraMotionPrompt: "Technocrane crane sweep beginning low on subject then ascending smoothly into a high-angle panoramic reveal of the environment, 24fps motion blur",
      videoUrl: defaultVideo,
      duration: 15,
      votingWindowSeconds: 0,
      activeCharacters: [firstChar.id],
      activeProps: [firstProp.id],
      propReferenceImages: [],
      environment: firstEnv.id,
      createdAt: new Date().toISOString(),
      options: provisionalOptions
    },
    {
      stepNumber: 2,
      title: "Act I: Rising Vanguard",
      synopsis: `Minute 1 First-Shot (Part 2/4): Hostile scouts emerge across the mist. ${charName} advances with calculated precision.`,
      dialogueSnippet: `${charName}: 'Stand your ground.'`,
      subtitles: [
        { start: 1.0, end: 7.0, speaker: charName, text: "Stand your ground. Steel tests steel today.", textEs: "Mantengan su posición. El acero probará al acero hoy." },
        { start: 8.0, end: 14.0, speaker: charName, text: "The vanguard has arrived.", textEs: "La vanguardia ha llegado." }
      ],
      voiceDirection: firstChar.voicePrompt,
      visualPrompt: `Cowboy Shot of ${charName} (${firstChar.visualTraits}) in coiled tactical posture navigating ${envName}. Mid-thigh framing with ${propName} secured, cross-lighting with 3000K amber key and 6500K cool rim. Cooke S4 prime lens warmth, wet rain reflections, 480p 16:9 film still`,
      cameraMotionPrompt: "Smooth lateral dolly tracking shot on rails parallel to subject, three-layer parallax with blurred foreground bamboo and distant receding mountains, 24fps motion blur",
      videoUrl: defaultVideo,
      duration: 15,
      votingWindowSeconds: 0,
      activeCharacters: [firstChar.id],
      activeProps: [firstProp.id],
      propReferenceImages: [],
      environment: firstEnv.id,
      createdAt: new Date().toISOString(),
      options: provisionalOptions
    },
    {
      stepNumber: 3,
      title: "Act I: The Crucible Closes",
      synopsis: `Minute 1 First-Shot (Part 3/4): Shadows surround the perimeter. A decisive duel is imminent.`,
      dialogueSnippet: `${charName}: 'Every step brings us closer to the breaking point.'`,
      subtitles: [
        { start: 1.0, end: 7.0, speaker: charName, text: "Every step brings us closer to the breaking point.", textEs: "Cada paso nos acerca al punto de quiebre." },
        { start: 8.0, end: 14.0, speaker: charName, text: "Steel yourself. The first choice decides all.", textEs: "Prepárense. La primera decisión lo define todo." }
      ],
      voiceDirection: firstChar.voicePrompt,
      visualPrompt: `Over-the-Shoulder and Macro Insert Shot on ${propName} (${firstProp.visualAppearance}) as ${charName} readies it in ${envName}. Foreground shoulder silhouette softly out of focus, hard light slicing across the blade, 85mm prime at T2.0, creamy background separation, 480p 16:9 film still`,
      cameraMotionPrompt: "Deliberate 2-second rack focus from foreground prop in razor sharpness to background character eyes, creamy circular bokeh, subtle focus breathing",
      videoUrl: defaultVideo,
      duration: 15,
      votingWindowSeconds: 0,
      activeCharacters: [firstChar.id],
      activeProps: [firstProp.id],
      propReferenceImages: [],
      environment: firstEnv.id,
      createdAt: new Date().toISOString(),
      options: provisionalOptions
    },
    {
      stepNumber: 4,
      title: "Act I: The First Standoff",
      synopsis: `Minute 1 First-Shot (Part 4/4): Confronting the vanguard. The audience must choose the tactic.`,
      dialogueSnippet: `${charName}: 'Which way do we strike?'`,
      subtitles: [
        { start: 1.0, end: 7.0, speaker: charName, text: "Which way do we strike? You decide.", textEs: "¿Por dónde atacamos? Ustedes deciden." },
        { start: 8.0, end: 14.0, speaker: charName, text: "Ten seconds to cast your vote.", textEs: "Diez segundos para emitir su voto." }
      ],
      voiceDirection: firstChar.voicePrompt,
      visualPrompt: `Choker Shot and Dutch Angle Close-Up of ${charName} (${firstChar.visualTraits}) at peak dramatic threshold in ${envName}. Forehead to chin tight framing, chiaroscuro lighting, eye catchlights, Panavision anamorphic optical character, immense stakes, 480p 16:9 film still`,
      cameraMotionPrompt: "Imperceptibly slow dolly push-in closing from medium to intense choker shot over 15 seconds, narrowing depth of field, 180-degree shutter 24fps motion blur",
      videoUrl: defaultVideo,
      duration: 15,
      votingWindowSeconds: 10,
      activeCharacters: [firstChar.id],
      activeProps: [firstProp.id],
      propReferenceImages: [],
      environment: firstEnv.id,
      createdAt: new Date().toISOString(),
      options: isSamurai ? [
        { id: "A", title: "Honor of the Iaijutsu Draw", text: "Execute an explosive lightning-fast single-stroke draw straight through the vanguard commander.", dramaticHook: "Maximum lethal precision risking immediate flanking.", expectedConsequence: "Instantly decapitates the enemy leadership but draws the surrounding archers into a furious volley.", votes: 0 },
        { id: "B", title: "Lure into the Bamboo Mist", text: "Feign retreat into the deep bamboo thicket to divide their forces in the fog.", dramaticHook: "Stealth ambush maneuver that uses the storm's terrain.", expectedConsequence: "Splits the hostile unit into disoriented stragglers, giving tactical surprise.", votes: 0 }
      ] : [
        { id: "A", title: "Direct Frontal Assault", text: "Launch a direct offensive to overwhelm the opposing line with superior force.", dramaticHook: "High-risk direct confrontation.", expectedConsequence: "Maximum dramatic tension with immediate fallout.", votes: 0 },
        { id: "B", title: "Flanking Tactical Maneuver", text: "Deploy surrounding elements to outflank and encircle the adversary.", dramaticHook: "Calculated strategic gambit.", expectedConsequence: "Secures tactical advantage while risking delay.", votes: 0 }
      ]
    }
  ];

  return {
    title,
    genre,
    tagline,
    initialPlot,
    masterArcThread: `A 50-step cinematic odyssey across ${genre}, where audience choices determine the survival and legacy of "${title}".`,
    bible: {
      characters: [firstChar],
      props: [firstProp],
      environments: [firstEnv],
      cinematicStyle: isSamurai ? "Akira Kurosawa 35mm Techniscope, High Contrast Black & Rain, Razor Katana Optics" : "Panavision Anamorphic 35mm, High Dynamic Range, 24fps film still",
      targetTheme: "Honor, Sacrifice and Destiny Shaped by Audience Will"
    },
    firstStep: initialSteps[0],
    initialSteps
  };
}

export type StoryBiblePromptInput = string | {
  title?: string;
  genre?: string;
  logline?: string;
  premise?: string;
};

export async function generateStoryBibleWithDeepSeek(
  customPrompt?: StoryBiblePromptInput,
  existingTitles: string[] = []
): Promise<GeneratedStoryBible> {
  const apiKey = getLlmApiKey();

  if (apiKey) {
    try {
      const systemPrompt = `You are an elite Hollywood Director, Master Cinematographer and Screenwriter specializing in grand interactive cinema across diverse classical genres (Superheroes, Anime, 3D Animation, Classic Film Noir, Horror, Psychological Thrillers, Epic Fantasy, Police Procedurals, Historical War, High-Stakes Comedies, Westerns, and Legendary Adventures) with strict visual and audio continuity.
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
   - "cinematicStyle": Must specify the camera package, lenses (e.g. Panavision C-Series anamorphic, Cooke S4/S7, Zeiss Master Prime), lighting setup (e.g. Caravaggio chiaroscuro, Rembrandt key, motivated practical light, Kelvin color temperature), and film stock (e.g. Kodak Vision3 500T, Kodak Double-X).
   - "visualPrompt": Every scene prompt MUST follow the 6-layer Cinematique formula: [Shot Scale/Framing (MCU, Cowboy, ECU, Choker, Low-Angle)] + [Subject & Wardrobe] + [Environment with Foreground/Mid/Background Depth] + [Lighting Rig & Kelvin Temperature] + [Camera Lens, Sensor/Stock & Flare Characteristics] + [Atmosphere & 24fps film still].
   - "cameraMotionPrompt": Every camera motion prompt MUST follow the 4-layer Cinematique motion formula: [Rig & Movement (Steadicam glide, slow dolly push-in, lateral track with 3-layer parallax, Technocrane arc, Dolly zoom vertigo)] + [Pacing & Trajectory] + [Focal Length & Focus Pull/Rack Focus] + [Optical physics & 24fps motion blur].

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Compelling Cinematic Title in English",
  "genre": "Distinct Cinematic Genre (e.g. Superhero, Anime, 3D Animation, Film Noir, Horror, Epic Fantasy, Police Mystery, Psychological Thriller, etc.)",
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

      let targetTitle: string | undefined;
      let targetGenre: string | undefined;
      let targetLogline: string | undefined;
      let targetPremise: string | undefined;

      if (typeof customPrompt === 'object' && customPrompt !== null) {
        targetTitle = customPrompt.title;
        targetGenre = customPrompt.genre;
        targetLogline = customPrompt.logline;
        targetPremise = customPrompt.premise;
      } else if (typeof customPrompt === 'string' && customPrompt.startsWith('{')) {
        try {
          const parsedPrompt = JSON.parse(customPrompt);
          targetTitle = parsedPrompt.title;
          targetGenre = parsedPrompt.genre;
          targetLogline = parsedPrompt.logline;
          targetPremise = parsedPrompt.premise || customPrompt;
        } catch {
          targetPremise = customPrompt;
        }
      } else if (typeof customPrompt === 'string') {
        targetPremise = customPrompt;
      }

      const isRealCustom = Boolean(
        targetTitle ||
        (targetPremise && !targetPremise.startsWith('force_reset_') && targetPremise.trim().length > 3)
      );
      const titleBlacklistNotice = existingTitles.length > 0
        ? `\nTITLES ALREADY IN DATABASE (YOU MUST NOT DUPLICATE ANY OF THESE TITLES): ${existingTitles.slice(-25).map(t => `"${t}"`).join(', ')}\n`
        : '';
      const dynamicGenre = sampleRandom(CREATIVE_GENRES);
      const dynamicProtagonist = sampleRandom(CREATIVE_PROTAGONISTS);
      const dynamicCatalyst = sampleRandom(CREATIVE_CATALYSTS);
      const dynamicAesthetic = sampleRandom(CREATIVE_AESTHETICS);

      const userMessage = targetTitle
        ? `Create the interactive cinema master bible and the 4 opening scenes (1-minute continuous first-shot).
MANDATORY TITLE: You MUST use the exact title "${targetTitle}".
MANDATORY GENRE: You MUST use the exact genre "${targetGenre || 'Cinematic Drama'}".
Logline: "${targetLogline || ''}".
Story Premise: "${targetPremise || ''}".
Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options for Scene 4 in ENGLISH. ${titleBlacklistNotice} Unique entropy: ${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        : isRealCustom
        ? `Create the interactive cinema master bible and the 4 opening scenes (1-minute continuous first-shot) based on this premise: "${targetPremise}". Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options for Scene 4 in ENGLISH. ${titleBlacklistNotice} Unique entropy: ${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        : `Create a high-tension interactive ${dynamicGenre} master bible featuring ${dynamicProtagonist} facing ${dynamicCatalyst} with visual aesthetic of ${dynamicAesthetic}, and the 4 opening scenes (1-minute continuous first-shot). Write all story elements, dialogue, subtitles, character voice prompts, and the 2 voting options for Scene 4 in ENGLISH. Unique entropy: ${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const parsed = await callLlmJson<any>({
        label: 'story-bible',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 1,
        seed: Math.floor(Math.random() * 2147483647),
        max_tokens: 3500,
        timeoutMs: 45000
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
          title: targetTitle || parsed.title,
          genre: targetGenre || parsed.genre,
          tagline: targetLogline || parsed.tagline,
          initialPlot: targetPremise || parsed.initialPlot,
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

  // Procedural Fallback when custom candidate/premise was supplied:
  // NEVER fall back to random PRESET_STORIES! Honor the audience's exact vote!
  let fallbackTargetTitle: string | undefined;
  let fallbackTargetGenre: string | undefined;
  let fallbackTargetLogline: string | undefined;
  let fallbackTargetPremise: string | undefined;

  if (typeof customPrompt === 'object' && customPrompt !== null) {
    fallbackTargetTitle = customPrompt.title;
    fallbackTargetGenre = customPrompt.genre;
    fallbackTargetLogline = customPrompt.logline;
    fallbackTargetPremise = customPrompt.premise;
  } else if (typeof customPrompt === 'string' && customPrompt.startsWith('{')) {
    try {
      const parsedPrompt = JSON.parse(customPrompt);
      fallbackTargetTitle = parsedPrompt.title;
      fallbackTargetGenre = parsedPrompt.genre;
      fallbackTargetLogline = parsedPrompt.logline;
      fallbackTargetPremise = parsedPrompt.premise || customPrompt;
    } catch {
      fallbackTargetPremise = customPrompt;
    }
  } else if (typeof customPrompt === 'string') {
    fallbackTargetPremise = customPrompt;
  }

  if (fallbackTargetTitle || (fallbackTargetPremise && !fallbackTargetPremise.startsWith('force_reset_') && fallbackTargetPremise.trim().length > 3)) {
    console.log(`[Cinema] Using procedural story bible generator for selected film: "${fallbackTargetTitle || 'Custom'}" (${fallbackTargetGenre || 'Epic'}).`);
    return buildProceduralStoryBible({
      title: fallbackTargetTitle || (fallbackTargetPremise ? fallbackTargetPremise.slice(0, 50) : "Blade of the Autumn Wind: The Ronin's Oath"),
      genre: fallbackTargetGenre || "Samuráis & Chambara / Bushido Honor & Duels",
      logline: fallbackTargetLogline || "Under driving autumn rainstorms, a masterless samurai draws his blade to protect the innocent.",
      premise: fallbackTargetPremise || "Authentic Chambara samurai drama inspired by Akira Kurosawa."
    });
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
      options: (preset.options && preset.options.length >= 2)
        ? [
            { ...preset.options[0], id: 'A', votes: 0 },
            { ...preset.options[1], id: 'B', votes: 0 }
          ]
        : [
            {
              id: "A",
              title: `${firstChar.name}'s Decisive Strike`,
              text: `${firstChar.name} executes an aggressive offensive strike to seize the upper hand.`,
              dramaticHook: "High-risk direct confrontation.",
              expectedConsequence: "Maximum dramatic tension with immediate fallout.",
              votes: 0
            },
            {
              id: "B",
              title: "Shadow Infiltration",
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

// 50 unique procedural dilemmas ensuring zero option repetition across entire films
export const PROCEDURAL_DILEMMAS: Array<{
  title: string;
  optA: { title: string; hook: string; consequence: string };
  optB: { title: string; hook: string; consequence: string };
}> = [
  // 1-4: Act I
  {
    title: "Opening Gambit & The Primary Breach",
    optA: { title: "Direct Kinetic Assault", hook: "Full-frontal engagement with maximum shock value", consequence: "Breaches outer gate rapidly but triggers perimeter alarms" },
    optB: { title: "Cloaked Reconnaissance", hook: "Silent telemetry harvest through perimeter shadows", consequence: "Preserves stealth but allows enemy patrol to reposition" }
  },
  {
    title: "Rising Shadows & Secondary Breach",
    optA: { title: "Bypass Security Firewall", hook: "High-speed cryptographic intrusion", consequence: "Disables surveillance cameras for three sectors" },
    optB: { title: "Jam Radio Transmissions", hook: "Wide-spectrum localized frequency jamming", consequence: "Prevents guard reinforcements at cost of own comms" }
  },
  {
    title: "Threshold of the Crucible",
    optA: { title: "Overload Reactor Conduit", hook: "Force a localized electrical surge", consequence: "Creates physical explosion clearing the corridor" },
    optB: { title: "Deploy Chaff Screen", hook: "Heavy particle fog blinding targeting sensors", consequence: "Provides cover for tactical withdrawal" }
  },
  {
    title: "Point of No Return: First Choice",
    optA: { title: "Pierce Central Sub-Grid", hook: "Dive straight into high-risk mainframe core", consequence: "Instant access to enemy archives" },
    optB: { title: "Establish Fallback Perimeter", hook: "Fortify tactical rear position", consequence: "Guarantees safe escape route if ambushed" }
  },
  // 5-10: Inciting breach & first escalation
  {
    title: "Quantum Resonance in Shadows",
    optA: { title: "Overcharge the Access Junction", hook: "Force entry before the biometric lock triggers", consequence: "Rapid breach with imminent lockdown risk" },
    optB: { title: "Deploy Diversionary Pulse", hook: "Blackout three city blocks with EMP", consequence: "Provides silent stealth evacuation through shadows" }
  },
  {
    title: "Monorail Crossfire & High-Speed Pursuit",
    optA: { title: "Decouple the Cargo Carriages", hook: "Sever the train to derail pursuers", consequence: "Halts pursuers but destroys valuable supply crates" },
    optB: { title: "Engage Emergency Magnetic Brakes", hook: "Violent deceleration to throw off enemy boarding squads", consequence: "Sparks close-quarters firefight on the train roof" }
  },
  {
    title: "The OmniaTech Breach",
    optA: { title: "Raid the Armory Depots", hook: "Equip military-grade experimental weaponry", consequence: "Drastically boosts firepower for upcoming waves" },
    optB: { title: "Extract Research Telemetry", hook: "Steal confidential synthetic genome blueprints", consequence: "Uncovers vulnerability in the enemy commander's armor" }
  },
  {
    title: "Encounter in the Catacombs",
    optA: { title: "Form an Uneasy Alliance", hook: "Offer sanctuary in exchange for tactical maps", consequence: "Unlocks forgotten subterranean shortcuts" },
    optB: { title: "Confiscate Black-Market Deck", hook: "Disarm the informant and take the hardware", consequence: "Secures untraceable decryption rig without sharing spoils" }
  },
  {
    title: "Spire Infiltration & Glass Horizon",
    optA: { title: "Ascend via Exterior Mag-Lift", hook: "Exposed climb along vertigo-inducing spire facade", consequence: "Vulnerable to aerial gunships but bypasses indoor checkpoints" },
    optB: { title: "Infiltrate HVAC Ventilation Shafts", hook: "Crawl through toxic filtration conduits", consequence: "Undetected entry into the executive suites" }
  },
  {
    title: "Lyra's Fragmented Signal",
    optA: { title: "Trace the Distress Beacon", hook: "Divert course toward the survivor's coordinates", consequence: "High risk of walking into a primed kill-zone" },
    optB: { title: "Purge the Frequency to Prevent Tracking", hook: "Sever incoming transmissions to maintain radio silence", consequence: "Preserves cover but abandons the stranded ally" }
  },
  // 11-20: Deep infiltration & high stakes
  {
    title: "The Black Market Broker",
    optA: { title: "Bribe with Quantum Credits", hook: "Pay exorbitant ransom for clean access codes", consequence: "Secures diplomatic VIP transit clearance" },
    optB: { title: "Intimidate at Gunpoint", hook: "Force cooperation through cold tactical leverage", consequence: "Obtains codes for free, but broker alerts syndicate bounty hunters" }
  },
  {
    title: "Weaponizing the Anomaly",
    optA: { title: "Unleash Unstable Energy Core", hook: "Harness wild fluctuations to incinerate defense turrets", consequence: "Obliterates perimeter defenses but triggers structural fissures" },
    optB: { title: "Harmonize the Harmonic Field", hook: "Calibrate output to generate a kinetic barrier", consequence: "Absorbs incoming artillery fire for 60 seconds" }
  },
  {
    title: "The Transit Hub Ambush",
    optA: { title: "Trigger Sprinkler Electrical Trap", hook: "Flood the concourse and electrify the floor", consequence: "Incapacitates an entire mercenary squad simultaneously" },
    optB: { title: "Blend with the Civilian Commuters", hook: "Vanish into dense crowd to evade facial recognition", consequence: "Evades thermal sensors without firing a single round" }
  },
  {
    title: "Overclocking the Sub-Station",
    optA: { title: "Meltdown the Cooling Towers", hook: "Induce supercritical steam venting to blind the plaza", consequence: "Blankets sector in zero-visibility fog" },
    optB: { title: "Reroute Grid to Defense Matrix", hook: "Funnel city wattage into personal exosuits", consequence: "Grants temporary superhuman reflexes and shielding" }
  },
  {
    title: "The Rogue Specialist's Offer",
    optA: { title: "Accept the Prototype Implant", hook: "Inject experimental neuro-stimulant for battle readiness", consequence: "Doubles reaction speed but induces hallucinations" },
    optB: { title: "Rely on Unaugmented Grit", hook: "Refuse biological tampering and fight human", consequence: "Maintains clear mental clarity and uncorrupted neural link" }
  },
  {
    title: "Breaching the Inner Perimeter",
    optA: { title: "Deploy Nanite Dissolver Charges", hook: "Melt through 3 feet of reinforced tungsten bulkhead", consequence: "Creates silent breach with zero acoustic signature" },
    optB: { title: "Hijack Heavy Construction Droid", hook: "Ram through reinforced security gates with industrial mech", consequence: "Loud explosive entrance drawing heavy enforcer response" }
  },
  {
    title: "Silent Infiltration vs Chaos Diversion",
    optA: { title: "Ghost Through Laser Tripwires", hook: "Acrobatic traversal through dense infrared grid", consequence: "Zero alarms raised, stealth multiplier active" },
    optB: { title: "Detonate Fuel Silos Outside", hook: "Massive secondary explosions across adjacent district", consequence: "Draws 80% of garrison troops away from the target vault" }
  },
  {
    title: "Interrogating the Corporate Courier",
    optA: { title: "Extract Biometric Thumbdrive", hook: "Sever encryption dongle before security self-destructs", consequence: "Gains master encryption keys to satellite uplink" },
    optB: { title: "Turn Courier into Double Agent", hook: "Feed falsified telemetry back to syndicate headquarters", consequence: "Sends elite strike teams to wrong district coordinates" }
  },
  {
    title: "The Poisoned Signal",
    optA: { title: "Quarantine Corrupted Subroutine", hook: "Isolate cyber-virus before it infects main systems", consequence: "Protects neural link at cost of sensor degradation" },
    optB: { title: "Weaponize Malware Back at Source", hook: "Reflect viral packet through feedback loop", consequence: "Fries enemy tracking server but causes personal sensory overload" }
  },
  {
    title: "Midpoint Crisis: Sector Lockdown",
    optA: { title: "Detonate Main Transformer", hook: "Plunge entire metropolis quarter into pitch blackness", consequence: "Level playing field under night-vision conditions" },
    optB: { title: "Trigger Fire Suppression Halon Gas", hook: "Displace oxygen in the control atrium", consequence: "Forces all unmasked combatants to choke and surrender" }
  },
  // 21-30: Reversals & Moral Dilemmas
  {
    title: "Sacrificing Ground for Tactical Time",
    optA: { title: "Collapse the Viaduct", hook: "Blow explosive pylons beneath the elevated highway", consequence: "Crushes enemy armor column beneath tons of concrete" },
    optB: { title: "Hold the Choke Point", hook: "Establish heavy suppressing fire line", consequence: "Buys precious extraction seconds but depletes all ammunition" }
  },
  {
    title: "Unlocking the Forbidden Vault",
    optA: { title: "Shatter Cryo-Stasis Chamber", hook: "Awaken forgotten cybernetic super-soldier", consequence: "Unpredictable powerhouse ally enters the fray" },
    optB: { title: "Extract Classified Archive", hook: "Secure databanks proving executive conspiracy", consequence: "Provides undeniable evidence to spark planetary rebellion" }
  },
  {
    title: "Aerial Gunship Duel",
    optA: { title: "Lock-On Stinger Salvo", hook: "Fire remaining guided missiles at gunship rotor hub", consequence: "Downs enemy flagship in spectacular spiraling fireball" },
    optB: { title: "Grapple Boarding Maneuver", hook: "Fire magnetic cable to board gunship mid-flight", consequence: "High-stakes aerial hijacking over the skyline" }
  },
  {
    title: "Corrupted Telemetry",
    optA: { title: "Trust Intuition Over Sensors", hook: "Navigate manually through blinding electromagnetic storm", consequence: "Evades radar traps by flying completely dark" },
    optB: { title: "Recalibrate Array via Beacon", hook: "Pulse active sonar to map terrain contours", consequence: "Provides crystal clear nav-data but alerts nearby patrol boats" }
  },
  {
    title: "The Crucible: Rescue vs Mission",
    optA: { title: "Evacuate Trapped Civilians", hook: "Guide innocent workers into sealed blast shelter", consequence: "Saves dozens of lives, cements protagonist as true folk hero" },
    optB: { title: "Pursue Fleeing Syndicate Boss", hook: "Disregard collateral to eliminate target before escape", consequence: "Corners top antagonist before transport shuttles launch" }
  },
  {
    title: "Subterranean Magma Conduits",
    optA: { title: "Vent Geothermal Pressure", hook: "Release superheated steam into pursuer flank", consequence: "Blocks pursuit corridor with impenetrable thermal wall" },
    optB: { title: "Cross Rickety Service Gantry", hook: "Sprint across narrow metal catwalk over abyssal drop", consequence: "High adrenaline crossing, cut ropes behind squad" }
  },
  {
    title: "Siphoning the Planetary Grid",
    optA: { title: "Overcharge Personal Shields", hook: "Absorb megawatt charge directly into combat armor", consequence: "Becomes impervious to small-arms fire for 2 minutes" },
    optB: { title: "Send Surge to Enemy Network", hook: "Blow terminal motherboards across entire headquarters", consequence: "Blinds all corporate surveillance cameras permanently" }
  },
  {
    title: "Standoff at Sky-Bridge Apex",
    optA: { title: "Challenge Rival to Single Combat", hook: "Honor-bound duel between champions in pouring rain", consequence: "Focuses all attention, freezes grunts from firing" },
    optB: { title: "Sniper Cover Crossfire", hook: "Signal hidden sharpshooter to neutralize commander", consequence: "Instant decapitation strike demoralizing enemy ranks" }
  },
  {
    title: "Infiltrating the Master Server",
    optA: { title: "Upload Autonomous AI Worm", hook: "Release self-replicating logic bomb into core", consequence: "Systematically dismantles corporate network from inside" },
    optB: { title: "Download Planetary Blacklist", hook: "Copy names of every compromised world leader", consequence: "Gains ultimate political blackmail leverage" }
  },
  {
    title: "The Traitor's Revelation",
    optA: { title: "Show Cold Merciful Clemency", hook: "Disarm the turncoat and demand their repentance", consequence: "Traitor surrenders master passcode out of remorse" },
    optB: { title: "Execute Swift Battlefield Justice", hook: "Eliminate the infiltrator before they transmit coordinates", consequence: "Secures tactical silence with uncompromising finality" }
  },
  // 31-40: Downward Spiral to Climax
  {
    title: "Tactical Counter-Charge",
    optA: { title: "Lead the Charge with Kinetic Shield", hook: "Advance behind shimmering plasma barrier", consequence: "Breaks enemy defensive perimeter in close-quarters" },
    optB: { title: "Flank Through Sewage Underpass", hook: "Mud-splattered surprise ambush from rear", consequence: "Catches heavy gunners completely off guard" }
  },
  {
    title: "The EMP Shockwave",
    optA: { title: "Detonate Core at Ground Zero", hook: "Trigger wide-radius electromagnetic blackout", consequence: "Disables all cyberware and electronics in 5-mile radius" },
    optB: { title: "Contain Pulse in Directional Beam", hook: "Focus blast solely at the approaching war-mech", consequence: "Fries mechanical titan while preserving personal comms" }
  },
  {
    title: "Piercing the Defense Shield",
    optA: { title: "Synchronize Resonant Frequency", hook: "Harmonize artifact frequency with shield barrier", consequence: "Walks peacefully through glowing forcefield unscathed" },
    optB: { title: "Overload Shield with Heavy Ordnance", hook: "Concentrate all rocket fire on single focal nexus", consequence: "Shatters shield in thunderous glass-like explosion" }
  },
  {
    title: "Hijacking the Heavy Transport",
    optA: { title: "Ram the Fortress Gates", hook: "Use armored carrier as 40-ton kinetic battering ram", consequence: "Punches straight into the inner keep courtyard" },
    optB: { title: "Divert Carrier to Ammo Depot", hook: "Crash vehicle into enemy ordnance depot", consequence: "Massive chain reaction leveling secondary barracks" }
  },
  {
    title: "The Desperate Beacon",
    optA: { title: "Boost Transmission to Maximum", hook: "Broadcast planetary awakening message on all bands", consequence: "Sparks riots and uprisings across 12 sectors" },
    optB: { title: "Targeted Uplink to Resistance Fleet", hook: "Send precise landing coordinates to cloaked fleet", consequence: "Signals dropships for coordinated orbital drop" }
  },
  {
    title: "Command Sanctum Breach",
    optA: { title: "Blow the Armored Ceiling", hook: "Breach downward from rooftop landing pad", consequence: "Tactical fast-rope descent into throne room" },
    optB: { title: "Hack the Executive Air-Lock", hook: "Slice cryptographic air-lock controls", consequence: "Silent vacuum decompression flushing hallway guards" }
  },
  {
    title: "Disabling the Orbital Cannon",
    optA: { title: "Vent Liquid Hydrogen Coolant", hook: "Freeze cannon firing mechanism solid", consequence: "Cannon barrels crack and shatter under pressure" },
    optB: { title: "Reverse Magnetic Polarity", hook: "Force super-heavy shell to detonate inside chamber", consequence: "Destroys super-weapon at cost of surrounding deck" }
  },
  {
    title: "Confronting the Apex Lieutenant",
    optA: { title: "Target the Cybernetic Spine", hook: "Precision surgical strike against power couplings", consequence: "Incapacitates cybernetic implants instantaneously" },
    optB: { title: "Shatter the Visor with Kinetic Blast", hook: "Blind enemy targeting systems with point-blank blast", consequence: "Forces lieutenant into erratic wild blind fire" }
  },
  {
    title: "Overriding the Meltdown Protocol",
    optA: { title: "Manually Insert Control Rods", hook: "Expose self to radiation to save the metropolis", consequence: "Halts reactor meltdown, heroic sacrifice arc" },
    optB: { title: "Purge Reactor Core into Ocean", hook: "Eject molten fuel cell into subterranean trench", consequence: "Saves city without personal radiation exposure" }
  },
  {
    title: "Dead-Zone Threshold: The Final Approach",
    optA: { title: "Enter the Null-Field on Foot", hook: "Walk through anti-energy field relying on raw will", consequence: "Stripped of tech, pure organic endurance test" },
    optB: { title: "Deploy Insulated Exo-Frame", hook: "Push through using heavy hardened armor plating", consequence: "Shields from null-energy but limits maneuverability" }
  },
  // 41-46: Penultimate Crucible
  {
    title: "Mobilizing the Underground Fleet",
    optA: { title: "All-Out Multi-Vector Strike", hook: "Launch all gunships in coordinated final offensive", consequence: "Engages syndicate fleet across three fronts" },
    optB: { title: "Precision Stealth Insertion", hook: "Slip single strike craft under radar blanket", consequence: "Delivers strike team directly to boss citadel" }
  },
  {
    title: "Severing the Neural Backbone",
    optA: { title: "Upload Liberation Virus", hook: "Free minds of all enslaved cybernetic citizens", consequence: "Millions awake from corporate trance simultaneously" },
    optB: { title: "Total Network Erasure", hook: "Wipe all global digital ledgers and debts to zero", consequence: "Complete economic collapse of the corporate empire" }
  },
  {
    title: "Citadel Apex Assault",
    optA: { title: "Shatter the Panoramic Glass Dome", hook: "Crash gunship directly through penthouse skylight", consequence: "Dramatic glass-shower entrance into inner sanctum" },
    optB: { title: "Burn Through Security Vault Door", hook: "Thermite lance cutting through 10-inch blast plate", consequence: "Heavy, methodical breach with suppressing fire" }
  },
  {
    title: "Surviving the Last Ambush",
    optA: { title: "Form Back-to-Back Defensive Ring", hook: "Fight as unified brotherhood against final enforcers", consequence: "Overcomes impossible odds through shared trust" },
    optB: { title: "Trigger Room Shock Traps", hook: "Electrify the metal flooring to stun all hostiles", consequence: "Clears room in blinding arc of blue sparks" }
  },
  {
    title: "The Penultimate Crucible",
    optA: { title: "Claim the Master Key", hook: "Seize control of the planetary defense grid", consequence: "Unlocks ultimate power over the future world" },
    optB: { title: "Destroy the Key Forever", hook: "Smash the artifact so no one can ever rule alone", consequence: "Ensures no tyrant can ever rise again" }
  },
  {
    title: "Threshold of the Mastermind",
    optA: { title: "Demand Public Confession", hook: "Force mastermind to confess on global holocast", consequence: "Exposes syndicate crimes live to 10 billion people" },
    optB: { title: "Deliver Final Decisive Blow", hook: "End the tyranny right here with no hesitation", consequence: "Instant, unambiguous elimination of the grand threat" }
  },
  // 47-50: Climax & The End
  {
    title: "Clash of Ideologies: The Final Duel",
    optA: { title: "Overpower with Relentless Fury", hook: "Channel every drop of rage into decisive combat strike", consequence: "Overwhelms enemy defenses with savage intensity" },
    optB: { title: "Exploit Fatal Flaw in Opponent's Armor", hook: "Calculated patient counter-strike targeting exposed core", consequence: "Delivers clean, surgical fatal blow" }
  },
  {
    title: "The Architect's Final Gambit",
    optA: { title: "Sever the Self-Destruct Line", hook: "Cut the detonator cable before countdown hits zero", consequence: "Saves the citadel and all historical archives" },
    optB: { title: "Trigger Controlled Demolition", hook: "Let the monolith collapse into the sea", consequence: "Buries the dark regime forever beneath the waves" }
  },
  {
    title: "Dawn of the New Era",
    optA: { title: "Accept the Mantle of Leadership", hook: "Step forward to guide the shattered world to peace", consequence: "A new democratic council is established" },
    optB: { title: "Fade Into the Horizon as a Legend", hook: "Vanish into the shadows, leaving humanity to decide", consequence: "Becomes an eternal myth of liberty and courage" }
  },
  {
    title: "The Definitive Epilogue: A New Dawn",
    optA: { title: "A Triumphant Celebration", hook: "Stand in the sunlight with all surviving comrades", consequence: "The film closes on a radiant, hopeful dawn" },
    optB: { title: "A Quiet Bittersweet Memorial", hook: "Light an amber candle for those who fell along the way", consequence: "The film closes on a poignant, unforgettable tribute" }
  }
];

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
        seed: Math.floor(Math.random() * 2147483647),
        max_tokens: 2500,
        timeoutMs: 30000
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

  // ── Procedural Fallback Generator (Non-Repeating, Step-Entropy Driven) ────────
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

  // Trigger introduction of a new character & associated prop specifically at Step 4 if not yet present
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

  // 50 completely unique step dilemmas ensuring zero option repetition
  const dilemmaIndex = (nextStepNum - 1) % PROCEDURAL_DILEMMAS.length;
  const dilemma = PROCEDURAL_DILEMMAS[dilemmaIndex];
  const currentTitle = nextStepNum === 4 
    ? "Encounter with Zack Mercer"
    : `${dilemma.title} (Scene ${nextStepNum})`;

  let optATitle = dilemma.optA.title;
  let optAText = `${char.name} acts to ${dilemma.optA.title.toLowerCase()}, leveraging ${prop.name} to seize the tactical advantage.`;
  let optAHook = dilemma.optA.hook;
  let optAConsequence = dilemma.optA.consequence;

  let optBTitle = dilemma.optB.title;
  let optBText = `${char.name} executes an alternate maneuver to ${dilemma.optB.title.toLowerCase()}, adapting to shifting combat conditions.`;
  let optBHook = dilemma.optB.hook;
  let optBConsequence = dilemma.optB.consequence;

  // Weave community comment influence into the targeted option
  if (commentInfluence) {
    if (commentInfluence.optionId === 'A') {
      optATitle = `@${commentInfluence.userName}'s Gambit: ${dilemma.optA.title}`;
      optAText = `${char.name} implements the tactical strategy proposed by @${commentInfluence.userName}: "${commentInfluence.text}".`;
      optAHook = `Conceived directly from viewer @${commentInfluence.userName}'s suggestion.`;
      optAConsequence = `The narrative dramatically branches according to the audience idea.`;
    } else {
      optBTitle = `@${commentInfluence.userName}'s Gambit: ${dilemma.optB.title}`;
      optBText = `${char.name} implements the tactical strategy proposed by @${commentInfluence.userName}: "${commentInfluence.text}".`;
      optBHook = `Conceived directly from viewer @${commentInfluence.userName}'s suggestion.`;
      optBConsequence = `The narrative dramatically branches according to the audience idea.`;
    }
  }

  let optionA: DecisionOption = {
    id: "A",
    title: optATitle,
    text: optAText,
    dramaticHook: optAHook,
    expectedConsequence: optAConsequence,
    votes: 0
  };

  let optionB: DecisionOption = {
    id: "B",
    title: optBTitle,
    text: optBText,
    dramaticHook: optBHook,
    expectedConsequence: optBConsequence,
    votes: 0
  };

  let synopsis = `Following the choice to "${chosenOption.title}" in Step ${previousStep.stepNumber}, ${char.name} reaches a critical juncture in ${dilemma.title.toLowerCase()}. As the ${prop.name} pulses with vital energy, a decisive fork in the mission emerges.`;
  let visualPrompt = `Cinematic medium two-shot / tracking frame: ${char.name} (${char.visualTraits}) navigates the tense environment with ${prop.name} (${prop.visualAppearance}) active. Low-key chiaroscuro lighting, 3200K amber incandescent practicals contrasting against deep midnight shadows, Panavision C-Series anamorphic lens, oval bokeh, atmospheric volumetric haze, Kodak Vision3 500T 35mm grain, 16:9 cinematic master still.`;
  let cameraMotionPrompt = "Technocrane low-angle tracking push-in with subtle kinetic inertia, smoothly arcing 45 degrees around subject, 24fps motion cadence";
  let subtitles: SubtitleCue[] = [
    {
      start: 1.0,
      end: 7.0,
      speaker: char.name,
      text: `We committed to "${chosenOption.title}" — now the perimeter is shifting fast.`,
      textEs: `Nos comprometimos con "${chosenOption.title}" — ahora el perímetro está cambiando rápido.`
    },
    {
      start: 7.5,
      end: 14.0,
      speaker: char.name,
      text: `Next move: ${optionA.title} or ${optionB.title}?`,
      textEs: `Siguiente movimiento: ¿${optionA.title} o ${optionB.title}?`
    }
  ];

  if (newCharacter && newProp) {
    synopsis = `In this critical junction, ${char.name} meets in the steam-choked shadows with ${newCharacter.name}, who boots up his ${newProp.name} to decipher the orbital spire telemetry.`;
    visualPrompt = `Medium two-shot / low-angle cowboy framing: ${char.name} (${char.visualTraits}) meets ${newCharacter.name} (${newCharacter.visualTraits}) in a rain-slicked industrial conduit. Motivated chiaroscuro with 3200K amber incandescent practicals cutting through atmospheric haze. ${newCharacter.name} boots up ${newProp.name} (${newProp.visualAppearance}), casting vibrant volumetric caustics across their faces. Cooke Anamorphic 40mm, shallow depth of field with oval bokeh, subtle flare, Kodak Vision3 500T grain, photorealistic 16:9 master.`;
    cameraMotionPrompt = "Lateral dolly track at eye level slowly arcing around the two characters, subtle push-in tightening framing as the device activates, 24fps cinematic cadence";
    subtitles = [
      {
        start: 1.0,
        end: 7.0,
        speaker: newCharacter.name,
        text: `If the syndicates catch me with this ${newProp.name}, my life is forfeit before dawn.`,
        textEs: `Si los sindicatos me atrapan con este ${newProp.name}, mi vida no vale nada antes del amanecer.`
      },
      {
        start: 8.0,
        end: 14.0,
        speaker: char.name,
        text: "Sync the telemetry. We have less than ten seconds.",
        textEs: "Sincroniza la telemetría. Nos quedan menos de diez segundos."
      }
    ];
    optionA = {
      id: "A",
      title: `Trust ${newCharacter.name}`,
      text: `${char.name} hands over ${prop.name} to ${newCharacter.name} to interface directly with his ${newProp.name}.`,
      dramaticHook: "Is the contact a genuine ally or an embedded corporate infiltrator?",
      expectedConsequence: "Immediate cryptographic access to the sector bypass elevator.",
      votes: 0
    };
    optionB = {
      id: "B",
      title: "Maintain Tactical Leverage",
      text: `${char.name} refuses to surrender the artifact and demands that ${newCharacter.name} unlock the conduit first.`,
      dramaticHook: "Armed Mexican standoff in the tight ventilation corridor.",
      expectedConsequence: "Compliance under duress, but fragile trust is deeply fractured.",
      votes: 0
    };
  }

  // Pass ONLY the props strictly necessary for this specific 15-second scene
  let activeProps: string[] = [prop.id];
  let activePropImages: string[] = [prop.imageUrl].filter(Boolean) as string[];

  if (newCharacter && newProp) {
    activeProps = [newProp.id];
    activePropImages = [newProp.imageUrl].filter(Boolean) as string[];
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
      ? `${newCharacter.name}: 'If the syndicates catch me with this ${newProp?.name}, my life is forfeit before dawn.'`
      : `${char.name}: 'We committed to "${chosenOption.title}" — now the perimeter is shifting fast.'`,
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
  "Superhéroes / Comic Book Cinematic Spectacle",
  "Anime / Shonen & Seinen Action Masterpiece",
  "Animación 3D Estilizada / Whimsical Family Adventure",
  "Horror Clásico / Gothic Supernatural Dread",
  "Cine Noir Clásico / Hardboiled 1940s Detective",
  "Drama Emocional / High-Stakes Human Struggle",
  "Policial Clásico / Gritty Homicide Investigation",
  "Comedia de Acción / Buddy Cop Adventure",
  "Thriller Psicológico / Paranoia & Mind Games",
  "Fantasía Épica Medieval / Sword & Sorcery",
  "Western Clásico / Frontier Justice & Gunslingers",
  "Aventura Arqueológica Pulp / Lost Tomb Raiders",
  "Espionaje Guerra Fría / Clandestine Agents & Traitors",
  "Samuráis & Chambara / Bushido Honor & Katana Duels",
  "Romance de Época / Regency & Victorian Intrigue",
  "Bélico Histórico / Brotherhood in the Trenches",
  "Misterio Whodunnit de Mansión / Manor Murder Puzzle",
  "Piratas & Swashbuckling / High Seas Galleon Odyssey",
  "Fantasía Mitológica / Odisea de Dioses y Héroes",
  "Catástrofe & Supervivencia Natural / Extreme Elements"
];

const CREATIVE_PROTAGONISTS = [
  "a masked vigilante wielding a magnetic grapple-cable and an acoustic disruptor shield protecting their city skyline",
  "a hotheaded anime swordsman who channels azure spirit flames through an ancient family katana",
  "an eccentric mechanical clockwork toy inventor in a whimsical cobblestone European city",
  "a skeptical paranormal investigator armed with a vintage silver-nitrate plate camera in a decaying abbey",
  "a cynical trenchcoat private eye with a bruised jaw investigating the suspicious suicide of an oil tycoon",
  "a prodigy classical cellist navigating cutthroat conservatory rivalries to exonerate their framed sibling",
  "a relentless veteran homicide detective tracking an elusive serial killer leaving ornate origami clues",
  "a fast-talking disgraced jewel thief forced into an undercover heist with an uptight rookie federal marshal",
  "a brilliant clinical psychologist realizing their newest patient is reconstructing their own repressed trauma",
  "an exiled paladin knight carrying the shattered ancestral runic broadsword of a fallen kingdom",
  "a lone sharpshooter sheriff confronting their former outlaw gang at high noon on the main street",
  "a roguish fedora-wearing archaeologist racing rival mercenaries through a collapsing Mayan sun temple",
  "an undercover British intelligence officer stranded in divided Berlin after their safehouse is blown",
  "a masterless wandering ronin defending an innocent tea merchant's village from ruthless corrupt magistrates",
  "a sharp-witted young duchess secretly writing anonymous society broadsheets exposing court scandals",
  "a battle-hardened frontline infantry medic crawling through no-man's land with emergency morphine and field dispatches",
  "an eccentric tweed-wearing master detective interrogating twelve eccentric heirs trapped in a storm-locked manor",
  "a daring pirate captain decoding an astronomical star-chart to reach a sunken Aztec treasure cove",
  "a spartan warrior favored by Athena on a perilous voyage across the Aegean Sea to retrieve a divine relic",
  "a daring backcountry alpine rescue specialist leading stranded climbers down a collapsing volcanic ridge",
  "an orphaned apprentice illusionist discovering real ancient spellcraft hidden inside an antique stage magician's trunk",
  "a quiet monastery martial artist who vowed never to kill, forced to defend a mountain orphanage against bandits",
  "a torch-song jazz singer in a 1940s speakeasy who memorized the numbers of a mob boss's Swiss bank account",
  "a retired heavyweight boxer running a waterfront gym who takes in a runaway targeted by corrupt dock wardens",
  "a blind audio engineer who accidentally records the conversation of a high-profile political assassination",
  "a fearless 1930s air-mail pilot flying an open-cockpit biplane through a blinding Himalayan snowstorm",
  "a tenacious public defender risking their career to prove the innocence of a death-row railroad laborer",
  "a high-wire circus acrobat who spots a rooftop sniper while performing beneath the big top",
  "a stubborn Scottish lighthouse keeper fighting towering fifty-foot storm surges and unearthly phantom ship bells",
  "an antique book restorer who unbinds a centuries-old illuminated manuscript containing an unholy royal prophecy",
  "a young forest ranger tracking a legendary white stag through ancient woodland claimed by ruthless timber barons",
  "a disgraced museum curator who replaces a stolen Renaissance masterpiece with a brilliant counterfeit",
  "an undercover French resistance courier smuggling radio cipher tubes across Nazi-occupied Normandy",
  "an observant head butler who knows every hidden passageway and illicit affair inside a sprawling ducal estate",
  "a master glassblower in renaissance Venice who discovers an alchemical formula for unbreakable obsidian glass",
  "a frontier town schoolteacher who conceals a dead-eye past with twin Colt revolvers when raiders strike",
  "a gifted young baker in a whimsical animated town whose enchanted pastries accidentally grant animal speech",
  "an undercover narcotics inspector trapped in the neon-drenched night markets of 1980s Hong Kong",
  "an arctic dogsled courier racing a crate of diphtheria antitoxin across five hundred miles of frozen tundra",
  "a brooding portrait painter hired to capture the likeness of a bride who vanishes whenever bells chime",
  "a runaway circus bear trainer and a mischievous pickpocket girl forming an unlikely fugitive alliance",
  "a forensic handwriting analyst discovering that three distinct suicide notes were written by the same phantom hand",
  "a legendary deep-sea sponge diver who discovers a submerged Greco-Roman galley loaded with cursed golden amphorae",
  "an aristocratic fencing prodigy who masquerades as a masked vigilante to avenge their father's dishonor",
  "a reclusive watchmaker who builds a clockwork heart to keep a sickly child alive against all odds",
  "an ambitious courtroom transcriptionist who notices a juror blinking coded Morse messages during a murder trial",
  "a charismatic con artist impersonating an eccentric foreign prince to swindle a predatory industrial cartel",
  "an austere samurai archer who can split an arrow in mid-air through howling mountain gales",
  "a rugged smokejumper parachuting into a raging forest wildfire to extract a trapped geological research team",
  "an inquisitive teenage amateur radio operator who intercepts an SOS signal broadcast on a frequency forgotten since 1912",
  "a solitary bell-ringer in a gothic cathedral who discovers a network of gargoyle perches used by assassins",
  "a blindfolded chess grandmaster dragged into a high-stakes espionage match where pieces represent real lives",
  "a determined female deep-sea diver in 1920 searching for a lost submarine bell in the icy North Sea",
  "an eccentric botanist who breeds bioluminescent orchids that glow only in the presence of poison",
  "a veteran stagecoach driver taking a gold shipment through a notorious canyon held by masked bandits",
  "a disgraced surgeon operating a clandestine back-alley clinic for injured underground freedom fighters",
  "a sharp-tongued female investigative reporter infiltrating a crooked political convention disguised as a socialite",
  "an ancient temple stonemason who knows the secret counterweight trap door beneath the emperor's dais",
  "a young cartographer who discovers that old mariners' maps conceal a moving phantom island",
  "a deaf safecracker who feels the delicate tumble of vault mechanisms through fingertips pressed against cold steel",
  "a traveling puppet master whose wooden marionettes reenact unsolved town murders during midnight shows",
  "a battle-scarred cavalry scout tracking a stolen payroll wagon across the sun-scorched Badlands",
  "a gifted violin luthier who crafts an instrument out of sunken galleon timber with an acoustic curse",
  "a young apprentice falconer whose golden eagle intercepts an encrypted diplomatic cipher mid-flight",
  "a runaway scullery maid who memorized the layout of the royal treasury while dusting the palace chimneys",
  "a retired circus strongman protecting an immigrant tenement neighborhood from extortionist loan sharks",
  "an inquisitive country coroner who discovers identical needle marks on victims of supposed natural deaths",
  "a disgraced navy captain sentenced to command an expendable penal crew on an uncharted arctic expedition",
  "a reclusive lighthouse painter whose seascapes accurately depict shipwrecks three days before they occur",
  "a tenacious legal clerk who uncovers twenty years of forged land deeds condemning frontier homesteaders",
  "a young martial arts prodigy from an impoverished fishing village who enters an underground bare-knuckle tournament",
  "a runaway bride riding a thoroughbred horse across the stormy Scottish moors with the clan's missing signet ring",
  "a silent mime street performer who accidentally witnesses a high-ranking diplomat passing briefcases to an assassin",
  "a veteran tunnel engineer leading a desperate digging team to reach miners trapped beneath a collapsed riverbed",
  "an eccentric antiquities dealer specializing in cursed mirrors that never reflect their true owners",
  "a sharpshooting frontier telegraph operator tapping out emergency warnings under heavy rifle fire",
  "a stoic Japanese noh mask carver who hides lethal throwing needles within cedar wood theatrical props",
  "a fearless young female stunt driver in 1930s Hollywood drawn into a real gangland getaway car chase",
  "a deep-woods fur trapper who discovers an infant left inside the hollow trunk of a petrified ancient oak",
  "a disgraced royal astronomer banished to a cliffside observatory who predicts an impossible second moon",
  "an undercover customs agent boarding incoming merchant schooners looking for smuggled Egyptian mummies",
  "a young street violinist whose melancholic melodies have the power to soothe raging wild beasts",
  "a veteran prison warden facing a riot orchestrator who turns out to be his long-lost older brother",
  "a charming cat burglar specializing in rooftop heists across the copper domes of nineteenth-century Vienna",
  "a deaf-mute monastery gardener who cultivates rare herbs capable of curing a spreading royal contagion",
  "a grizzled whaling ship harpooner who refuses to strike a legendary albino whale guarding a sunken shipwreck",
  "an ambitious young archaeologist's assistant decoding cuneiform clay tablets in a sandstorm-battered tent",
  "a hardened border patrol ranger tracking human smugglers through the moonlit slot canyons of Arizona",
  "a brilliant female cryptanalyst working in a top-secret wartime country estate cracking foreign naval codes",
  "a charismatic traveling medicine show huckster whose snake-oil tonic unexpectedly cures a real demonic curse",
  "a young chimney sweep who gets stuck in a flue and overhears a conspiracy to dynamite Parliament",
  "a stubborn vineyard matriarch defending her century-old hillside grapevines against a predatory rail baron",
  "an exiled samurai sword polisher who can discern a warrior's sins simply by inspecting the blade's temper line",
  "a daring 1920s barnstorming aviator performing wing-walking stunts while carrying illicit contraband",
  "a soft-spoken village priest with an uncanny ability to sense when a parishioner is speaking under demonic duress",
  "a determined frontier midwife riding through blizzards and bandit territory to reach an isolated ranch",
  "an eccentric glassblower's daughter who crafts glass lenses that allow humans to view wandering spirits",
  "a disgraced royal falconer searching for the emperor's stolen white hunting gyrfalcon across northern steppes",
  "a veteran tugboat captain navigating a flaming munitions barge away from a crowded harbor during an air raid",
  "a young apprentice watchmaker who discovers a hidden gear that makes time run backward for twelve seconds"
];

const CREATIVE_CATALYSTS = [
  "a citywide blackout triggered by an enigmatic masked villain broadcasting a 24-hour ultimatum across all frequencies",
  "an ancient ancestral tournament where the five elemental clans must duel to seal a catastrophic planar breach",
  "a runaway magical windup automaton holding the miniaturized perpetual-motion heart of the grand city clock",
  "an antique grandfather clock that tolls thirteen times at midnight, unsealing the restless spirits of the crypt",
  "a blood-stained black leather ledger containing the blackmail secrets of the entire municipal elite",
  "the sudden leak of a scandalous diary that threatens to tear apart two aristocratic dynasty families",
  "a locked-room penthouse murder where the victim vanished from inside a sealed steel vault without a sound",
  "a runaway freight train loaded with stolen imperial gold hurtling down a mountain pass with severed brakes",
  "an anonymous envelope containing photographs of the detective's own family taken thirty minutes ago",
  "the awakening of an ancient slumbering wyrm deep beneath the royal fortress as the harvest moon turns blood-red",
  "the arrival of an infamous outlaw gang armed with dynamite to break their ruthless leader out of the county jail",
  "a collapsing subterranean stone dial that triggers an ancient counterweight mechanism flooding the tomb with sand",
  "an encrypted microdot roll of film smuggled inside an antique porcelain chess queen across the border",
  "a corrupt warlord demanding the surrender of the ancestral castle before sunrise under threat of cannon fire",
  "a forged will discovered concealed inside an antique grandfather portrait hours before the wedding ceremony",
  "an unrelenting artillery barrage that severs the field telephone line to headquarters right before zero hour",
  "the sudden poisoning of the reclusive lord during a birthday banquet where only family members were present",
  "the appearance of an ethereal ghost galleon emerging from the sea fog without a single living soul at the helm",
  "an oracle prophecy decreeing that only one hero can appease Poseidon's wrath before the island sinks into the ocean",
  "a sudden magnitude-7 earthquake that triggers an avalanche, severing the only suspension bridge out of the valley",
  "a carnival fortune-teller's crystal globe that projects an exact time-stamp of a bank heist thirty minutes before it happens",
  "an ancient cursed jade seal accidentally broken during a temple renovation, releasing a vengeful warlord spirit",
  "a fiery hot-air balloon crash into the royal courtyard delivering a burned letter from an exiled princess",
  "the detonation of the harbor drawbridge, trapping three rival merchant convoys in crossfire during a hurricane",
  "an anonymous radio broadcast playing a haunting lullaby that triggers synchronized amnesia in an isolated mountain village",
  "a catastrophic river dam breach that threatens to submerge a historic mining settlement in under two hours",
  "a mysterious sealed iron chest pulled up in a fishing net covered in living barnacles that spell out a warning",
  "the sudden disappearance of the prima ballerina minutes before the opening night curtain of the Imperial Ballet",
  "a solar eclipse that causes all brass compass needles across the continent to point toward an uncharted desert ruin",
  "the discovery of a clandestine subterranean tunnel system beneath the federal treasury vault",
  "a mysterious stranger dying on the tavern doorstep who whispers the coordinates of the Lost Spanish Mission",
  "a sudden quarantine lockdown imposed on a luxury ocean liner in international waters with communications severed",
  "the delivery of a severed antique silver pocket watch still ticking backwards with blood on the hands",
  "an unexpected freak blizzard that isolates twelve estranged murder suspects inside a cliffside alpine sanatorium",
  "the theft of the sacred temple bell whose resonance keeps an underground sea monster in deep slumber",
  "an emergency telegraph dispatch revealing that the prisoner scheduled for hanging at dawn is the governor's true son",
  "a lightning strike that ignites the cathedral steeple, revealing a hidden chamber containing a heretical golden gospel",
  "an undercover agent's dead-drop parcel intercepted by a street urchin who accidentally brings it to a local bakery",
  "a terrifying landslide that exposes the fossilized bones of an unknown colossus beneath a railway construction trench",
  "an anonymous poison dart striking the lead prosecuting attorney right before they present the decisive murder weapon",
  "a ceremonial royal parade interrupted when the ceremonial cannon fires live shrapnel into the governor's carriage",
  "the sudden arrival of an unannounced black private train carrying thirty heavily armed foreign mercenaries",
  "an eerie bioluminescent algae bloom that illuminates thousands of ancient shipwrecks along a jagged reef",
  "a midnight bell tolling from an island monastery that has been abandoned and charred to ash for fifty years",
  "a coded classified telegram ordering all frontier outposts to immediately burn their records and retreat east",
  "the discovery of an identical double of the city mayor walking through the waterfront slums claiming to be the real one",
  "a sudden volcanic geyser erupting through the floor of an ancient limestone cathedral during high mass",
  "a counterfeit bank note ring that floods the frontier with bills bearing the initials of the chief of police",
  "the collapse of a central mine shaft that traps forty miners with rising subterranean groundwater and dwindling air",
  "an astronomical alignment opening a legendary sea whirlpool that reveals the sun-bleached marble gates of Atlantis",
  "a sudden low tide that exposes the timber ribs of a centuries-old shipwreck filled with sealed wax chests",
  "an anonymous telephone call to the newspaper city desk reciting the headlines of tomorrow's front page",
  "a carriage wheel snapping on a foggy moor road directly outside the iron gates of an asylum for the criminally insane",
  "the accidental discovery of an unmapped sub-basement beneath an ancient municipal library holding banned heretical texts",
  "a stray bullet piercing an oil pipeline, setting a frontier river blazing with walls of fire",
  "the delivery of a grand piano to the concert hall with the embalmed body of a missing maestro inside the case",
  "a catastrophic blizzard that freezes the harbor solid, allowing wolves and bandits to cross over the sea ice",
  "the theft of the sacred diamond eye from a colossal stone idol in an isolated mountain sanctuary",
  "an emergency telegram announcing that the incoming passenger train has failed to stop at the last four stations",
  "the sudden appearance of identical counterfeit currency bearing portraits of a prince who died in infancy",
  "a prison riot timed precisely with an earthquake that topples the western guard towers of the fortress",
  "a rogue fireworks explosion at the harbor carnival that accidentally detonates an illegal arms warehouse",
  "the discovery of a secret room behind a tavern wine cellar containing uniforms of the imperial guard",
  "a poisoned communion chalice that collapses the bishop during the coronation of the young monarch",
  "a massive swarm of migratory locusts obscuring the sun and stripping the valley bare in three hours",
  "an antique automaton in a curiosity shop suddenly standing up, pointing to a patron, and speaking in Latin",
  "the mysterious sinking of a lighthouse tender vessel on a calm sea without a single cloud in the sky",
  "a sudden quarantine notice posted on the door of the county bank while the town's life savings are locked inside",
  "a runaway carnival circus tiger stalking the gaslit streets of Victorian London on a foggy midnight",
  "the discovery of a hollowed-out family bible containing the blueprints to the city water supply's poison gates",
  "an artillery shell that lodges unexploded directly inside the town hospital's boiler room",
  "a sudden drop in ocean water levels heralding an incoming ninety-foot tsunami wave approaching the bay",
  "the unearthing of a lead-lined Roman sarcophagus during the foundation digging of a modern tenement",
  "an unexpected inheritance letter naming a penniless dockworker as the sole heir to a notorious haunted estate",
  "a violent bar brawl that spills into the street, revealing that one of the brawlers is carrying the stolen state crown",
  "the sudden midnight tolling of a church bell whose rope has been severed and tied to the rafters",
  "an accidental chemical spill in a dye factory that turns the municipal river into an explosive acidic crimson sludge",
  "a private theatrical performance where the actor playing the murdered king is actually shot on stage with live ammunition",
  "a raging flash flood sweeping through a limestone canyon, trapping tourists inside prehistoric cavern systems",
  "the sudden arrest of the town judge after bloodhound tracking dogs lead police directly to his garden shed",
  "an unexpected solar flare that disrupts telegraph networks across the nation, silencing long-distance communications",
  "the discovery of an abandoned rowboat drifting in the canal holding a crying baby wrapped in an imperial battle flag",
  "a landslide that derails a gold-transport train onto the frozen surface of a treacherous mountain lake",
  "the midnight theft of the city's master blueprints from the municipal hall archives right before a planned heist",
  "an anonymous parcel delivered to the police precinct containing twelve keys matching twelve unsolved burglary scenes",
  "a runaway logging flume that crashes into a mountain village, sending hundreds of colossal logs hurtling through buildings",
  "the sudden discovery that the water well in the town square has been laced with an untraceable hallucinogenic root",
  "a catastrophic boiler explosion aboard a Mississippi riverboat that splits the vessel in two mid-voyage",
  "the delivery of a wax cylinder phonograph recording that captures the dying confession of an assassinated prime minister",
  "a mysterious dense sea fog that rolls into the harbor, causing compasses to spin wildly and anchors to snap",
  "the unsealing of an ancient stone vault beneath the monastery revealing that the saint's tomb was empty all along",
  "a wild stallion stampede through the frontier settlement ignited by an arsonist torching the livery stables",
  "an emergency distress flare fired from a supposedly uninhabited offshore quarantine island",
  "the discovery of a counterfeit double of the Mona Lisa hanging in place of the original during a private viewing",
  "a sudden subterranean sinkhole opening in the middle of a bustling market square, swallowing three vendor stalls",
  "the arrival of a heavily escorted stagecoach carrying a mysterious chained iron sarcophagus marked with Latin warnings",
  "an unannounced execution warrant signed by a king who has been in a coma for seven months",
  "a devastating dust storm that sweeps across the plains, blotting out the sun and burying the railroad tracks",
  "the sudden disappearance of all guard dogs along the high-security perimeter of the federal gold mint",
  "an eclipse that aligns the shadows of three ancient standing stones to point directly at a hidden trapdoor"
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
export async function generateBlockbusterCandidatesWithDeepSeek(existingTitles: string[] = []): Promise<BlockbusterCandidate[]> {
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
1. RADICAL TRADITIONAL & ECLECTIC DIVERSITY: Each of the 4 candidates MUST come from a radically different classic or popular genre:
   - Superheroes / Comic Book Cinematic Spectacle
   - Anime / Shonen & Seinen Action
   - Stylized 3D Animation (Pixar / Spider-Verse feel)
   - Classic Horror / Gothic Dread
   - Classic 1940s Film Noir
   - Emotional Drama / Human Struggle
   - Police Procedural / Detective Mystery
   - Buddy Action-Comedy
   - Psychological Thriller / Mind Games
   - High Epic Fantasy / Sword & Sorcery
   - Classic Western / Frontier Justice
   - Pulp Archaeological Adventure
   - Cold War Espionage
   - Samurai Chambara
   - Period Romance / Historical Drama
   - War & Trench Heroism
   - Country Manor Whodunnit
   - Swashbuckling Pirates
   - Mythological Odyssey
   - Disaster Survival
   STRICTLY FORBIDDEN: Do NOT default to cyber, punk, neon hackers, or post-apocalyptic cyborg wastelands. Embrace traditional cinematic genres with rich emotional palettes and distinct visual worlds.
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
          { role: "user", content: `Generate 4 wildly different, fresh and compelling blockbuster candidate pitches now. Unique session entropy: ${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }
        ],
        temperature: 1.0,
        seed: Math.floor(Math.random() * 2147483647),
        max_tokens: 16384
      });

      if (parsed) {
        const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];

        const candidates: BlockbusterCandidate[] = rawCandidates.slice(0, 4).map((c: any, idx: number) => ({
          id: (['A', 'B', 'C', 'D'] as const)[idx],
          title: String(c.title || `Untitled Odyssey ${idx + 1}`).slice(0, 90),
          logline: String(c.logline || 'An interactive cinematic journey where every choice reshapes the world.').slice(0, 220),
          genre: String(c.genre || selectedGenres[idx] || 'Epic Drama').slice(0, 60),
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

  return getFallbackBlockbusterCandidates(existingTitles);
}

/**
 * Procedural fallback catalog: 20 varied, high-concept interactive film pitches
 * representing traditional, rich, non-cyberpunk genres.
 * Shuffled on every call to guarantee fresh variety even without API keys.
 */
const EXTENSIVE_FALLBACK_CANDIDATES = [
  {
    title: 'Apex Vigilante: City of Shadows',
    logline: 'When an EMP shockwave cripples the city, an armored vigilante battles a rogue syndicate to save the power grid.',
    genre: 'Superhéroes / Comic Book Spectacle',
    premise: 'High-octane superhero blockbuster set across the rooftops of a sprawling metropolis. An armored vigilante armed with magnetic grapple lines and acoustic disruptors must dismantle an underground syndicate holding the power grid hostage before dawn.'
  },
  {
    title: 'Ignis Blade: The Spirit Tournament',
    logline: 'A hotheaded swordsman channels forbidden spirit flame to compete in the emperor\'s tournament and clear his clan\'s name.',
    genre: 'Anime / Shonen & Seinen Masterpiece',
    premise: 'Dynamic cinematic anime epic where a young swordsman wielding spirit flames battles legendary elemental masters in the sacred mountain arena. Every choice determines fighting techniques, secret allies, and the fate of the martial clans.'
  },
  {
    title: 'The Clockwork Menagerie: Toby\'s Grand Flight',
    logline: 'An eccentric boy inventor and his brass windup sparrow embark on a whimsical quest across cobblestone skies.',
    genre: 'Animación 3D Estilizada / Family Adventure',
    premise: 'Heartwarming, visually splendid 3D animated feature in the style of Pixar and Spider-Verse. A young tinkerer discovers a miniature perpetual-motion automaton that can restore life to the city\'s dormant clocktower, dodging aerial sky-trolleys.'
  },
  {
    title: 'The Haunting of Blackwood Abbey',
    logline: 'A skeptical photographer uncovers dark Victorian secrets when an antique silver-plate camera captures entities invisible to the eye.',
    genre: 'Horror Clásico / Gothic Supernatural Dread',
    premise: 'Atmospheric gothic horror in an abandoned English abbey cloaked in November mist. Using a vintage 19th-century camera, an investigator photographs restless spirits and unearths a family curse that demands a blood sacrifice before midnight.'
  },
  {
    title: 'Dead Reckoning on 4th Street',
    logline: 'A cynical private eye investigates a corrupt tycoon\'s death in a rain-drenched city of jazz clubs and venetian shadows.',
    genre: 'Cine Noir Clásico / Hardboiled 1940s Detective',
    premise: 'Classic 1940s film noir filmed in high-contrast black and white. Private eye Jack Mallory takes a retainer from a mysterious femme fatale, only to find himself framed for murder by a web of crooked politicians, dirty cops, and smoky speakeasies.'
  },
  {
    title: 'The Prodigy\'s Requiem',
    logline: 'A prodigy cellist battles fierce rivalries and family secrets at the Royal Conservatory to save her sister\'s freedom.',
    genre: 'Drama Emocional / High-Stakes Human Struggle',
    premise: 'Prestige emotional drama tracking the meteoric rise and moral crises of a young cellist competing for the world\'s most prestigious concerto prize, confronting ruthless maestros and family debts that threaten to tear her life apart.'
  },
  {
    title: 'Precinct 8: The Origami Murders',
    logline: 'Two mismatched homicide detectives track an elusive killer who leaves intricate paper cranes at locked-room crime scenes.',
    genre: 'Policial Clásico / Gritty Crime Investigation',
    premise: 'Tense, gritty procedural following a veteran detective and a rookie forensic profiler across rain-swept alleys and sterile crime labs as they race against time to decode a serial killer\'s cryptographic calling cards.'
  },
  {
    title: 'The Monte Carlo Heist: Double Trouble',
    logline: 'A smooth jewel thief and an uptight insurance investigator must team up to steal back the Crown Ruby from a casino vault.',
    genre: 'Comedia de Acción / Buddy Cop Adventure',
    premise: 'High-energy, witty action-comedy brimming with sharp banter, slapstick escapes, luxury yachts, and outrageous casino infiltration gambits along the French Riviera.'
  },
  {
    title: 'The Mirror Protocol',
    logline: 'A forensic psychiatrist treating an amnesiac patient begins to uncover memories from his own childhood.',
    genre: 'Thriller Psicológico / Paranoia & Mind Games',
    premise: 'Claustrophobic, mind-bending psychological suspense. As a doctor interrogates a suspect who remembers nothing of an impossible locked-room disappearance, the boundaries between doctor, patient, and reality begin to shatter.'
  },
  {
    title: 'The Broken Throne: Chronicles of Valdoria',
    logline: 'An exiled paladin and an elven archer race across frosted mountain peaks to reforge the legendary sun-blade.',
    genre: 'Fantasía Épica Medieval / Sword & Sorcery',
    premise: 'Sweeping high-fantasy saga with majestic castle citadels, sweeping mist-shrouded peaks, ancient wyrms, and royal court betrayals as mortal kingdoms unite against the awakening Shadow King.'
  },
  {
    title: 'High Noon at Rattlesnake Ridge',
    logline: 'A lone sheriff protects a dusty frontier town against his former outlaw gang riding in on the noon train.',
    genre: 'Western Clásico / Frontier Justice & Gunslingers',
    premise: 'Operatic widescreen frontier western. With the midday sun blazing overhead, a scarred lawman stands alone on the sun-baked boardwalk of a frontier mining town, bracing for a duel against seven ruthless riders.'
  },
  {
    title: 'The Golden Serpent: Tomb of the Sun Emperor',
    logline: 'A fedora-wearing archaeologist races mercenary rivals through ancient Mayan jungle crypts packed with deadly traps.',
    genre: 'Aventura Arqueológica Pulp / Lost Tomb Raiders',
    premise: 'Classic pulp adventure in the vein of Indiana Jones. Navigating collapsing stone bridges, poison darts, underground river caverns, and mercenary ambushes deep in the Mesoamerican rainforest to locate a mythical golden relic.'
  },
  {
    title: 'Checkpoint Charlie: The Shadow Defector',
    logline: 'An MI6 handler must smuggle a high-ranking defector across the Berlin Wall under the watchful sights of Soviet snipers.',
    genre: 'Espionaje Guerra Fría / Clandestine Agents',
    premise: 'Taut 1960s espionage thriller with encrypted microdots, rainy cobblestone checkpoints, smoke-filled safehouses, and double agents where trust is fatal and a single whisper can bring down an empire.'
  },
  {
    title: 'Blade of the Autumn Wind: The Ronin\'s Oath',
    logline: 'A masterless samurai draws his blade to protect a mountain farming village from a corrupt warlord\'s tax collectors.',
    genre: 'Samuráis & Chambara / Bushido Honor & Duels',
    premise: 'Authentic Chambara samurai drama inspired by Akira Kurosawa. Under driving autumn rainstorms, a stoic wandering ronin honors an unwritten oath of bushido, facing insurmountable odds with lightning-quick katana draws.'
  },
  {
    title: 'Scandal at Pemberley Hall',
    logline: 'A spirited young woman and an enigmatic duke navigate dangerous ballroom court gossip and a stolen love letter.',
    genre: 'Romance de Época / Regency & Victorian Intrigue',
    premise: 'Lavish Victorian period drama filled with candlelit ballrooms, whispered waltzes, rigid societal etiquette, and high-stakes family fortunes hanging on a single written correspondence.'
  },
  {
    title: 'No Man\'s Dawn: The Forgotten Battalion',
    logline: 'A squad of frontline infantrymen and a young combat medic hold a ruined farmhouse in the Ardennes through a bitter winter night.',
    genre: 'Bélico Histórico / Brotherhood in the Trenches',
    premise: 'Gripping historical war drama honoring sacrifice and brotherhood. Amidst frozen trenches, mortar barrages, and failing ammunition, soldiers fight not for glory, but to bring each other home.'
  },
  {
    title: 'The Last Will of Lord Ravenscroft',
    logline: 'When an eccentric billionaire is poisoned during his birthday storm, an astute detective must find the killer among twelve heirs.',
    genre: 'Misterio Whodunnit de Mansión / Manor Murder Puzzle',
    premise: 'Clever, stylish country manor whodunnit. Cut off from the outside world by a torrential gale, a witty detective interrogates an eccentric ensemble of greedy family members, secret lovers, and suspicious butlers.'
  },
  {
    title: 'The Crimson Galleon: Curse of Isla Negra',
    logline: 'A rogue privateer captain and an escaped cartographer navigate uncharted reefs to claim a legendary sunken galleon.',
    genre: 'Piratas & Swashbuckling / High Seas Galleon Odyssey',
    premise: 'Vibrant swashbuckling pirate spectacle with cannon broadsides, swinging rigging duels, tropical island taverns, and cursed Spanish bullion in the golden age of Caribbean piracy.'
  },
  {
    title: 'Wrath of the Titans: The Spartan Odyssey',
    logline: 'A spartan champion braves the perilous Aegean Sea and underworld gates to return Apollo\'s fallen flame.',
    genre: 'Fantasía Mitológica / Odisea de Dioses y Héroes',
    premise: 'Mythic Greek epic featuring monumental marble temples, roaring sea storms sent by Poseidon, clashes with the Gorgon and Minotaur, and divine interventions from Mount Olympus.'
  },
  {
    title: 'Inferno Ridge: The Caldera Evacuation',
    logline: 'A volcanologist and a park ranger battle pyroclastic flows and collapsing roads to lead an isolated town to safety.',
    genre: 'Catástrofe & Supervivencia Natural / Extreme Elements',
    premise: 'Pulse-pounding natural disaster thriller. When a dormant supervolcano unexpectedly erupts, an emergency response team braves falling ash, tectonic fissures, and blinding blizzards to evacuate hundreds of trapped civilians.'
  }
];

/**
 * Curated procedural fallback: 4 varied candidates randomly selected and shuffled
 * from the extensive 12+ concept catalog to prevent repetition.
 */
export function getFallbackBlockbusterCandidates(existingTitles: string[] = []): BlockbusterCandidate[] {
  const shuffled = [...EXTENSIVE_FALLBACK_CANDIDATES].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 4);

  return picks.map((p, idx) => ({
    id: (['A', 'B', 'C', 'D'] as const)[idx],
    ...p
  }));
}
