import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getMfaStatus, setupMfa, verifyMfaSetup, disableMfa, verifyMfaLogin } from '../controllers/mfa'

const router = Router()

// Public — second step of login
router.post('/verify', verifyMfaLogin)

// Authenticated — manage MFA
router.get('/status', authenticate, getMfaStatus)
router.post('/setup', authenticate, setupMfa)
router.post('/verify-setup', authenticate, verifyMfaSetup)
router.post('/disable', authenticate, disableMfa)

export default router
