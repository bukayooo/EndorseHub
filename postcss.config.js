import { fileURLToPath } from 'url'
import { dirname } from 'path'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  plugins: {
    tailwindcss: {
      config: path.resolve(__dirname, 'client/tailwind.config.ts'),
    },
    autoprefixer: {
      flexbox: true,
      grid: true,
      overrideBrowserslist: ['last 2 versions', '> 5%'],
    },
  },
}
