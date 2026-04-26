import { Router } from 'express'
import { register, login, refresh, verifyOtp, resendOtp } from '../controllers/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)

export default router
