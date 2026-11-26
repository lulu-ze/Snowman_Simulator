import { Body, Cylinder, Quaternion, Vec3 } from 'cannon-es'
import * as THREE from 'three'
import { CONFIG } from './config.js'
import { terrainHeight } from './terrain.js'

export function createFence(scene, physics) {
  const group = new THREE.Group()
  scene.add(group)

  const cfg = CONFIG.fence
  const rng = makeRng(cfg.seed)
  const colliders = []
  let placed = 0
  let attempts = 0

  while (placed < cfg.runCount && attempts < cfg.maxPlacementAttempts) {
    attempts += 1
    const posts = makeRun(rng)
    if (!posts) continue
    placed += 1

    const color = new THREE.Color(CONFIG.colors.wood)
    color.offsetHSL((rng() - 0.5) * cfg.colorJitter, 0, (rng() - 0.5) * cfg.colorJitter)
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: cfg.roughness,
      metalness: 0,
    })

    for (let i = 0; i < posts.length; i += 1) {
      addPost(group, physics, colliders, material, posts[i])
      if (i === 0) continue
      for (const fraction of cfg.railFractions) {
        addRail(group, physics, colliders, material, posts[i - 1], posts[i], fraction)
      }
    }
  }

  return { colliders }
}

function addPost(group, physics, colliders, material, post) {
  const cfg = CONFIG.fence
  const ground = terrainHeight(post.x, post.z)
  const middle = Math.max(0.08, post.height + cfg.sink - cfg.postRadius * 2)
  const geometry = new THREE.CapsuleGeometry(
    cfg.postRadius,
    middle,
    cfg.capSegments,
    cfg.radialSegments,
  )
  const mesh = new THREE.Mesh(geometry, material)
  const total = middle + cfg.postRadius * 2
  const bottom = ground + post.height - total
  mesh.position.set(post.x, bottom + total / 2, post.z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)

  const body = new Body({ mass: 0, material: physics.materials.wood })
  body.addShape(new Cylinder(cfg.postRadius, cfg.postRadius, post.height, cfg.colliderSegments))
  body.position.set(post.x, ground + post.height / 2, post.z)
  physics.world.addBody(body)

  colliders.push({
    ax: post.x,
    ay: ground - cfg.sink,
    az: post.z,
    bx: post.x,
    by: ground + post.height,
    bz: post.z,
    radius: cfg.postRadius,
  })
}

function addRail(group, physics, colliders, material, from, to, fraction) {
  const cfg = CONFIG.fence
  const a = railEnd(from, fraction)
  const b = railEnd(to, fraction)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  const length = Math.hypot(dx, dy, dz)
  const middle = length - cfg.railRadius * 2
  if (middle < 0.08) return

  const geometry = new THREE.CapsuleGeometry(
    cfg.railRadius,
    middle,
    cfg.capSegments,
    cfg.radialSegments,
  )
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  const direction = new THREE.Vector3(dx, dy, dz).multiplyScalar(1 / length)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)

  const body = new Body({ mass: 0, material: physics.materials.wood })
  body.addShape(new Cylinder(cfg.railRadius, cfg.railRadius, length, cfg.colliderSegments))
  body.position.set(mesh.position.x, mesh.position.y, mesh.position.z)
  const orientation = new Quaternion()
  orientation.setFromVectors(new Vec3(0, 1, 0), new Vec3(direction.x, direction.y, direction.z))
  body.quaternion.copy(orientation)
  physics.world.addBody(body)

  colliders.push({
    ax: a.x,
    ay: a.y,
    az: a.z,
    bx: b.x,
    by: b.y,
    bz: b.z,
    radius: cfg.railRadius,
  })
}

function railEnd(post, fraction) {
  const ground = terrainHeight(post.x, post.z)
  return {
    x: post.x,
    y: ground + post.height * fraction,
    z: post.z,
  }
}

function makeRun(rng) {
  const cfg = CONFIG.fence
  const half = CONFIG.world.size / 2 - cfg.edgeMargin
  const spawn = CONFIG.player.spawn
  const angle = rng() * Math.PI * 2
  const radius = lerp(cfg.radiusMin, cfg.radiusMax, rng())
  let heading = angle + Math.PI / 2 + (rng() - 0.5) * 0.7
  let x = Math.cos(angle) * radius
  let z = Math.sin(angle) * radius
  const count = randInt(rng, cfg.minPosts, cfg.maxPosts)
  const posts = []

  for (let i = 0; i < count; i += 1) {
    if (Math.abs(x) > half || Math.abs(z) > half) break
    const dx = x - spawn.x
    const dz = z - spawn.z
    if (dx * dx + dz * dz < cfg.spawnClearance * cfg.spawnClearance) return null
    posts.push({
      x,
      z,
      height: lerp(cfg.postHeightMin, cfg.postHeightMax, rng()),
    })
    const spacing = cfg.postSpacing * lerp(1 - cfg.spacingJitter, 1 + cfg.spacingJitter, rng())
    heading += (rng() - 0.5) * cfg.wander
    x += Math.cos(heading) * spacing
    z += Math.sin(heading) * spacing
  }

  return posts.length >= 3 ? posts : null
}

function makeRng(seed) {
  let value = seed >>> 0
  return function rng() {
    value = (value + 0x6d2b79f5) >>> 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1))
}
