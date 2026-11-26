import { Body, Heightfield, Vec3 } from 'cannon-es'
import * as THREE from 'three'
import { CONFIG } from './config.js'

export function terrainHeight(x, z) {
  let height = 0
  const hills = CONFIG.terrain.hills
  for (let i = 0; i < hills.length; i += 1) {
    const hill = hills[i]
    const dx = x - hill.x
    const dz = z - hill.z
    const radiusSq = hill.radius * hill.radius
    height += hill.height * Math.exp(-(dx * dx + dz * dz) / (2 * radiusSq))
  }
  return height
}

export function createTerrain(scene, physics) {
  const size = CONFIG.world.size
  const half = size / 2
  const segments = CONFIG.terrain.visualSegments
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const low = new THREE.Color(CONFIG.terrain.colorLow)
  const high = new THREE.Color(CONFIG.terrain.colorHigh)
  const tint = new THREE.Color()
  let peak = 0.001
  for (const hill of CONFIG.terrain.hills) peak = Math.max(peak, hill.height)

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const y = terrainHeight(x, z)
    positions.setY(i, y)
    tint.copy(low).lerp(high, Math.min(1, y / peak))
    colors[i * 3] = tint.r
    colors[i * 3 + 1] = tint.g
    colors[i * 3 + 2] = tint.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: CONFIG.terrain.roughness,
    metalness: CONFIG.terrain.metalness,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  scene.add(mesh)

  // Heightfield lives on XY. A -90 degree roll lays it on the ground.
  // data[xi][yi] is the height at world x = -half + xi * elementSize, z = half - yi * elementSize.
  const divisions = CONFIG.terrain.physicsDivisions
  const elementSize = size / divisions
  const samples = divisions + 1
  const data = []
  for (let xi = 0; xi < samples; xi += 1) {
    const row = []
    const worldX = -half + xi * elementSize
    for (let yi = 0; yi < samples; yi += 1) {
      const worldZ = half - yi * elementSize
      row.push(terrainHeight(worldX, worldZ))
    }
    data.push(row)
  }

  const shape = new Heightfield(data, { elementSize })
  const body = new Body({ mass: 0, material: physics.materials.snow })
  body.addShape(shape)
  body.position.set(-half, 0, half)
  body.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2)
  physics.world.addBody(body)

  return { mesh, body }
}
