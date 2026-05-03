import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT ?? 3000

if (process.env.NODE_ENV !== 'development' && !process.env.CORS_ORIGIN) {
  console.error('ERROR: CORS_ORIGIN must be set in production')
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
