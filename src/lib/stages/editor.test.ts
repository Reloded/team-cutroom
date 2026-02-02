import { describe, it, expect } from "vitest"
import { editorStage } from "./editor"
import { VoiceOutput, VisualOutput } from "./types"

const mockVoice: VoiceOutput = {
  audioUrl: "https://example.com/audio.mp3",
  duration: 30,
  transcript: "Test transcript",
  timestamps: [],
}

const mockVisual: VisualOutput = {
  clips: [
    {
      url: "https://example.com/clip1.mp4",
      duration: 15,
      startTime: 0,
      description: "First clip",
      source: "pexels",
    },
    {
      url: "https://example.com/clip2.mp4",
      duration: 15,
      startTime: 15,
      description: "Second clip",
      source: "pexels",
    },
  ],
  images: [],
  overlays: [
    {
      type: "text",
      content: "Title",
      startTime: 0,
      duration: 3,
    },
  ],
}

describe("Editor Stage", () => {
  describe("validate", () => {
    it("accepts valid input with voice and visual", () => {
      const result = editorStage.validate({
        voice: mockVoice,
        visual: mockVisual,
      })
      expect(result.valid).toBe(true)
    })

    it("accepts input with custom format", () => {
      const result = editorStage.validate({
        voice: mockVoice,
        visual: mockVisual,
        format: { width: 1920, height: 1080, fps: 60 },
      })
      expect(result.valid).toBe(true)
    })

    it("rejects missing voice", () => {
      const result = editorStage.validate({
        visual: mockVisual,
      })
      expect(result.valid).toBe(false)
    })

    it("rejects missing visual", () => {
      const result = editorStage.validate({
        voice: mockVoice,
      })
      expect(result.valid).toBe(false)
    })

    it("rejects voice without audioUrl", () => {
      const result = editorStage.validate({
        voice: { duration: 30 },
        visual: mockVisual,
      })
      expect(result.valid).toBe(false)
    })
  })

  describe("execute", () => {
    it("returns successful result", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)

      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
    })

    it("returns video URL in output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)
      const output = result.output as any

      expect(output.videoUrl).toBeDefined()
      expect(typeof output.videoUrl).toBe("string")
    })

    it("returns thumbnail URL in output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)
      const output = result.output as any

      expect(output.thumbnailUrl).toBeDefined()
    })

    it("returns format info in output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)
      const output = result.output as any

      expect(output.format).toBeDefined()
      expect(output.format.width).toBe(1080)
      expect(output.format.height).toBe(1920) // 9:16 portrait
    })

    it("includes render time in output", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)
      const output = result.output as any

      expect(output.renderTime).toBeDefined()
      expect(typeof output.renderTime).toBe("number")
    })

    it("includes artifacts", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)

      expect(result.artifacts).toBeDefined()
      expect(result.artifacts?.length).toBe(2)
      expect(result.artifacts?.some(a => a.type === "video")).toBe(true)
      expect(result.artifacts?.some(a => a.type === "image")).toBe(true)
    })

    it("fails gracefully with missing voice audioUrl", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: { duration: 30 }, // Missing audioUrl
          visual: mockVisual,
        },
      }

      const result = await editorStage.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain("audioUrl")
    })

    it("fails gracefully with empty clips", async () => {
      const context = {
        pipelineId: "test-pipeline",
        stageId: "test-stage",
        input: {
          voice: mockVoice,
          visual: { clips: [], overlays: [], images: [] },
        },
      }

      const result = await editorStage.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain("clips")
    })
  })

  describe("stage properties", () => {
    it("has correct name", () => {
      expect(editorStage.name).toBe("EDITOR")
    })
  })
})
