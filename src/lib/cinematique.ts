/**
 * Cinematique Master Film Techniques & Cinematography Library
 * Sourced & structured from Cinematique by VVSVS (https://vvsvs.pro/cinematique).
 * 
 * Provides standard film techniques across camera framing, movement,
 * lighting setups, lens optics, film stocks, and visual storytelling for AI generation.
 */

export interface FilmTechnique {
  id: string;
  name: string;
  category: 'shot-framing' | 'camera-movement' | 'lighting' | 'composition' | 'optics-stock' | 'genre-aesthetic';
  description: string;
  promptSyntax: string;
  historicalReference?: string;
}

export const CINEMATIQUE_SHOT_TYPES = [
  {
    id: "extreme-close-up",
    name: "Extreme Close-Up (ECU)",
    framing: "Intensely tight focus on a micro-detail (pupil dilation, trembling lip, bead of sweat on trigger finger)",
    optics: "100mm macro lens at f/2.8, razor-thin depth of field, micro-texture clarity",
    effect: "Forces psychological intimacy and unbearable tension (Sergio Leone Mexican standoff style)"
  },
  {
    id: "choker-shot",
    name: "Choker Shot",
    framing: "Suffocating framing from hairline to chin with zero background visible",
    optics: "85mm prime at T2.0, shallow focus melting periphery into darkness",
    effect: "Extreme emotional vulnerability, psychological claustrophobia (Bergman 'Persona' aesthetic)"
  },
  {
    id: "close-up",
    name: "Close-Up (CU)",
    framing: "Face and neck filling the screen, capturing subtle micro-expressions and eye movements",
    optics: "75mm portrait lens, smooth skin roll-off, soft bokeh background separation",
    effect: "Deep connection with character interiority (Dreyer 'Joan of Arc' intimacy)"
  },
  {
    id: "medium-close-up",
    name: "Medium Close-Up (MCU)",
    framing: "Framed from chest up, balancing facial emotion with shoulder posture and immediate spatial tension",
    optics: "50mm or 65mm prime at T2.0, natural perspective",
    effect: "Prestige cinematic dialogue default (Michael Mann 'Heat' intensity)"
  },
  {
    id: "cowboy-shot",
    name: "Cowboy Shot (American Shot)",
    framing: "Framed from mid-thigh up, including holstered sidearm, tactical belt, or signature prop",
    optics: "Techniscope 2-perf 35mm, 40mm anamorphic lens with slight barrel distortion",
    effect: "Coiled readiness, rugged authority, armed swagger (Sergio Leone / Tarantino signature)"
  },
  {
    id: "medium-shot",
    name: "Medium Shot (MS)",
    framing: "Waist-up framing revealing expressive hand gestures, weapon handling, and surrounding setting",
    optics: "35mm or 50mm lens at f/2.8, crisp midtone separation",
    effect: "Conversational rhythm, physical chemistry, dynamic spatial pacing"
  },
  {
    id: "over-the-shoulder",
    name: "Over-the-Shoulder (OTS)",
    framing: "Framed past the dark, out-of-focus silhouette of one character's shoulder and jaw onto the speaker",
    optics: "65mm lens at T2, deep chiaroscuro lighting, charged empty space between characters",
    effect: "Immersive presence inside the conversation, claustrophobic psychological tension (Wong Kar-wai / Fincher)"
  },
  {
    id: "insert-shot",
    name: "Insert Shot",
    framing: "Tight macro isolation of a pivotal object (keycard, cryptographic prism, ticking detonator, blood vial)",
    optics: "90mm macro at f/2.8, warm keylight accentuating scratches and material patina",
    effect: "Directs audience focus to decisive narrative catalyst (Hitchcock suspense object)"
  },
  {
    id: "low-angle-shot",
    name: "Low Angle Shot",
    framing: "Camera positioned below eye level shooting upward through converging vertical lines",
    optics: "18mm to 21mm wide-angle Cooke S4 lens exaggerating height and imposing mass",
    effect: "Dominance, megalomania, mythic power (Citizen Kane / Nolan 'The Dark Knight')"
  },
  {
    id: "high-angle-shot",
    name: "High Angle Shot",
    framing: "Camera positioned high above subject looking down, diminishing scale against the floor geometry",
    optics: "21mm wide lens, deep institutional perspective",
    effect: "Vulnerability, entrapment, surveillance dread (Hitchcock 'Vertigo' / Villeneuve 'Prisoners')"
  },
  {
    id: "dutch-angle",
    name: "Dutch Angle (Canted)",
    framing: "Camera tilted 15 to 25 degrees on its roll axis, skewing the horizon into sharp diagonal vectors",
    optics: "28mm anamorphic, anamorphic flare streaks bleeding across tilted planes",
    effect: "Psychological disorientation, vertigo, moral corruption (Carol Reed 'The Third Man')"
  },
  {
    id: "worm-eye-view",
    name: "Worm's Eye View",
    framing: "Camera planted flush at ground level tilted straight up toward colossal architecture or towering titans",
    optics: "14mm ultra-wide rectilinear lens, dramatic upward converging perspective lines",
    effect: "Vertiginous awe, crushing monolithic scale (Villeneuve 'Arrival')"
  },
  {
    id: "head-on-shot",
    name: "Head-On Shot (Kubrick Stare)",
    framing: "Subject centered facing directly into the camera lens with penetrating intensity, symmetrical backdrop",
    optics: "35mm Zeiss Master Prime at dead-center height, deep focus",
    effect: "Confrontational intimacy, psychological menace, breaking conventional cinematic distance"
  }
] as const;

