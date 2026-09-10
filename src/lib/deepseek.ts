import { Character, Prop, SceneEnvironment, MovieBible, MovieStep, DecisionOption, Movie, SubtitleCue, BlockbusterCandidate } from '@/types/cinema';

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
6. NARRATIVE ARC: The 100-step film follows a strict act structure that every step must respect — steps 1-19 SETUP (present the world, the characters and the central problem), steps 20-79 DEVELOPMENT (escalating conflict, twists and new characters), steps 80-96 DENOUEMENT (converging resolution), steps 97-99 EPIC FINALE (maximum-intensity climax), and step 100 THE END (definitive closing scene, no new conflicts). "masterArcThread" and "initialPlot" must be designed so the story can be resolved by step 100.

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
      "visualPrompt": "Ultra-detailed visual prompt in English for fal.ai Minimax H3-Max (16:9) with character and prop tokens",
      "cameraMotionPrompt": "Cinematic camera movement in English (e.g. Slow tracking dolly-in, 35mm anamorphic)",
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
      "visualPrompt": "Ultra-detailed visual prompt in English for fal.ai Minimax H3-Max (16:9) continuing scene 1",
      "cameraMotionPrompt": "Dynamic camera tracking or handheld kinetic pan in English",
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
      "visualPrompt": "Ultra-detailed visual prompt in English for fal.ai Minimax H3-Max (16:9) showing rising stakes",
      "cameraMotionPrompt": "Rapid orbit or whip pan settling into a tense close-up in English",
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
      "visualPrompt": "Ultra-detailed visual prompt in English for fal.ai Minimax H3-Max (16:9) with peak tension",
      "cameraMotionPrompt": "Dramatic slow-motion zoom-out or tense Dutch angle in English",
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
          temperature: 0.85
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        const parsed = JSON.parse(content);
        
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
      visualPrompt: `Cinematic masterpiece shot of ${firstChar.name} (${firstChar.visualTraits}) with ${firstProp.name} in ${preset.environments[0].name}, ${preset.environments[0].lighting}, ${preset.cinematicStyle}, photorealistic 8k, scene ${stepNum} of 4`,
      cameraMotionPrompt: "Slow tracking camera dollying in with dramatic cinematic depth of field and anamorphic lens flares, 24fps",
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
 * Narrative arc directive for a given step number. The 100-step film follows a
 * strict act structure: setup (1-19), development (20-79), denouement (80-96),
 * epic finale (97-99) and THE END at step 100.
 */
