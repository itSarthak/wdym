import { Router } from 'express'
import { getPublicSurvey, createResponse, updateResponse } from '../controllers/public'
import { initiateGoogleAuth, handleOAuthCallback, initiateWdymAuth } from '../controllers/surveyAuth'

const router = Router()

// OAuth callback must be registered before /:slug to avoid being shadowed
router.get('/oauth/callback', handleOAuthCallback)

router.get('/:slug', getPublicSurvey)
router.get('/:slug/auth/google', initiateGoogleAuth)
router.get('/:slug/auth/wdym', initiateWdymAuth)
router.post('/:slug/response', createResponse)
router.patch('/:slug/response/:id', updateResponse)

export default router