export const CINEMATIQUE_CAMERA_MOVEMENTS = [
  {
    id: "steadicam-glide",
    name: "Steadicam Floating Tracking Shot",
    syntax: "Steadicam floating glide following subject at shoulder height through shifting environments, preternatural smooth motion, 24fps motion blur, Zeiss Standard Speed lenses, light temperature transitioning from warm tungsten to cool ambient"
  },
  {
    id: "slow-push-in",
    name: "Imperceptibly Slow Dolly Push-In",
    syntax: "Imperceptibly slow dolly push-in toward subject, camera moving forward on steel tracks from medium to medium close-up over 15 seconds, deepening emotional walls, 50mm Cooke Speed Panchro with subtle focus breathing"
  },
  {
    id: "lateral-tracking",
    name: "Lateral Dolly Tracking Shot",
    syntax: "Smooth lateral tracking shot moving parallel to subject, three distinct layers of parallax separation (blurred foreground pipes, sharp subject in mid-ground, distant receding city in background), 40mm Panavision Primo lens"
  },
  {
    id: "technocrane-arc",
    name: "Technocrane Crane Sweep",
    syntax: "Majestic Technocrane sweep beginning tight on subject then ascending and arching backward 20 feet into the air to reveal monumental surrounding environment, golden backlight pouring through atmospheric haze"
  },
  {
    id: "dolly-zoom-vertigo",
    name: "Vertigo Effect (Dolly Zoom / Zolly)",
    syntax: "Dolly zoom (zolly) on subject locked dead-center in frame while background rapidly warps and telescopes backward in spatial contradiction, counter-movement synchronization, 35mm anamorphic glass, Hitchcock psychological vertigo"
  },
  {
    id: "360-degree-orbit",
    name: "360-Degree Orbital Tracking",
    syntax: "360-degree camera orbit circling subject, background lights smearing into a continuous horizontal ribbon of oval anamorphic bokeh, centripetal kinetic energy, warm keylight contrasting with cool rim light"
  },
  {
    id: "whip-pan-snap",
    name: "Whip Pan Snap Transition",
    syntax: "High-speed whip pan snapping violently from empty space onto subject, heavy horizontal motion blur streaking colors into abstract ribbons before locking into razor-sharp focus within 4 frames, 35mm Zeiss Master Prime"
  },
  {
    id: "handheld-visceral",
    name: "Visceral Handheld Documentary Shorter",
    syntax: "Visceral handheld camera with organic operator breathing and reactive reframing, kinetic energy, subtle micro-shakes matching character heartbeat, 28mm wide lens, unvarnished cinéma vérité realism"
  },
  {
    id: "unbroken-oner",
    name: "Continuous Single Take (One-er)",
    syntax: "Unbroken single take choreographed continuously through tight corridors and blast gates, fluid Steadicam transition between character perspectives without cuts, ARRI Alexa Mini, Cooke S4 21mm"
  }
] as const;

