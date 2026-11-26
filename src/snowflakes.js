import * as THREE from 'three'
import { CONFIG } from './config.js'
import { terrainHeight } from './terrain.js'

export function createSnowflakes(scene, camera) {
  const cfg = CONFIG.snowflakes
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(cfg.count * 3)
  const speeds = new Float32Array(cfg.count)
  const drift = new Float32Array(cfg.count * 2)

  for (let i = 0; i < cfg.count; i += 1) resetFlake(i, false)

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: cfg.color,
    size: cfg.size,
    map: createCircleTexture(),
    alphaTest: 0.5,
    opacity: cfg.opacity,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  scene.add(points)

  let enabled = cfg.enabled
  points.visible = enabled

  function resetFlake(index, fromTop) {
    const i3 = index * 3
    const minDist = cfg.minCameraDistance
    let x = 0
    let y = 0
    let z = 0
    const centerX = camera.position.x
    const centerZ = camera.position.z
    for (let attempt = 0; attempt < 6; attempt += 1) {
      x = centerX + (Math.random() - 0.5) * cfg.spread
      y = fromTop ? cfg.height : Math.random() * cfg.height
      z = centerZ + (Math.random() - 0.5) * cfg.spread
      const dx = x - camera.position.x
      const dy = y - camera.position.y
      const dz = z - camera.position.z
      if (dx * dx + dy * dy + dz * dz >= minDist * minDist) break
    }
    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z
    speeds[index] = cfg.fallSpeed * (1 - cfg.fallVariance * 0.5 + Math.random() * cfg.fallVariance)
    drift[index * 2] = (Math.random() - 0.5) * cfg.drift
    drift[index * 2 + 1] = (Math.random() - 0.5) * cfg.drift
  }

  return {
    update(dt) {
      if (!enabled) return
      const half = cfg.spread / 2
      for (let i = 0; i < cfg.count; i += 1) {
        const i3 = i * 3
        positions[i3] += drift[i * 2] * dt
        positions[i3 + 2] += drift[i * 2 + 1] * dt
        positions[i3 + 1] -= speeds[i] * dt
        const x = positions[i3]
        const y = positions[i3 + 1]
        const z = positions[i3 + 2]
        const dx = x - camera.position.x
        const dy = y - camera.position.y
        const dz = z - camera.position.z
        const nearCamera = dx * dx + dy * dy + dz * dz < cfg.minCameraDistance * cfg.minCameraDistance
        if (
          nearCamera ||
          y < terrainHeight(x, z) + 0.15 ||
          Math.abs(x - camera.position.x) > half ||
          Math.abs(z - camera.position.z) > half
        ) {
          resetFlake(i, true)
        }
      }
      geometry.attributes.position.needsUpdate = true
    },
    setEnabled(value) {
      enabled = value
      points.visible = value
    },
    isEnabled() {
      return enabled
    },
  }
}

function createCircleTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, size, size)
  context.beginPath()
  context.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  context.fillStyle = '#ffffff'
  context.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}
