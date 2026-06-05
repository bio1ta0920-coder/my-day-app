import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

mkdirSync(publicDir, { recursive: true })

// 핑크 그라디언트 배경 + 🌸 텍스트를 SVG로 만들어 PNG로 변환
function makeSvg(size) {
  const radius = Math.round(size * 0.234) // iOS 아이콘 비율
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f9a8d4"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <text x="${size/2}" y="${size*0.62}" font-size="${size*0.5}" text-anchor="middle" dominant-baseline="middle" font-family="serif">🌸</text>
</svg>`
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-152.png', size: 152 },
  { name: 'apple-touch-icon-120.png', size: 120 },
  { name: 'apple-touch-icon-76.png', size: 76 },
]

for (const { name, size } of sizes) {
  await sharp(Buffer.from(makeSvg(size)))
    .png()
    .toFile(join(publicDir, name))
  console.log(`✓ ${name} (${size}x${size})`)
}

console.log('\n아이콘 생성 완료!')