export const CINEMATIQUE_LIGHTING_SETUPS = [
  {
    id: "chiaroscuro-tenebrism",
    name: "Caravaggio Chiaroscuro & Tenebrism",
    syntax: "Extreme Caravaggio chiaroscuro lighting with a single warm light source, face sculpted in rich amber highlights while surrounding environment vanishes into absolute inky blackness, contrast ratio exceeding 16:1, Gordon Willis toplight leaving eye sockets in dramatic shadow"
  },
  {
    id: "rembrandt-portrait",
    name: "Rembrandt Dramatic Key",
    syntax: "Rembrandt lighting setup with key light at 45 degrees high, creating the signature luminous triangle of light on the shadow cheek, warm 3200K tungsten tones transitioning into deep velvet umber shadows, 85mm portrait glass"
  },
  {
    id: "low-key-noir",
    name: "Low-Key Film Noir with Gobo Patterns",
    syntax: "Low-key noir lighting with 8:1 contrast ratio, deep impenetrable shadows claiming 80 percent of frame, hard directional beam sliced by gobo venetian blind shadow patterns across face, Kodak Double-X high contrast black and silver aesthetic"
  },
  {
    id: "practical-neon-drenched",
    name: "Practical Neon & Sodium Vapor",
    syntax: "Motivated practical lighting illuminated solely by in-scene electric cyan and magenta neon signage and amber halogen tubes, rain-slicked wet reflections on asphalt, no artificial fill, shot wide open at T1.3 on Zeiss Super Speeds, Christopher Doyle aesthetic"
  },
  {
    id: "golden-hour-backlight",
    name: "Golden Hour Anamorphic Backlight",
    syntax: "Golden hour magic light 20 minutes before sunset, blinding horizontal amber sunbursts flaring across Panavision anamorphic glass, long raking shadows, luminous rim light tracing silhouette hair, liquid gold atmospheric dust particles"
  },
  {
    id: "blue-hour-twilight",
    name: "Blue Hour Urban Twilight",
    syntax: "Blue hour twilight 20 minutes after sunset, sky a luminous deep cobalt blue, contrasted with warm 2700K tungsten practical lights inside windows, cool melancholic atmosphere, Michael Mann 'Heat' color palette"
  },
  {
    id: "cross-lighting-dual-tone",
    name: "Cross-Lighting Dual Color Temperature",
    syntax: "Cross-lighting from opposing sources: warm 3000K tungsten key light from left painting gold highlights, opposing cool 6500K daylight-blue kicker from right painting steel reflections, narrow ribbon of mixed color temperature on cheekbone"
  },
  {
    id: "volumetric-god-rays",
    name: "Volumetric Fog & Atmospheric God Rays",
    syntax: "Dense volumetric haze and steam plumes pierced by hard searchlight beams creating visible shafts of light (god rays), dust and rain particles shimmering in the beam, deep atmospheric perspective"
  },
  {
    id: "subterranean-uplighting",
    name: "Eerie Subterranean Uplighting",
    syntax: "Unnatural uplighting casting upward from glowing floor grates or fire below, reversing natural human shadow expectations, shadows thrown upward into eye sockets and brow ridge, eerie ominous tension"
  }
] as const;

export const CINEMATIQUE_OPTICS_AND_STOCKS = [
  {
    id: "panavision-c-anamorphic",
    name: "Panavision C-Series Anamorphic 35mm",
    syntax: "Panavision C-series anamorphic glass, 2.39:1 widescreen, signature horizontal streak flares in electric cyan, creamy oval bokeh, gentle barrel distortion at edges, organic 35mm celluloid grain"
  },
  {
    id: "cooke-s4-look",
    name: "Cooke S4/i Prime (The 'Cooke Look')",
    syntax: "Cooke S4/i 35mm primes, renowned 'Cooke Look' with organic warm skin-tone rendition, gentle highlight roll-off without digital harshness, round creamy out-of-focus background"
  },
  {
    id: "zeiss-master-prime",
    name: "Zeiss Master Prime Surgical Sharpness",
    syntax: "Zeiss Master Prime 40mm at T1.3, surgical edge-to-edge optical resolution, zero chromatic aberration, deep clinical blacks with luminous micro-contrast"
  },
  {
    id: "kodak-vision3-500t",
    name: "Kodak Vision3 500T (5219)",
    syntax: "Shot on 35mm Kodak Vision3 500T 5219 motion picture film stock, rich tungsten color balance, organic dancing silver-halide grain in midtones and shadows, golden amber highlight halation"
  },
  {
    id: "kodak-double-x-bw",
    name: "Kodak Double-X Black & White 5222",
    syntax: "Shot on Kodak Double-X 5222 black and white negative film, rich silvery midtones, punchy ink-black shadows, pronounced analog grain texture, classic film noir contrast"
  },
  {
    id: "imax-70mm-scale",
    name: "IMAX 65mm / 70mm Large Format",
    syntax: "IMAX 15-perf 70mm large format cinematography, colossal spatial resolving power, hyper-detailed texture on costumes and environments, breathtaking expansive dynamic range"
  }
] as const;

