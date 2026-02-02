// Stage exports
export { researchStage } from "./research"
export { scriptStage } from "./script"
export { voiceStage } from "./voice"
export { visualStage } from "./visual"
export { editorStage } from "./editor"

// Type exports
export * from "./types"

// Stage registry
import { StageHandler } from "./types"
import { researchStage } from "./research"
import { scriptStage } from "./script"
import { voiceStage } from "./voice"
import { visualStage } from "./visual"
import { editorStage } from "./editor"
import { StageName } from "@prisma/client"

export const STAGE_HANDLERS: Partial<Record<StageName, StageHandler>> = {
  RESEARCH: researchStage,
  SCRIPT: scriptStage,
  VOICE: voiceStage,
  // MUSIC: musicStage, // TODO: implement
  VISUAL: visualStage,
  EDITOR: editorStage,
  // PUBLISH: publishStage, // TODO: implement
}

export function getStageHandler(stageName: StageName): StageHandler | undefined {
  return STAGE_HANDLERS[stageName]
}
