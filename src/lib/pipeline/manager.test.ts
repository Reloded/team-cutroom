import { describe, it, expect } from 'vitest'
import { 
  STAGE_ORDER, 
  getNextStageName, 
  getPreviousStageName,
  getStageIndex,
  calculatePayouts
} from './manager'

describe('Pipeline Manager', () => {
  describe('STAGE_ORDER', () => {
    it('should have 7 stages in correct order', () => {
      expect(STAGE_ORDER).toHaveLength(7)
      expect(STAGE_ORDER[0]).toBe('RESEARCH')
      expect(STAGE_ORDER[6]).toBe('PUBLISH')
    })

    it('should have all required stages', () => {
      const required = ['RESEARCH', 'SCRIPT', 'VOICE', 'MUSIC', 'VISUAL', 'EDITOR', 'PUBLISH']
      required.forEach(stage => {
        expect(STAGE_ORDER).toContain(stage)
      })
    })
  })

  describe('getNextStageName', () => {
    it('should return next stage for RESEARCH', () => {
      expect(getNextStageName('RESEARCH')).toBe('SCRIPT')
    })

    it('should return next stage for SCRIPT', () => {
      expect(getNextStageName('SCRIPT')).toBe('VOICE')
    })

    it('should return null for PUBLISH (last stage)', () => {
      expect(getNextStageName('PUBLISH')).toBeNull()
    })

    it('should return null for invalid stage', () => {
      expect(getNextStageName('INVALID' as any)).toBeNull()
    })
  })

  describe('getPreviousStageName', () => {
    it('should return null for RESEARCH (first stage)', () => {
      expect(getPreviousStageName('RESEARCH')).toBeNull()
    })

    it('should return RESEARCH for SCRIPT', () => {
      expect(getPreviousStageName('SCRIPT')).toBe('RESEARCH')
    })

    it('should return EDITOR for PUBLISH', () => {
      expect(getPreviousStageName('PUBLISH')).toBe('EDITOR')
    })
  })

  describe('getStageIndex', () => {
    it('should return 0 for RESEARCH', () => {
      expect(getStageIndex('RESEARCH')).toBe(0)
    })

    it('should return 6 for PUBLISH', () => {
      expect(getStageIndex('PUBLISH')).toBe(6)
    })

    it('should return -1 for invalid stage', () => {
      expect(getStageIndex('INVALID' as any)).toBe(-1)
    })
  })

  describe('calculatePayouts', () => {
    it('should calculate correct payouts for single agent', () => {
      const attributions = [
        { agentId: 'agent-1', percentage: 100 }
      ]
      const payouts = calculatePayouts(attributions, 1000)
      expect(payouts.get('agent-1')).toBe(1000)
    })

    it('should calculate correct payouts for multiple agents', () => {
      const attributions = [
        { agentId: 'agent-1', percentage: 60 },
        { agentId: 'agent-2', percentage: 40 }
      ]
      const payouts = calculatePayouts(attributions, 1000)
      expect(payouts.get('agent-1')).toBe(600)
      expect(payouts.get('agent-2')).toBe(400)
    })

    it('should aggregate multiple contributions from same agent', () => {
      const attributions = [
        { agentId: 'agent-1', percentage: 25 },
        { agentId: 'agent-1', percentage: 25 },
        { agentId: 'agent-2', percentage: 50 }
      ]
      const payouts = calculatePayouts(attributions, 1000)
      expect(payouts.get('agent-1')).toBe(500)
      expect(payouts.get('agent-2')).toBe(500)
    })

    it('should return empty map for empty attributions', () => {
      const payouts = calculatePayouts([], 1000)
      expect(payouts.size).toBe(0)
    })
  })
})