/**
 * 24+ Curated Film Aesthetic Presets combining genre, lenses, lighting,
 * and camera mechanics from Cinematique for blockbuster pitches & scene bibles.
 */
export const CINEMATIQUE_AESTHETIC_PRESETS = [
  "IMAX 65mm Superhero Spectacle, high-octane dynamic key lighting, heroic low-angle framing, vibrant primary colors, deep anamorphic flares, cinematic HDR contrast",
  "Makoto Shinkai & Ufotable Anime Style, luminous cel-shaded vibrancy, god rays piercing cumulus skies, dynamic action speed lines, high-saturation azure and sunset gradients, hyper-detailed background art",
  "Pixar & Spider-Verse Stylized 3D Animation, rich subsurface scattering on stylized characters, tactile materials, chromatic halftones, warm bounce lighting, whimsical saturation",
  "1940s Classic Film Noir, hard 8:1 chiaroscuro contrast, venetian blind gobo patterns, rain-slicked city pavements, fedoras and cigarette smoke plumes, Kodak Double-X high contrast black and white",
  "70mm Ultra Panavision High Epic Fantasy, torchlit medieval castle halls, sweeping misty mountain ranges, golden morning sunbeams breaking through ancient forests, rich velvet and steel textures",
  "Gritty 1970s Police Procedural, 35mm telephoto zoom compression, handheld Steadicam through fluorescent precinct corridors, authentic muted urban palette, dirty street realism",
  "David Fincher & Alfred Hitchcock Psychological Suspense, slow ominous push-in, sickly green-amber desaturation, claustrophobic split-diopter focus, unsettling symmetrical framing",
  "Sergio Leone Operatic Western, extreme close-up on squinting eyes cutting to infinite desert horizon, hot tungsten backlight, Techniscope 2.35:1 panoramic widescreen",
  "Pulp Archaeological Adventure, torchlit ancient Mayan temple crypts, dusty crumbling stone reliefs, warm amber firelight dancing on weathered leather jackets and golden idols",
  "1960s Cold War Espionage, grainy 16mm surveillance aesthetic, wet cobblestone streets of divided Berlin, trench coat silhouettes under sodium streetlamps, desaturated slate and muted amber",
  "Akira Kurosawa Chambara Samurai, sweeping wide compositions, driving rainstorms, howling winds whipping pampas grass, stark monochrome contrast, lightning-fast katana draw cadence",
  "Victorian Period Romance, candlelit ballroom opulence, soft silk diffusion filters, pastel Georgian architecture, warm 2800K candlelight reflecting in chandeliers, lush organic Cooke look",
  "Technicolor 3-Strip Swashbuckling Adventure, roaring azure ocean waves, sun-drenched oak galleon decks, billowing canvas sails, brilliant golden sunlight and salty spray",
  "Classic Buddy Comedy Adventure, vibrant high-key cinematic lighting, energetic medium shots with wide-angle comedic timing, warm saturated colors, fluid camera tracks",
  "Dario Argento Giallo Horror, saturated primary lighting with blood-crimson and cobalt cross-lighting, 100mm macro inserts on lethal artifacts, creamy spherical bokeh",
  "Wong Kar-wai Step-Printed Romance, 50mm Summilux f/1.4 shallow focus, step-printed slow motion, smudged neon reflections, intimate over-the-shoulder framing",
  "Stanley Kubrick Planimetric Symmetry, dead-center one-point perspective, clinical high-key corridor illumination, wide 18mm rectilinear framing with deep focus",
  "Denis Villeneuve Monolithic Brutalism, colossal geometric architecture dwarfing small human silhouettes, muted desaturated palette with single high-chroma orange accent",
  "Terrence Malick Magic Hour Poetry, natural available golden hour light, low-angle Steadicam glide skimming tall prairie grass, wide 21mm lens drinking sunlight",
  "Roger Deakins Motivated Naturalism, meticulously justified light sources from lanterns and windows, soft muslin bounce fill, clean Alexa LF large format clarity",
  "French New Wave Nouvelle Vague, energetic handheld 16mm, raw available Parisian daylight, jump-cut rhythmic energy, high-contrast black and white celluloid",
  "Park Chan-wook Baroque Revenge, opulent wallpaper patterns, dynamic split-screen composition, extreme overhead shot, razor-sharp grading",
  "German Expressionism Caligari aesthetic, angular distorted brutalism, painted razor-sharp shadows, extreme low-angle worm's eye perspective, stark black and bone-white tonality",
  "Folk Horror Ancient Woods, dappled moss-green forest light, pagan rune carvings in birch bark, low-hanging mist, vintage Canon K35 creamy flare characteristics"
];

