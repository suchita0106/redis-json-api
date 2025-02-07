import 'dotenv/config'
import app from './api/app.js'
import appConfig from './configs/app.config.js'

const { PORT } = appConfig

app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`)
})
