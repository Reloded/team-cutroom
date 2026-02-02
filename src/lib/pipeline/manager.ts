import prisma from '@/lib/db/client'
import { PipelineStatus, StageStatus, StageName, Pipeline, Stage } from '@prisma/client'
import { STAGE_WEIGHTS } from '@/lib/stages/types'

// Stage execution order
export const STAGE_ORDER: StageName[] = [
  'RESEARCH',
  'SCRIPT', 
  'VOICE',
  'MUSIC',
  'VISUAL',
  'EDITOR',
  'PUBLISH'
]

// Get next stage in order
export function getNextStageName(current: StageName): StageName | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

// Get previous stage in order
export function getPreviousStageName(current: StageName): StageName | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx <= 0) return null
  return STAGE_ORDER[idx - 1]
}

// Get stage index (0-6)
export function getStageIndex(stageName: StageName): number {
  return STAGE_ORDER.indexOf(stageName)
}

// Create a new pipeline with all stages
export async function createPipeline(topic: string, description?: string): Promise<Pipeline & { stages: Stage[] }> {
  return prisma.pipeline.create({
    data: {
      topic,
      description,
      status: 'DRAFT',
      currentStage: 'RESEARCH',
      stages: {
        create: STAGE_ORDER.map(name => ({
          name,
          status: 'PENDING'
        }))
      }
    },
    include: { stages: true }
  })
}

// Start pipeline execution
export async function startPipeline(pipelineId: string): Promise<Pipeline> {
  return prisma.pipeline.update({
    where: { id: pipelineId },
    data: { status: 'RUNNING' }
  })
}

// Claim a stage for an agent
export async function claimStage(
  pipelineId: string, 
  stageName: StageName, 
  agentId: string, 
  agentName: string
): Promise<Stage> {
  // Verify pipeline is running
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId }
  })
  
  if (!pipeline || pipeline.status !== 'RUNNING') {
    throw new Error('Pipeline not in running state')
  }
  
  // Verify this is the current stage or previous is complete
  const stage = await prisma.stage.findUnique({
    where: { pipelineId_name: { pipelineId, name: stageName } }
  })
  
  if (!stage) {
    throw new Error('Stage not found')
  }
  
  if (stage.status !== 'PENDING') {
    throw new Error('Stage not available for claiming')
  }
  
  // Check if previous stage is complete (if not first)
  const stageIdx = STAGE_ORDER.indexOf(stageName)
  if (stageIdx > 0) {
    const prevStageName = STAGE_ORDER[stageIdx - 1]
    const prevStage = await prisma.stage.findUnique({
      where: { pipelineId_name: { pipelineId, name: prevStageName } }
    })
    
    if (!prevStage || (prevStage.status !== 'COMPLETE' && prevStage.status !== 'SKIPPED')) {
      throw new Error('Previous stage not complete')
    }
  }
  
  return prisma.stage.update({
    where: { id: stage.id },
    data: {
      status: 'CLAIMED',
      agentId,
      agentName,
      startedAt: new Date()
    }
  })
}

// Mark stage as running
export async function startStage(stageId: string): Promise<Stage> {
  return prisma.stage.update({
    where: { id: stageId },
    data: { status: 'RUNNING' }
  })
}

// Complete a stage with output
export async function completeStage(
  stageId: string, 
  output: unknown, 
  artifacts: string[] = []
): Promise<{ stage: Stage; pipeline: Pipeline }> {
  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      status: 'COMPLETE',
      output: output as any,
      artifacts,
      completedAt: new Date()
    },
    include: { pipeline: true }
  })
  
  // Record attribution if agent info exists
  if (stage.agentId && stage.agentName) {
    await recordAttribution(
      stage.pipelineId,
      stage.id,
      stage.agentId,
      stage.agentName,
      stage.name
    )
  }
  
  // Check if pipeline is complete
  const nextStageName = getNextStageName(stage.name)
  
  let pipeline: Pipeline
  if (!nextStageName) {
    // This was the last stage
    pipeline = await prisma.pipeline.update({
      where: { id: stage.pipelineId },
      data: { status: 'COMPLETE' }
    })
  } else {
    // Update current stage pointer
    pipeline = await prisma.pipeline.update({
      where: { id: stage.pipelineId },
      data: { currentStage: nextStageName }
    })
  }
  
  return { stage, pipeline }
}

