import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  VisualOutput,
  VideoClip,
  ImageAsset,
  Overlay,
  ScriptOutput,
} from "./types"

// Input schema - expects script output from previous stage
const VisualInputSchema = z.object({
  script: z.object({
    body: z.array(z.object({
      visualCue: z.string(),
      duration: z.number(),
    })),
  }),
  style: z.enum(["stock", "generated", "mixed"]).optional(),
})

const PEXELS_API = "https://api.pexels.com/videos/search"

export const visualStage: StageHandler = {
  name: "VISUAL",

  validate(input: unknown): ValidationResult {
    const result = VisualInputSchema.safeParse(input)
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      }
    }
    return { valid: true }
  },

  async execute(context: StageContext): Promise<StageResult> {
    try {
      // Get script from previous stage output or input
      const script = (context.previousOutput || (context.input as any).script) as ScriptOutput
      const style = (context.input as any).style || "stock"

      const clips: VideoClip[] = []
      const images: ImageAsset[] = []
      const overlays: Overlay[] = []

      let currentTime = 0

      // Generate visuals for each script section
      for (const section of script.body) {
        // Extract keywords from visual cue
        const keywords = extractKeywords(section.visualCue)

        // Search for stock footage
        const apiKey = process.env.PEXELS_API_KEY
        if (apiKey && style !== "generated" && !context.dryRun) {
          try {
            const video = await searchPexelsVideo(keywords, apiKey)
            if (video) {
              clips.push({
                url: video.url,
                duration: section.duration,
                startTime: currentTime,
                description: section.visualCue,
                source: "pexels",
              })
            }
          } catch {
            // Fallback to placeholder
            clips.push(createPlaceholderClip(section.visualCue, section.duration, currentTime))
          }
        } else {
          // No API key - use placeholder
          clips.push(createPlaceholderClip(section.visualCue, section.duration, currentTime))
        }

        // Generate text overlay for the section
        if (section.heading) {
          overlays.push({
            type: "text",
            content: section.heading,
            startTime: currentTime,
            duration: Math.min(3, section.duration), // Show heading for max 3 seconds
            style: {
              fontSize: 48,
              fontWeight: "bold",
              color: "#ffffff",
              position: "bottom-center",
            },
          })
        }

        currentTime += section.duration
      }

      const output: VisualOutput = {
        clips,
        images,
        overlays,
      }

      return {
        success: true,
        output,
        metadata: {
          style,
          clipCount: clips.length,
          overlayCount: overlays.length,
          totalDuration: currentTime,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: (error as Error).message,
      }
    }
  },
}

function extractKeywords(visualCue: string): string {
  // Extract meaningful keywords from visual cue
  // Remove common words, keep nouns and adjectives
  const stopWords = new Set([
    "show", "display", "for", "the", "a", "an", "with", "and", "or",
    "animation", "b-roll", "relevant", "appropriate", "video", "image",
  ])

  return visualCue
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 3)
    .join(" ")
}

interface PexelsVideo {
  url: string
  width: number
  height: number
  duration: number
}

async function searchPexelsVideo(query: string, apiKey: string): Promise<PexelsVideo | null> {
  const response = await fetch(
    `${PEXELS_API}?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`,
    {
      headers: {
        Authorization: apiKey,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.statusText}`)
  }

  const data = await response.json()
  
  if (!data.videos || data.videos.length === 0) {
    return null
  }

  const video = data.videos[0]
  const file = video.video_files?.find((f: any) => f.quality === "hd") || video.video_files?.[0]

  if (!file) return null

  return {
    url: file.link,
    width: file.width,
    height: file.height,
    duration: video.duration,
  }
}

function createPlaceholderClip(visualCue: string, duration: number, startTime: number): VideoClip {
  return {
    url: `https://placeholder.pexels.com/video?cue=${encodeURIComponent(visualCue)}`,
    duration,
    startTime,
    description: visualCue,
    source: "placeholder",
  }
}
