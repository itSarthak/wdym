import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getInvite, acceptInvite } from '../controllers/invites'

const router = Router()

router.get('/:token', getInvite)
router.post('/:token/accept', authenticate, acceptInvite)

export default router
