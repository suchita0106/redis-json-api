import express from 'express'
import { errorHandler } from './handlers/errorHandler.js'
import { planRoute } from './routes/index.routes.js'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set('etag', 'strong')
app.use('/', planRoute)
app.use(errorHandler)

export default app
