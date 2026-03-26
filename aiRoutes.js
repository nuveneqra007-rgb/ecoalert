// routes/aiRoutes.js
const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const { detectTrash, getAIStatus } = require('../controllers/aiController')
const { protect } = require('../middleware/auth')

// Use memory storage so we can read buffer for base64 encoding
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes'), false)
  },
})

// GET /api/ai/status — public
router.get('/status', getAIStatus)

// POST /api/ai/detect-trash — requires auth
router.post(
  '/detect-trash',
  protect,
  upload.single('image'),
  detectTrash
)

module.exports = router
