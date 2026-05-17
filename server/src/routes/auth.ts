import { Router } from 'express'
import { register, login, refresh, verifyOtp, resendOtp, changePassword, forgotPassword, verifyForgotOtp, resetPassword, googleAuth } from '../controllers/auth'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/refresh', refresh)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/change-password', authenticate, changePassword)
router.post('/forgot-password', forgotPassword)
router.post('/verify-forgot-otp', verifyForgotOtp)
router.post('/reset-password', resetPassword)

export default router
