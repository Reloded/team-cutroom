import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/db/client', () => ({
  default: {
    stage: {
      findMany: vi.fn(),
    },
    attribution: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db/client'

const mockStages = [
  {
    id: 'stage-1',
    name: 'RESEARCH',
    agentId: 'agent-123',
    status: 'COMPLETE',
    completedAt: new Date('2026-02-01'),
    pipeline: { id: 'pipe-1', topic: 'AI Trends', status: 'COMPLETE' },
  },
  {
    id: 'stage-2',
    name: 'SCRIPT',
    agentId: 'agent-123',
    status: 'COMPLETE',
    completedAt: new Date('2026-02-01'),
    pipeline: { id: 'pipe-1', topic: 'AI Trends', status: 'COMPLETE' },
  },
]

const mockAttributions = [
  {
    id: 'attr-1',
    agentId: 'agent-123',
    agentName: 'TestAgent',
    pipelineId: 'pipe-1',
    stageName: 'RESEARCH',
    percentage: 10,
    claimed: false,
    createdAt: new Date('2026-02-01'),
    pipeline: { id: 'pipe-1', topic: 'AI Trends', status: 'COMPLETE' },
  },
  {
    id: 'attr-2',
    agentId: 'agent-123',
    agentName: 'TestAgent',
    pipelineId: 'pipe-1',
    stageName: 'SCRIPT',
    percentage: 25,
    claimed: false,
    createdAt: new Date('2026-02-01'),
    pipeline: { id: 'pipe-1', topic: 'AI Trends', status: 'COMPLETE' },
  },
]

function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

describe('GET /api/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns agent details with stats', async () => {
    vi.mocked(prisma.stage.findMany).mockResolvedValue(mockStages as any)
    vi.mocked(prisma.attribution.findMany).mockResolvedValue(mockAttributions as any)

    const request = createMockRequest('http://localhost/api/agents/agent-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'agent-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.agent.id).toBe('agent-123')
    expect(data.agent.name).toBe('TestAgent')
    expect(data.stats.totalStagesCompleted).toBe(2)
    expect(data.stats.totalContribution).toBe(35)
  })

  it('returns correct stage breakdown', async () => {
    vi.mocked(prisma.stage.findMany).mockResolvedValue(mockStages as any)
    vi.mocked(prisma.attribution.findMany).mockResolvedValue(mockAttributions as any)

    const request = createMockRequest('http://localhost/api/agents/agent-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'agent-123' }) })
    const data = await response.json()

    expect(data.stats.stageBreakdown).toEqual({
      RESEARCH: 1,
      SCRIPT: 1,
    })
  })

  it('calculates pending rewards correctly', async () => {
    vi.mocked(prisma.stage.findMany).mockResolvedValue(mockStages as any)
    vi.mocked(prisma.attribution.findMany).mockResolvedValue(mockAttributions as any)

    const request = createMockRequest('http://localhost/api/agents/agent-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'agent-123' }) })
    const data = await response.json()

    // Both attributions are unclaimed from completed pipelines
    expect(data.stats.pendingRewards).toBe(35)
  })

  it('returns empty stats for unknown agent', async () => {
    vi.mocked(prisma.stage.findMany).mockResolvedValue([])
    vi.mocked(prisma.attribution.findMany).mockResolvedValue([])

    const request = createMockRequest('http://localhost/api/agents/unknown-agent')
    const response = await GET(request, { params: Promise.resolve({ id: 'unknown-agent' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.totalStagesCompleted).toBe(0)
    expect(data.stats.totalContribution).toBe(0)
  })

  it('includes recent work history', async () => {
    vi.mocked(prisma.stage.findMany).mockResolvedValue(mockStages as any)
    vi.mocked(prisma.attribution.findMany).mockResolvedValue(mockAttributions as any)

    const request = createMockRequest('http://localhost/api/agents/agent-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'agent-123' }) })
    const data = await response.json()

    expect(data.recentWork).toHaveLength(2)
    expect(data.recentWork[0].stageName).toBe('RESEARCH')
    expect(data.recentWork[0].pipelineTopic).toBe('AI Trends')
  })

  it('includes attribution history', async () => {
    vi.mocked(prisma.stage.findMany).mockResolvedValue(mockStages as any)
    vi.mocked(prisma.attribution.findMany).mockResolvedValue(mockAttributions as any)

    const request = createMockRequest('http://localhost/api/agents/agent-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'agent-123' }) })
    const data = await response.json()

    expect(data.attributions).toHaveLength(2)
    expect(data.attributions[0].percentage).toBe(10)
    expect(data.attributions[0].claimed).toBe(false)
  })
})
