import { NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

/**
 * System statistics endpoint
 * 
 * GET /api/stats
 * 
 * Returns aggregate statistics about pipelines, stages, and agents.
 */
export async function GET() {
  try {
    // Pipeline stats
    const pipelineStats = await prisma.pipeline.groupBy({
      by: ['status'],
      _count: true,
    })

    const pipelineCounts: Record<string, number> = {}
    let totalPipelines = 0
    for (const stat of pipelineStats) {
      pipelineCounts[stat.status] = stat._count
      totalPipelines += stat._count
    }

    // Stage completion stats
    const stageStats = await prisma.stage.groupBy({
      by: ['name', 'status'],
      _count: true,
    })

    const stageCounts: Record<string, Record<string, number>> = {}
    for (const stat of stageStats) {
      if (!stageCounts[stat.name]) {
        stageCounts[stat.name] = {}
      }
      stageCounts[stat.name][stat.status] = stat._count
    }

    // Top contributing agents
    const topAgents = await prisma.attribution.groupBy({
      by: ['agentId', 'agentName'],
      _sum: { percentage: true },
      _count: true,
      orderBy: { _count: { percentage: 'desc' } },
      take: 10,
    })

    // Recent activity
    const recentPipelines = await prisma.pipeline.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        topic: true,
        status: true,
        createdAt: true,
      },
    })

    const recentCompletions = await prisma.stage.findMany({
      where: { status: 'COMPLETE' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        name: true,
        agentName: true,
        completedAt: true,
        pipeline: {
          select: { topic: true },
        },
      },
    })

    return NextResponse.json({
      pipelines: {
        total: totalPipelines,
        byStatus: pipelineCounts,
      },
      stages: {
        byStageAndStatus: stageCounts,
      },
      agents: {
        top: topAgents.map(a => ({
          agentId: a.agentId,
          agentName: a.agentName,
          totalContribution: a._sum.percentage,
          stagesCompleted: a._count,
        })),
      },
      recent: {
        pipelines: recentPipelines,
        completions: recentCompletions.map(s => ({
          stage: s.name,
          agent: s.agentName,
          topic: s.pipeline.topic,
          completedAt: s.completedAt,
        })),
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
