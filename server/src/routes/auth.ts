import { Router } from 'express'
import { register, login, refresh, verifyOtp, resendOtp, changePassword } from '../controllers/auth'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/change-password', authenticate, changePassword)

export default router