// Fail a stage
export async function failStage(stageId: string, error: string): Promise<{ stage: Stage; pipeline: Pipeline }> {
  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      status: 'FAILED',
      error,
      completedAt: new Date()
    }
  })
  
  const pipeline = await prisma.pipeline.update({
    where: { id: stage.pipelineId },
    data: { status: 'FAILED' }
  })
  
  return { stage, pipeline }
}

// Skip a stage (e.g., MUSIC stage might be optional)
export async function skipStage(stageId: string): Promise<{ stage: Stage; pipeline: Pipeline }> {
  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      status: 'SKIPPED',
      completedAt: new Date()
    }
  })
  
  const nextStageName = getNextStageName(stage.name)
  
  let pipeline: Pipeline
  if (!nextStageName) {
    pipeline = await prisma.pipeline.update({
      where: { id: stage.pipelineId },
      data: { status: 'COMPLETE' }
    })
  } else {
    pipeline = await prisma.pipeline.update({
      where: { id: stage.pipelineId },
      data: { currentStage: nextStageName }
    })
  }
  
  return { stage, pipeline }
}

// Get pipeline with all stages
export async function getPipeline(pipelineId: string) {
  return prisma.pipeline.findUnique({
    where: { id: pipelineId },
    include: { 
      stages: { 
        orderBy: { createdAt: 'asc' } 
      },
      attributions: true
    }
  })
}

// List pipelines
export async function listPipelines(limit = 20, status?: PipelineStatus) {
  return prisma.pipeline.findMany({
    where: status ? { status } : undefined,
    include: { stages: true },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

// Get available stages (for agents looking for work)
export async function getAvailableStages(stageName?: StageName) {
  // Find stages that are PENDING and whose previous stage is COMPLETE
  const runningPipelines = await prisma.pipeline.findMany({
    where: { status: 'RUNNING' },
    include: { stages: { orderBy: { createdAt: 'asc' } } }
  })
  
  const available: (Stage & { pipeline: Pipeline })[] = []
  
  for (const pipeline of runningPipelines) {
    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i]
      
      if (stage.status !== 'PENDING') continue
      
      // Filter by stage name if provided
      if (stageName && stage.name !== stageName) continue
      
      // Check if previous stage is complete (or this is first stage)
      if (i === 0 || ['COMPLETE', 'SKIPPED'].includes(pipeline.stages[i - 1].status)) {
        available.push({ ...stage, pipeline })
      }
    }
  }
  
  return available
}

// Get previous stage output for context
export async function getPreviousStageOutput(pipelineId: string, currentStageName: StageName): Promise<unknown | null> {
  const prevStageName = getPreviousStageName(currentStageName)
  if (!prevStageName) return null
  
  const prevStage = await prisma.stage.findUnique({
    where: { pipelineId_name: { pipelineId, name: prevStageName } }
  })
  
  return prevStage?.output || null
}

// Record attribution for token payouts
export async function recordAttribution(
  pipelineId: string,
  stageId: string,
  agentId: string,
  agentName: string,
  stageName: StageName
) {
  const percentage = STAGE_WEIGHTS[stageName]
  
  return prisma.attribution.create({
    data: {
      pipelineId,
      stageId,
      agentId,
      agentName,
      percentage,
    },
  })
}

// Get attributions for a pipeline
export async function getPipelineAttributions(pipelineId: string) {
  return prisma.attribution.findMany({
    where: { pipelineId },
    orderBy: { percentage: 'desc' },
  })
}

// Get all attributions for an agent
export async function getAgentAttributions(agentId: string) {
  return prisma.attribution.findMany({
    where: { agentId },
    include: { pipeline: true },
  })
}

// Calculate token payouts from attributions
export function calculatePayouts(
  attributions: { agentId: string; percentage: number }[],
  totalAmount: number
): Map<string, number> {
  const payouts = new Map<string, number>()
  
  for (const attr of attributions) {
    const current = payouts.get(attr.agentId) || 0
    const amount = (attr.percentage / 100) * totalAmount
    payouts.set(attr.agentId, current + amount)
  }
  
  return payouts
}
