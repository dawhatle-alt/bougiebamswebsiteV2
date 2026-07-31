import { logger } from "./logger";

// AI composition for the tablescape builder. Gemini is the default: in the
// July 2026 bake-off it reproduced the real LiteMahj tiles (pink backs, the
// flamingo/gecko/umbrella faces) far more faithfully than gpt-image-1.5 and
// costs roughly half. Everything provider-specific lives behind
// composeTablescape() so swapping engines is a one-file change.

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-image-preview";

export interface ReferenceImage {
  /** Slot this product fills, used to describe the image to the model. */
  slot: string;
  label: string;
  data: Buffer;
  mimeType: string;
  /** Product is from the Floating Mahjong line, which stages in a pool. */
  floating?: boolean;
}

export interface ComposedImage {
  buffer: Buffer;
  mimeType: string;
  provider: string;
  model: string;
  durationMs: number;
}

export class TablescapeGenerationError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "TablescapeGenerationError";
  }
}

/**
 * Stored image paths often carry a .png name while holding WebP or JPEG bytes,
 * so trust the magic bytes rather than the filename.
 */
export function sniffImageMime(buf: Buffer): string {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return "image/png";
}

/**
 * Builds the staging prompt. The two negative constraints are load-bearing and
 * came out of the Phase 0 spike: without the "stays printed on the mat" rule
 * the model lifted the mat's painted characters out of the artwork and staged
 * them as real objects (Monroe the monkey vanished into a set of ginger jars),
 * and without "flat mat, not a tablecloth" it draped the mat over the table.
 *
 * A Floating Mahjong board swaps the whole scene to a pool. The trigger is the
 * board itself, not the tiles: floating tiles pair fine with a fabric mat
 * indoors, but a fabric mat in a swimming pool reads as a mistake.
 */
export function buildTablescapePrompt(refs: ReferenceImage[]): string {
  const mat = refs.find((r) => r.slot === "mat");
  const tiles = refs.find((r) => r.slot === "tiles");
  const extras = refs.filter((r) => r.slot !== "mat" && r.slot !== "tiles");
  const inPool = mat?.floating === true;

  const lines: string[] = [
    inPool
      ? "Photorealistic summer lifestyle product photo for a luxury mahjong brand, shot from a high three-quarter angle looking down at a floating mahjong board on the water of a sunlit swimming pool."
      : "Photorealistic lifestyle product photo for a luxury mahjong brand, shot from a high three-quarter angle over an elegant table.",
    "",
  ];

  if (mat) {
    const surface = inPool
      ? `Floating on the surface of the pool is EXACTLY the square floating mahjong board shown in the reference image titled "${mat.label}": a buoyant square board resting flat on the water, level and fully visible with all four edges above the waterline, water lapping gently against its sides.`
      : `On the table lies EXACTLY the square mahjong mat shown in the reference image titled "${mat.label}": a flat, thin square game mat with a stitched border, lying perfectly flat with all four edges visible on the tabletop. It is NOT a tablecloth and does not drape over the sides.`;
    lines.push(
      `${surface} Reproduce its printed artwork with complete fidelity — same composition, colors, border and details, including any animal characters, figures and objects that are part of the print. Every element of the artwork stays PRINTED FLAT ON THE ${
        inPool ? "BOARD" : "MAT"
      } SURFACE: never remove one, and never turn a printed element into a real three-dimensional object in the scene. Do not simplify, restyle or re-imagine the artwork. Remove any repeated watermark text overlay so it shows only its artwork.`,
      "",
    );
  }

  if (tiles) {
    lines.push(
      `The mahjong tiles are EXACTLY the tiles shown in the reference image titled "${tiles.label}". Reproduce their real colors, materials and face designs — tile backs, tile faces and the engraved motifs must match that photo. Do not substitute generic ivory mahjong tiles. Arrange them naturally: some face-up near the center of the ${
        inPool ? "board, the rest standing in neat rows along its edges — the tiles sit securely on the board and none are sinking or drifting in the water" : "mat, the rest lined up in the racks"
      }.`,
      "",
    );
  }

  if (extras.length > 0) {
    lines.push(
      `Also place these products in the scene, each reproduced exactly as photographed in its reference image: ${extras
        .map((r) => `"${r.label}" (${r.slot.replace(/_/g, " ")})`)
        .join(", ")}.`,
      "",
    );
  }

  // Racks would drift away on open water, so only the tabletop scene gets them.
  if (!inPool && !refs.some((r) => r.slot === "rack")) {
    lines.push("Add four simple, elegant clear acrylic tile racks with pushers, one on each side of the mat.", "");
  }

  lines.push(
    inPool
      ? "Setting: a bright resort-style swimming pool on a sunny afternoon — clear turquoise water with gentle ripples and dappled light, a frozen cocktail and sunglasses resting on the pool coping at the edge of frame, palm shadows, shallow depth of field. High-end editorial quality, like a summer brand campaign. No people in the water. No text, no logos and no watermarks anywhere in the image."
      : "Setting: a bright, styled home interior — soft natural window light, a hint of florals and a cocktail at the edge of frame, shallow depth of field. High-end editorial quality, like a brand photo shoot. No text, no logos and no watermarks anywhere in the image.",
  );

  return lines.join("\n");
}

async function composeWithGemini(refs: ReferenceImage[], prompt: string): Promise<ComposedImage> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new TablescapeGenerationError("GEMINI_API_KEY is not configured on the server.", 503);
  }
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_MODEL;
  const startedAt = Date.now();

  const parts: unknown[] = [
    { text: prompt },
    ...refs.map((r) => ({
      inline_data: { mime_type: r.mimeType, data: r.data.toString("base64") },
    })),
  ];

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:2" } },
        }),
        // Leaves room inside the function's 60s ceiling to still store the
        // result and answer the request. A typical compose runs ~40s.
        signal: AbortSignal.timeout(50_000),
      },
    );
  } catch (err) {
    logger.error({ err, model }, "Tablescape generation request failed");
    throw new TablescapeGenerationError(
      "The image service took too long to respond. Please try again.",
      504,
    );
  }

  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
    error?: { message?: string };
  };

  if (!response.ok) {
    logger.error({ status: response.status, error: body.error, model }, "Tablescape generation rejected");
    // 429 here means the Google project is out of quota or unbilled — worth
    // surfacing distinctly so the owner knows to top up rather than debug.
    throw new TablescapeGenerationError(
      response.status === 429
        ? "The image service is out of quota. Please check the Google AI billing account."
        : "The image service could not create this tablescape. Please try again.",
      response.status === 429 ? 503 : 502,
    );
  }

  const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const data = part?.inlineData?.data;
  if (!data) {
    logger.error({ model }, "Tablescape generation returned no image");
    throw new TablescapeGenerationError("The image service returned no image. Please try again.");
  }

  const buffer = Buffer.from(data, "base64");
  return {
    buffer,
    mimeType: part?.inlineData?.mimeType || sniffImageMime(buffer),
    provider: "gemini",
    model,
    durationMs: Date.now() - startedAt,
  };
}

export async function composeTablescape(refs: ReferenceImage[]): Promise<ComposedImage> {
  const prompt = buildTablescapePrompt(refs);
  return composeWithGemini(refs, prompt);
}
