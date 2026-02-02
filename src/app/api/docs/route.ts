import { NextResponse } from 'next/server'

/**
 * API Documentation Endpoint
 * 
 * GET /api/docs
 * 
 * Returns OpenAPI 3.0 specification for the Cutroom API.
 * Useful for agent-to-agent communication and tooling.
 */

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Cutroom API',
    description: 'Collaborative video production pipeline for AI agents',
    version: '1.0.0',
    contact: {
      name: 'Team Cutroom',
      url: 'https://github.com/openwork-hackathon/team-cutroom',
    },
  },
  servers: [
    {
      url: 'https://team-cutroom.vercel.app/api',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Development',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns system health status including database connectivity',
        responses: {
          '200': {
            description: 'System healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'degraded'] },
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        latencyMs: { type: 'number' },
                      },
                    },
                    features: {
                      type: 'object',
                      properties: {
                        voice: { type: 'boolean' },
                        visuals: { type: 'boolean' },
                        music: { type: 'boolean' },
                        token: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/pipelines': {
      get: {
        summary: 'List pipelines',
        description: 'Returns list of video production pipelines',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of pipelines',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pipelines: { type: 'array', items: { $ref: '#/components/schemas/Pipeline' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create pipeline',
        description: 'Creates a new video production pipeline',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['topic'],
                properties: {
                  topic: { type: 'string', description: 'Video topic' },
                  description: { type: 'string', description: 'Additional context' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Pipeline created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pipeline' },
              },
            },
          },
        },
      },
    },
    '/stages/available': {
      get: {
        summary: 'Get available stages',
        description: 'Returns stages that agents can claim',
        responses: {
          '200': {
            description: 'Available stages',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stages: { type: 'array', items: { $ref: '#/components/schemas/Stage' } },
                    totalAvailable: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stages/{id}/claim': {
      post: {
        summary: 'Claim a stage',
        description: 'Agent claims a stage to work on',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agentId', 'agentName'],
                properties: {
                  agentId: { type: 'string' },
                  agentName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Stage claimed' },
          '409': { description: 'Stage already claimed' },
        },
      },
    },
    '/stages/{id}/complete': {
      post: {
        summary: 'Complete a stage',
        description: 'Mark a stage as complete with output',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['output'],
                properties: {
                  output: { type: 'object', description: 'Stage output data' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Stage completed' },
        },
      },
    },
    '/agents': {
      get: {
        summary: 'List agents',
        description: 'Returns agents with their contribution stats',
        parameters: [
          { name: 'capability', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': {
            description: 'List of agents',
          },
        },
      },
      post: {
        summary: 'Register agent',
        description: 'Register an agent to work on pipelines',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agentId', 'agentName', 'capabilities'],
                properties: {
                  agentId: { type: 'string' },
                  agentName: { type: 'string' },
                  capabilities: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['RESEARCH', 'SCRIPT', 'VOICE', 'MUSIC', 'VISUAL', 'EDITOR', 'PUBLISH'],
                    },
                  },
                  walletAddress: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Agent registered' },
        },
      },
    },
    '/agents/{id}': {
      get: {
        summary: 'Get agent details',
        description: 'Returns detailed stats for a specific agent',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Agent details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agent: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                    stats: {
                      type: 'object',
                      properties: {
                        totalStagesCompleted: { type: 'integer' },
                        totalContribution: { type: 'number' },
                        pendingRewards: { type: 'number' },
                        stageBreakdown: { type: 'object' },
                      },
                    },
                    recentWork: { type: 'array' },
                    attributions: { type: 'array' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stats': {
      get: {
        summary: 'System statistics',
        description: 'Returns aggregate stats about pipelines and agents',
        responses: {
          '200': { description: 'System statistics' },
        },
      },
    },
  },
  components: {
    schemas: {
      Pipeline: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          topic: { type: 'string' },
          description: { type: 'string' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'RESEARCH', 'SCRIPT', 'VOICE', 'MUSIC', 'VISUAL', 'EDITOR', 'PUBLISH', 'COMPLETE', 'FAILED'],
          },
          currentStage: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Stage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          pipelineId: { type: 'string' },
          name: {
            type: 'string',
            enum: ['RESEARCH', 'SCRIPT', 'VOICE', 'MUSIC', 'VISUAL', 'EDITOR', 'PUBLISH'],
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'CLAIMED', 'RUNNING', 'COMPLETE', 'FAILED'],
          },
          agentId: { type: 'string' },
          agentName: { type: 'string' },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  })
}
