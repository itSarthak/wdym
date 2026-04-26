import { Router } from 'express'
import { getPublicSurvey, createResponse, updateResponse } from '../controllers/public'

const router = Router()

router.get('/:slug', getPublicSurvey)
router.post('/:slug/response', createResponse)
router.patch('/:slug/response/:id', updateResponse)

export default router
