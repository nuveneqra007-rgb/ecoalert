// controllers/aiController.js
// OpenAI Vision for trash detection with realistic fallback
const path   = require('path')
const fs     = require('fs')
const logger = require('../utils/logger')
const { AppError, catchAsync } = require('../utils/AppError')

// ── AI TYPES ────────────────────────────────────────────────
const TRASH_TYPES = ['plastico', 'organico', 'electronico', 'escombros', 'papel', 'mixto']

const TYPE_DESCRIPTIONS = {
  plastico:    'Residuos plásticos: botellas, bolsas, envases',
  organico:    'Residuos orgánicos: alimentos, plantas, restos naturales',
  electronico: 'Residuos electrónicos: aparatos, cables, baterías',
  escombros:   'Escombros y materiales de construcción',
  papel:       'Papel, cartón, revistas, periódicos',
  mixto:       'Mezcla de distintos tipos de residuos',
}

// ── OPENAI ANALYSIS ──────────────────────────────────────────
const analyzeWithOpenAI = async (imageData, mimeType) => {
  if (!process.env.OPENAI_API_KEY) return null

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `Eres un sistema de detección de basura. Analiza imágenes y responde SOLO con JSON.
El formato de respuesta debe ser exactamente:
{
  "basura": true/false,
  "tipo": "plastico|organico|electronico|escombros|papel|mixto",
  "confianza": 0.0-1.0,
  "descripcion": "descripción breve en español"
}
Si no hay basura, "basura" debe ser false, "tipo" null, "confianza" 0.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url:    `data:${mimeType};base64,${imageData}`,
                  detail: 'low',
                },
              },
              {
                type: 'text',
                text: '¿Hay basura en esta imagen? Clasifica el tipo y nivel de confianza.',
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || `OpenAI error ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response (strip markdown if present)
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
    const result  = JSON.parse(jsonStr)

    logger.info('OpenAI Vision resultado', {
      basura:    result.basura,
      tipo:      result.tipo,
      confianza: result.confianza,
    })

    return {
      basura:      !!result.basura,
      tipo:        result.tipo || null,
      confianza:   parseFloat(result.confianza) || 0,
      descripcion: result.descripcion || null,
      provider:    'openai-vision',
    }

  } catch (err) {
    logger.warn('OpenAI Vision falló', { error: err.message })
    return null
  }
}

// ── SIMULADO (fallback) ──────────────────────────────────────
const analyzeSimulated = () => {
  // Distribución realista: 80% detección positiva
  const detected = Math.random() > 0.2

  if (!detected) {
    return {
      basura:      false,
      tipo:        null,
      confianza:   parseFloat((Math.random() * 0.25).toFixed(3)),
      descripcion: 'No se detectaron residuos en la imagen.',
      provider:    'simulated',
    }
  }

  const weights   = [30, 25, 20, 12, 8, 5]
  const total     = weights.reduce((a, b) => a + b, 0)
  let rand        = Math.random() * total
  let selectedType = 'mixto'
  for (let i = 0; i < TRASH_TYPES.length; i++) {
    rand -= weights[i]
    if (rand <= 0) { selectedType = TRASH_TYPES[i]; break }
  }

  // Gaussian-like confidence between 0.65 - 0.97
  const avg        = (Math.random() + Math.random() + Math.random()) / 3
  const confidence = parseFloat((0.65 + avg * 0.32).toFixed(3))

  return {
    basura:      true,
    tipo:        selectedType,
    confianza:   confidence,
    descripcion: TYPE_DESCRIPTIONS[selectedType],
    provider:    'simulated',
  }
}

// ── MAIN CONTROLLER ─────────────────────────────────────────
/**
 * POST /api/ai/detect-trash
 * Body: multipart/form-data with 'image' field
 *
 * Response:
 * {
 *   basura: true/false,
 *   tipo: "plastico|organico|...",
 *   confianza: 0.0-1.0,
 *   descripcion: "...",
 *   provider: "openai-vision|simulated"
 * }
 */
const detectTrash = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Se requiere una imagen.', 400))
  }

  let result = null
  const startTime = Date.now()

  // 1. Try OpenAI Vision
  if (process.env.OPENAI_API_KEY) {
    try {
      let imageData
      let mimeType = req.file.mimetype || 'image/jpeg'

      // Read file as base64 — works for both local and Cloudinary paths
      if (req.file.path && !req.file.path.startsWith('http')) {
        // Local file
        const filePath = path.isAbsolute(req.file.path)
          ? req.file.path
          : path.join(__dirname, '..', req.file.path)

        if (fs.existsSync(filePath)) {
          imageData = fs.readFileSync(filePath).toString('base64')
        }
      } else if (req.file.buffer) {
        // In-memory buffer (memoryStorage)
        imageData = req.file.buffer.toString('base64')
      }

      if (imageData) {
        result = await analyzeWithOpenAI(imageData, mimeType)
      }
    } catch (err) {
      logger.warn('Error leyendo imagen para IA', { error: err.message })
    }
  }

  // 2. Fallback to simulated
  if (!result) {
    result = analyzeSimulated()
    if (process.env.OPENAI_API_KEY && !result.provider?.includes('openai')) {
      logger.warn('OpenAI no disponible — usando IA simulada')
    }
  }

  const processingMs = Date.now() - startTime

  logger.info('AI detection completada', {
    basura:    result.basura,
    tipo:      result.tipo,
    confianza: result.confianza,
    provider:  result.provider,
    ms:        processingMs,
  })

  res.json({
    success:       true,
    basura:        result.basura,
    tipo:          result.tipo,
    confianza:     result.confianza,
    descripcion:   result.descripcion,
    provider:      result.provider,
    processingMs,
  })
})

/**
 * GET /api/ai/status
 */
const getAIStatus = (req, res) => {
  const openaiConfigured = !!process.env.OPENAI_API_KEY

  res.json({
    success:            true,
    status:             'operational',
    model:              'EcoAlert-AI-v2',
    mode:               openaiConfigured ? 'OpenAI GPT-4o Vision' : 'Demo simulado',
    openai_configured:  openaiConfigured,
    openai_vision:      openaiConfigured ? '✅ Configurado' : '⚠️ No configurado — usando simulado',
    google_vision:      '⚠️ No configurado',
    clarifai:           '⚠️ No configurado',
    supported_types:    TRASH_TYPES,
    confidence_range:   '0.65 – 0.97',
    fallback:           'simulated',
    last_check:         new Date().toISOString(),
  })
}

module.exports = { detectTrash, getAIStatus }
