#!/usr/bin/env npx ts-node

/**
 * Example: Create and Run Pipeline
 * 
 * Creates a new pipeline and starts it.
 * 
 * Usage:
 *   npx ts-node examples/create-pipeline.ts "Your topic here"
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api'

async function main() {
  const topic = process.argv[2] || 'What is a bonding curve?'
  
  console.log('🎬 Creating Cutroom Pipeline')
  console.log(`   Topic: ${topic}`)
  console.log(`   API: ${API_URL}`)
  console.log('')

  // Create pipeline
  console.log('📦 Creating pipeline...')
  const createRes = await fetch(`${API_URL}/pipelines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      description: `A short video about: ${topic}`,
    }),
  })
  
  if (!createRes.ok) {
    console.error('Failed to create:', await createRes.text())
    return
  }
  
  const pipeline = await createRes.json()
  console.log(`   Created pipeline: ${pipeline.id}`)
  console.log(`   Status: ${pipeline.status}`)
  console.log('')

  // Start pipeline
  console.log('🚀 Starting pipeline...')
  const startRes = await fetch(`${API_URL}/pipelines/${pipeline.id}/start`, {
    method: 'POST',
  })
  
  if (!startRes.ok) {
    console.error('Failed to start:', await startRes.text())
    return
  }
  
  const started = await startRes.json()
  console.log(`   Status: ${started.status}`)
  console.log('')

  console.log('📋 Pipeline is now running!')
  console.log(`   View at: ${API_URL.replace('/api', '')}/pipelines/${pipeline.id}`)
  console.log('')
  console.log('🤖 Agents can now claim stages:')
  console.log(`   curl -X POST ${API_URL}/queue/claim \\`)
  console.log(`     -H "Content-Type: application/json" \\`)
  console.log(`     -d '{"agentId": "my-agent", "agentName": "MyBot", "capabilities": ["RESEARCH"], "autoExecute": true}'`)
}

main().catch(console.error)