export function getNarrativeArcDirective(stepNum: number): string {
  if (stepNum >= 100) {
    return `NARRATIVE ARC PHASE — THE END (FINAL SCENE): Step 100 is the ABSOLUTE and definitive ending of the film. The story reaches its emotional and thematic conclusion HERE: the central conflict is fully resolved, the antagonist's fate is sealed, every loose thread closes, and the film ends with an epic cathartic final image. Do NOT introduce any new conflict, character or cliffhanger. The two voting options are the audience's final artistic choice between two flavors of the closing moment (e.g. bittersweet vs hopeful, sacrifice vs reunion) — BOTH options must still END the story.`;
  }
  if (stepNum >= 97) {
    return `NARRATIVE ARC PHASE — EPIC FINALE (steps 97-99, building toward the ending at step 100): This is the climax of the entire film. Raise intensity to the absolute maximum: the ultimate confrontation, the final battle, the highest-stakes decision. Converge every plot thread, character and prop introduced so far. The outcome of this scene must lead DIRECTLY toward the definitive ending in step 100.`;
  }
  if (stepNum >= 80) {
    return `NARRATIVE ARC PHASE — DENOUEMENT / RESOLUTION (steps 80-99): The story is in its closing act. Conflicts begin to resolve: alliances are tested, secrets are revealed, the antagonist's endgame takes its final form, and stakes become personal and irreversible. Converge loose threads toward the epic finale of the last scenes (97-99) and the definitive ending at step 100. Each scene raises tension while moving the plot toward its conclusion.`;
  }
  if (stepNum >= 20) {
    return `NARRATIVE ARC PHASE — DEVELOPMENT (steps 20-79): The story is in its middle act. Escalate conflict: complications, betrayals, twists and mid-point reversals. Deepen character relationships and raise the stakes with every scene. New characters and their signature props may be introduced here. Keep every scene connected to the master plot while building momentum toward the final act.`;
  }
  return `NARRATIVE ARC PHASE — SETUP / EXPOSITION (steps 1-19): The story is in its opening act. These scenes must plant the problem and present the situation: introduce the world, the protagonist, the central conflict and the stakes. Establish mood, tone and the rules of the universe. Near step 20 the protagonist must be locked into the main quest at the point of no return.`;
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
  const apiKey = process.env.DEEPSEEK_API_KEY;
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
      const systemPrompt = `You are an elite Interactive Cinema AI Director. The film spans a coherent 100-step arc.
The audience just voted for OPTION ${chosenOptionId}: "${chosenOption.title}" (${chosenOption.text}).
You are generating STEP ${nextStepNum} of 100 (exactly a 15-second cinematic clip for MiniMax H3-Max in 480p 16:9).

${getNarrativeArcDirective(nextStepNum)}
${influenceDirective}
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
Existing props: ${JSON.stringify(movie.bible.props.map(p => ({ id: p.id, name: p.name, owner: p.ownerCharacterName })))};`;

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

  // ── NARRATIVE ARC OVERRIDE: Finale steps converge into the epic ending (step 100 = THE END) ──
  if (nextStepNum >= 97) {
    const finalChar = movie.bible.characters[0] || char;
    const finalProp = movie.bible.props[0] || prop;
    const isLastScene = nextStepNum >= 100;

    if (isLastScene) {
      synopsis = `THE END. The fate of ${finalChar.name} and the ${finalProp.name} is decided as every audience choice across the entire 100-step journey converges into one defining, cathartic moment. The conflict is resolved and the film closes on an epic final image.`;
      visualPrompt = `Epic finale shot of ${finalChar.name} (${finalChar.visualTraits}) at the end of the journey, the ${finalProp.name} (${finalProp.visualAppearance}) in its final state, the story's central conflict resolved, majestic golden-hour cinematic lighting, 480p 16:9 anamorphic film`;
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
      synopsis = `EPIC FINALE. The final confrontation erupts: ${finalChar.name} unleashes everything in the climactic battle that will decide the fate of the ${finalProp.name} and every life bound to it. The story surges toward its definitive ending.`;
      visualPrompt = `Maximum-intensity climactic battle, ${finalChar.name} (${finalChar.visualTraits}) wielding the ${finalProp.name} (${finalProp.visualAppearance}), converging plot threads, epic scale explosion of light and shadow, cinematic 480p 16:9 anamorphic film`;
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

const CREATIVE_AESTHETICS = [
  "Anamorphic 35mm Panavision, amber tungsten flares, rain-slicked obsidian pavements, deep cyan shadows",
  "70mm IMAX Ultra, volumetric ice-fog, muted lichen greens, candid candlelight, glowing runic embers",
  "High-contrast monochrome with vivid splashes of bioluminescent teal and cyber magenta",
  "Sun-bleached brutalist desert architecture, blinding golden sunbursts, oxidized turquoise copper",
  "Heavy gaslight sepia, copper steam plumes, polished brass gears, dark velvet shadows",
  "Deep void blacks, pulsing stellar nebulae, prismatic chromatic aberration, cockpit HUD glare"
];

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
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  try {
    const systemPrompt = `You are an elite in-story product-placement director for interactive cinema.
Write ONE ultra-detailed cinematic visual prompt in ENGLISH for a 15-second fal.ai MiniMax video clip.
RULES:
1. The sponsor product/service must be woven INTO the film's story world as a natural element: a character uses it, finds it, wears it, or it appears as set dressing — never a separate commercial, never a logo overlay, never a jump cut out of the film.
2. Maintain the EXACT same cinematography, lighting, lens, film grain and color grade as the film.
3. Include the film's characters and current environment so the clip feels like the next shot of the movie.
4. The output must be a single continuous visual prompt (no script format), 150-300 words, ending with a camera movement description.

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
        temperature: 0.8
      })
    });

    if (response.ok) {
      const data = await response.json();
      const parsed = JSON.parse(data.choices[0]?.message?.content);
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
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (apiKey) {
    try {
      const selectedGenres = sampleUniqueRandom(CREATIVE_GENRES, 4);
      const selectedProtagonists = sampleUniqueRandom(CREATIVE_PROTAGONISTS, 4);
      const selectedCatalysts = sampleUniqueRandom(CREATIVE_CATALYSTS, 4);
      const selectedAesthetics = sampleUniqueRandom(CREATIVE_AESTHETICS, 4);

      const systemPrompt = `You are an avant-garde Head of Development at an interactive blockbuster cinema studio.
Your mission is to formulate EXACTLY 4 completely DIFFERENT, wild, high-concept interactive film pitches for a live 100-step audience-driven interactive movie.

MANDATORY RULES:
1. RADICAL DIVERSITY: Each of the 4 candidates MUST be from a completely different genre, tone, visual style, and emotional palette. Avoid Hollywood clichés, generic medieval tropes, or basic cyber hackers.
2. AUDIENCE HOOK: Audience members vote after reading ONLY the title, logline, and genre. The logline must be gripping, cinematic, and sell the core concept instantly.
3. CREATIVE SEEDS TO INSPIRE THE 4 SLOTS:
- Candidate A inspiration: ${selectedGenres[0]} featuring ${selectedProtagonists[0]} facing ${selectedCatalysts[0]} with aesthetic of ${selectedAesthetics[0]}.
- Candidate B inspiration: ${selectedGenres[1]} featuring ${selectedProtagonists[1]} facing ${selectedCatalysts[1]} with aesthetic of ${selectedAesthetics[1]}.
- Candidate C inspiration: ${selectedGenres[2]} featuring ${selectedProtagonists[2]} facing ${selectedCatalysts[2]} with aesthetic of ${selectedAesthetics[2]}.
- Candidate D inspiration: ${selectedGenres[3]} featuring ${selectedProtagonists[3]} facing ${selectedCatalysts[3]} with aesthetic of ${selectedAesthetics[3]}.

4. Respond ONLY with a valid JSON object matching this schema:
{
  "candidates": [
    {
      "title": "Unforgettable Cinematic Title",
      "logline": "One razor-sharp sentence describing the hook, protagonist goal, and immediate stakes.",
      "genre": "Precise Distinct Genre / Hybrid",
      "premise": "Full creative brief: the world, protagonist, antagonist, central conflict, signature prop/technology, and the core audience choices across the 100-step arc."
    }
  ]
}`;

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
            { role: "user", content: `Generate 4 wildly different, fresh and compelling blockbuster candidate pitches now. Timestamp entropy: ${Date.now()}` }
          ],
          response_format: { type: "json_object" },
          temperature: 1.0
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0]?.message?.content);
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

