import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getSurveys,
  createSurvey,
  getSurvey,
  updateSurvey,
  deleteSurvey,
  publishSurvey,
  unpublishSurvey,
  getSurveyAnalytics,
} from '../controllers/surveys'
import { generateSurvey } from '../controllers/generate'

const router = Router()

router.use(authenticate)
router.get('/', getSurveys)
router.post('/', createSurvey)
router.get('/:id', getSurvey)
router.patch('/:id', updateSurvey)
router.delete('/:id', deleteSurvey)
router.post('/:id/publish', publishSurvey)
router.post('/:id/unpublish', unpublishSurvey)
router.get('/:id/analytics', getSurveyAnalytics)
router.post('/:id/generate', generateSurvey)

export default router
