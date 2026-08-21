import { describe, expect, it } from 'vitest'

import router from '@/router'
import api from '@/services/api'

describe('legacy reminder retirement', () => {
    it('does not expose the legacy reminder page', () => {
        expect(router.getRoutes().some(route => route.path === '/reminders')).toBe(false)
    })

    it('does not expose legacy reminder API operations', () => {
        expect(Object.keys(api).filter(name => name.toLowerCase().includes('reminder'))).toEqual([])
    })
})
