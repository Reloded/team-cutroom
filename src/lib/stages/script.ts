import { z } from "zod"
import {
  StageHandler,
  StageContext,
  StageResult,
  ValidationResult,
  ScriptOutput,
  ScriptSection,
  ResearchOutput,
} from "./types"

// Input schema - expects research output from previous stage
const ScriptInputSchema = z.object({
  research: z.object({
    topic: z.string(),
    facts: z.array(z.string()),
    hooks: z.array(z.string()),
    targetAudience: z.string(),
    estimatedDuration: z.number(),
  }),
  style: z.enum(["educational", "entertaining", "news", "tutorial"]).optional(),
  duration: z.number().optional(),
})

// LLM response schema for script generation
const LLMScriptResponseSchema = z.object({
  hook: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
    visualCue: z.string(),
    duration: z.number(),
  })),
  cta: z.string(),
  speakerNotes: z.array(z.string()),
})

export const scriptStage: StageHandler = {
  name: "SCRIPT",

  validate(input: unknown): ValidationResult {
    const result = ScriptInputSchema.safeParse(input)
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
      // Get research from previous stage output or input
      const research = (context.previousOutput || context.input) as ResearchOutput
      const style = (context.input as any).style || "educational"
      const targetDuration = (context.input as any).duration || research.estimatedDuration || 60

      // Calculate word count (~150 words per minute)
      const targetWords = Math.round((targetDuration / 60) * 150)

      const apiKey = process.env.OPENAI_API_KEY
      let scriptData: z.infer<typeof LLMScriptResponseSchema>
      let modelUsed = "rule-based"

      if (apiKey && !context.dryRun) {
        try {
          const response = await callLLMForScript(research, style, targetDuration, apiKey)
          scriptData = LLMScriptResponseSchema.parse(JSON.parse(response))
          modelUsed = "gpt-4o-mini"
        } catch (llmError) {
          console.warn("Script LLM call failed, using rule-based:", (llmError as Error).message)
          scriptData = generateRuleBasedScript(research, targetDuration)
        }
      } else {
        scriptData = generateRuleBasedScript(research, targetDuration)
      }

      // Create full script
      const fullScript = [
        scriptData.hook,
        ...scriptData.sections.map((s) => s.content),
        scriptData.cta,
      ].join("\n\n")

      const output: ScriptOutput = {
        hook: scriptData.hook,
        body: scriptData.sections,
        cta: scriptData.cta,
        fullScript,
        estimatedDuration: targetDuration,
        speakerNotes: scriptData.speakerNotes,
      }

      return {
        success: true,
        output,
        metadata: {
          style,
          targetWords,
          actualWords: countWords(fullScript),
          model: modelUsed,
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

// Call OpenAI for script generation
async function callLLMForScript(
  research: ResearchOutput,
  style: string,
  duration: number,
  apiKey: string
): Promise<string> {
  const prompt = `Create a video script for a ${duration}-second ${style} short-form video.

Topic: ${research.topic}
Target Audience: ${research.targetAudience}
Key Facts:
${research.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Hook Options:
${research.hooks.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Guidelines:
- Choose or improve the best hook for grabbing attention
- Create ${Math.ceil(duration / 15)} sections (~15 sec each)
- Each section should have a visual cue for b-roll selection
- End with a compelling call to action
- Include 3-4 speaker notes for delivery

Respond with ONLY valid JSON (no markdown) in this exact structure:
{
  "hook": "attention-grabbing opening line",
  "sections": [
    {"heading": "section title", "content": "what to say", "visualCue": "what to show", "duration": 15}
  ],
  "cta": "call to action",
  "speakerNotes": ["delivery tip 1", "delivery tip 2"]
}`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional video scriptwriter for social media. Write engaging, concise scripts. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Rule-based fallback script generation
function generateRuleBasedScript(research: ResearchOutput, duration: number): z.infer<typeof LLMScriptResponseSchema> {
  const sections = generateSections(research.facts, research.topic, duration)
  return {
    hook: research.hooks[0] || `Let's talk about ${research.topic}`,
    sections,
    cta: "Follow for more!",
    speakerNotes: [
      "Start with energy - hook needs to grab attention",
      "Pause briefly between sections",
      "End with clear call to action",
    ],
  }
}

function generateSections(facts: string[], topic: string, duration: number): ScriptSection[] {
  const numSections = Math.min(facts.length, Math.ceil(duration / 15)) // ~15 sec per section
  const sectionDuration = Math.round(duration / numSections)

  return facts.slice(0, numSections).map((fact, i) => ({
    heading: `Point ${i + 1}`,
    content: fact,
    visualCue: generateVisualCue(fact, topic),
    duration: sectionDuration,
  }))
}

function generateVisualCue(fact: string, topic: string): string {
  // Simple visual cue generation - in production, use LLM
  const keywords = fact.toLowerCase()
  
  if (keywords.includes("growth") || keywords.includes("increase")) {
    return "Show upward trending graph animation"
  }
  if (keywords.includes("expert") || keywords.includes("professional")) {
    return "Show professional/expert b-roll"
  }
  if (keywords.includes("data") || keywords.includes("statistic")) {
    return "Display statistic as text overlay"
  }
  
  return `Show relevant b-roll for: ${topic}`
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}