/**
 * Standard Prompt Engineering Rules for LLM Directors (DeepSeek).
 * Enforces Cinematique's 6-layer visual prompt formula & 4-layer camera motion formula.
 */
export const CINEMATIQUE_SYSTEM_PROMPT_DIRECTIVES = `
CINEMATIQUE CINEMATOGRAPHY ENGINE (MANDATORY PROMPT CRAFTING RULES):
Every "visualPrompt" and "cameraMotionPrompt" MUST follow professional Hollywood cinematographer grammar sourced from Cinematique (https://vvsvs.pro/cinematique):

1. "visualPrompt" STRUCTURE (Mandatory 6-Layer Cinematic Formula):
   [Layer 1: Shot Framing & Scale] (e.g. "Medium Close-Up (MCU)", "Cowboy Shot", "Extreme Close-Up", "Choker Shot", "Low-Angle Hero Shot", "Over-the-Shoulder").
   [Layer 2: Subject & Wardrobe] (Full immutable character traits, signature costumes, physical micro-details, eye direction).
   [Layer 3: Setting Architecture & Spatial Depth] (Foreground elements for depth, mid-ground subject, receding background architecture).
   [Layer 4: Lighting Setup & Kelvin Temperature] (e.g. "Caravaggio Chiaroscuro 16:1 contrast", "Rembrandt triangle key at 3200K", "Low-Key Noir with gobo venetian shadows", "Cross-lighting with 2700K tungsten and 6500K blue kicker", "Practical neon reflections in rain puddles").
   [Layer 5: Lens Optics, Camera Package & Film Stock] (e.g. "Shot on 35mm Panavision C-Series anamorphic glass, oval bokeh, horizontal streak flare", "Cooke S4/i prime with organic skin roll-off", "Zeiss Master Prime T1.3", "Kodak Vision3 500T 5219 motion picture stock").
   [Layer 6: Atmospheric Physics & Color Science] (e.g. "Volumetric steam shafts, airborne dust motes in light beam, rich teal-amber split-tone, 24fps motion blur, 480p 16:9 film still").

2. "cameraMotionPrompt" STRUCTURE (Mandatory 4-Layer Movement Formula):
   [Layer 1: Rig & Movement Type] (e.g. "Steadicam floating tracking glide", "Imperceptibly slow dolly push-in", "Smooth lateral tracking on steel rails with 3-layer parallax separation", "Technocrane vertical arc sweep", "Dolly zoom (vertigo zolly)", "360-degree orbital track", "Violent whip-pan snap").
   [Layer 2: Trajectory & Pacing] (e.g. "Gliding smoothly at shoulder height at steady walking pace", "Slow 15-second creeping advance closing from 8ft to 3ft distance").
   [Layer 3: Focal Length & Depth Behavior] (e.g. "40mm anamorphic prime wide open, shallow focus with creamy background separation", "2-second deliberate rack focus from foreground prop to background eyes").
   [Layer 4: Optical Physics & Shutter] (e.g. "Horizontal anamorphic cyan streak flare catching lens edge, 180-degree shutter angle with natural 24fps cinematic motion blur").
`;

/**
 * Returns a random curated aesthetic preset from Cinematique.
 */
export function getRandomCinematiqueAesthetic(): string {
  return CINEMATIQUE_AESTHETIC_PRESETS[Math.floor(Math.random() * CINEMATIQUE_AESTHETIC_PRESETS.length)];
}

/**
 * Returns N unique curated aesthetic presets from Cinematique.
 */
export function getUniqueCinematiqueAesthetics(count: number): string[] {
  const shuffled = [...CINEMATIQUE_AESTHETIC_PRESETS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
