import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  deleteWorkspace,
  inviteToWorkspace,
  removeMember,
} from '../controllers/workspaces'

const router = Router()

router.use(authenticate)
router.get('/', listWorkspaces)
router.post('/', createWorkspace)
router.get('/:id', getWorkspace)
router.delete('/:id', deleteWorkspace)
router.post('/:id/invite', inviteToWorkspace)
router.delete('/:id/members/:userId', removeMember)

export default router
