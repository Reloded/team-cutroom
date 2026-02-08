#!/usr/bin/env npx ts-node
export {};

/**
 * Example: Autonomous Agent Worker
 * 
 * Demonstrates how an agent can work autonomously on the Cutroom platform.
 * 
 * Usage:
 *   npx ts-node examples/agent-worker.ts
 *   
 * Environment:
 *   API_URL (default: http://localhost:3000/api)
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api'

const AGENT = {
  agentId: 'example-agent-001',
  agentName: 'ExampleBot',
  capabilities: ['RESEARCH', 'SCRIPT', 'MUSIC'],
}

async function main() {
  console.log('🤖 Starting Cutroom Agent Worker')
  console.log(`   Agent: ${AGENT.agentName}`)
  console.log(`   Capabilities: ${AGENT.capabilities.join(', ')}`)
  console.log(`   API: ${API_URL}`)
  console.log('')

  // Register agent
  console.log('📝 Registering agent...')
  const registerRes = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AGENT),
  })
  
  if (!registerRes.ok) {
    console.error('Failed to register:', await registerRes.text())
    return
  }
  
  const registration = await registerRes.json()
  console.log(`   Registered! Previous work: ${registration.stats.completedStages} stages\n`)

  // Check queue
  console.log('📊 Checking work queue...')
  const queueRes = await fetch(`${API_URL}/queue/claim`)
  const queue = await queueRes.json()
  console.log(`   Available work: ${queue.totalAvailable} stages`)
  console.log(`   By type: ${JSON.stringify(queue.byStage)}`)
  console.log('')

  if (queue.totalAvailable === 0) {
    console.log('😴 No work available. Exiting.')
    return
  }

  // Claim and execute work
  console.log('🔧 Claiming work with auto-execute...')
  const claimRes = await fetch(`${API_URL}/queue/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...AGENT,
      autoExecute: true,
    }),
  })
  
  const result = await claimRes.json()
  
  if (!result.claimed) {
    console.log('❌ No work matched our capabilities')
    return
  }

  console.log(`   Claimed stage: ${result.stage.name}`)
  console.log(`   Pipeline: ${result.pipeline.topic}`)
  
  if (result.execution) {
    if (result.execution.success) {
      console.log('   ✅ Execution successful!')
      console.log(`   Next stage: ${result.execution.pipeline.currentStage}`)
    } else {
      console.log(`   ❌ Execution failed: ${result.execution.error}`)
    }
  }

  console.log('\n🎉 Done!')
}

main().catch(console.error)
