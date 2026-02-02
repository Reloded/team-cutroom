import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/client"
import { 
  startStage, 
  completeStage, 
  failStage,
  getPreviousStageOutput 
} from "@/lib/pipeline/manager"
import { getStageHandler, StageContext } from "@/lib/stages"

/**
 * Execute a stage
 * 
 * POST /api/stages/[id]/execute
 * 
 * This endpoint:
 * 1. Validates the stage is claimed by the caller
 * 2. Runs the stage handler
 * 3. Saves the output
 * 4. Advances the pipeline
 * 
 * Body:
 * {
 *   agentId: string,       // Must match the claiming agent
 *   input?: object,        // Optional additional input
 *   config?: object,       // Optional stage config
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stageId } = await params
    const body = await request.json()
    const { agentId, input = {}, config } = body

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      )
    }

    // Get stage
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    })

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 }
      )
    }

    // Verify agent owns this stage
    if (stage.agentId !== agentId) {
      return NextResponse.json(
        { error: "Stage not claimed by this agent" },
        { status: 403 }
      )
    }

    // Verify stage is in claimable state
    if (stage.status !== "CLAIMED") {
      return NextResponse.json(
        { error: `Stage is ${stage.status}, not CLAIMED` },
        { status: 400 }
      )
    }

    // Get stage handler
    const handler = getStageHandler(stage.name)

    // Mark as running
    await startStage(stageId)

    // Build context
    const previousOutput = await getPreviousStageOutput(stage.pipelineId, stage.name)
    
    const context: StageContext = {
      pipelineId: stage.pipelineId,
      stageId: stage.id,
      input: {
        topic: stage.pipeline.topic,
        description: stage.pipeline.description,
        ...input,
      },
      previousOutput,
      config,
    }

    // Validate input
    const validation = handler.validate(context.input)
    if (!validation.valid) {
      await failStage(stageId, `Validation failed: ${validation.errors?.join(", ")}`)
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      )
    }

    // Execute
    const result = await handler.execute(context)

    if (!result.success) {
      const { stage: failedStage, pipeline } = await failStage(stageId, result.error || "Unknown error")
      return NextResponse.json(
        { 
          error: result.error,
          stage: failedStage,
          pipeline,
        },
        { status: 500 }
      )
    }

    // Complete
    const artifacts = result.artifacts?.map(a => a.url) || []
    const { stage: completedStage, pipeline } = await completeStage(stageId, result.output, artifacts)

    return NextResponse.json({
      success: true,
      stage: completedStage,
      pipeline,
      output: result.output,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error("Stage execution error:", error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
