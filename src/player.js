import * as THREE from 'three'
import { CONFIG } from './config.js'
import { terrainHeight } from './terrain.js'

const worldUp = new THREE.Vector3(0, 1, 0)
const upAxis = new THREE.Vector3()

const FORWARD = new Set(['KeyW', 'ArrowUp'])
const BACK = new Set(['KeyS', 'ArrowDown'])
const LEFT = new Set(['KeyA', 'ArrowLeft'])
const RIGHT = new Set(['KeyD', 'ArrowRight'])
const TURN_LEFT = new Set(['KeyQ'])
const TURN_RIGHT = new Set(['KeyE'])

export function createPlayer(scene, camera, colliders) {
  const state = {
    x: CONFIG.player.spawn.x,
    y: 0,
    z: CONFIG.player.spawn.z,
    yaw: CONFIG.player.spawn.yaw,
    vx: 0,
    vz: 0,
  }
  state.y = terrainHeight(state.x, state.z)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      depthWrite: false,
    }),
  )
  shadow.renderOrder = 2
  scene.add(shadow)

  const keys = new Set()
  let getRollingBall = () => null
  let zoom = 1

  function onKeyDown(event) {
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      event.preventDefault()
    }
    keys.add(event.code)
  }

  function onKeyUp(event) {
    keys.delete(event.code)
  }

  function onWheel(event) {
    if (event.target instanceof Element && event.target.closest('#panel, #help')) return
    event.preventDefault()
    const cfg = CONFIG.camera
    zoom = THREE.MathUtils.clamp(
      zoom * Math.exp(wheelPixels(event) * cfg.zoomSpeed),
      cfg.minZoom,
      cfg.maxZoom,
    )
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', () => keys.clear())
  window.addEventListener('wheel', onWheel, { passive: false })

  function update(dt) {
    const cfg = CONFIG.player
    const turn = (held(keys, TURN_RIGHT) ? 1 : 0) - (held(keys, TURN_LEFT) ? 1 : 0)
    state.yaw -= turn * cfg.turnSpeed * dt

    const x0 = state.x
    const z0 = state.z
    const rolling = getRollingBall()
    if (rolling) followRoll(state, rolling, dt)
    else walk(state, keys, dt)

    contain(state, colliders, Boolean(rolling))
    state.y = terrainHeight(state.x, state.z)
    state.vx = (state.x - x0) / dt
    state.vz = (state.z - z0) / dt
  }

  function resolveBalls(balls) {
    if (getRollingBall()) {
      separateFromBalls(state, balls)
      contain(state, colliders, true)
    }
    state.y = terrainHeight(state.x, state.z)
  }

  function lateUpdate() {
    const cfg = CONFIG.camera
    const forwardX = Math.sin(state.yaw)
    const forwardZ = Math.cos(state.yaw)
    const distance = cfg.distance * zoom
    const lookY = state.y + cfg.lookHeight
    let cameraX = state.x - forwardX * distance
    let cameraZ = state.z - forwardZ * distance
    let cameraY = lookY + (cfg.height - cfg.lookHeight) * zoom
    const clearance = terrainHeight(cameraX, cameraZ) + cfg.groundClearance
    if (cameraY < clearance) cameraY = clearance
    camera.position.set(cameraX, cameraY, cameraZ)
    camera.lookAt(state.x, lookY, state.z)

    terrainNormal(state.x, state.z, upAxis)
    shadow.position.set(
      state.x + upAxis.x * CONFIG.player.shadowLift,
      state.y + upAxis.y * CONFIG.player.shadowLift,
      state.z + upAxis.z * CONFIG.player.shadowLift,
    )
    shadow.quaternion.setFromUnitVectors(worldUp, upAxis)
    shadow.scale.setScalar(CONFIG.player.shadowRadius)
  }

  function reset() {
    state.x = CONFIG.player.spawn.x
    state.z = CONFIG.player.spawn.z
    state.yaw = CONFIG.player.spawn.yaw
    state.y = terrainHeight(state.x, state.z)
    state.vx = 0
    state.vz = 0
    zoom = 1
    lateUpdate()
  }

  lateUpdate()

  return {
    update,
    resolveBalls,
    lateUpdate,
    reset,
    state,
    setRollingBallGetter(fn) {
      getRollingBall = fn
    },
  }
}

function wheelPixels(event) {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight
  return event.deltaY
}

function walk(state, keys, dt) {
  const forwardAxis = (held(keys, FORWARD) ? 1 : 0) - (held(keys, BACK) ? 1 : 0)
  const strafeAxis = (held(keys, RIGHT) ? 1 : 0) - (held(keys, LEFT) ? 1 : 0)
  if (forwardAxis === 0 && strafeAxis === 0) return

  const forwardX = Math.sin(state.yaw)
  const forwardZ = Math.cos(state.yaw)
  let moveX = forwardX * forwardAxis + -forwardZ * strafeAxis
  let moveZ = forwardZ * forwardAxis + forwardX * strafeAxis
  const length = Math.hypot(moveX, moveZ)
  if (length < 1e-6) return
  moveX /= length
  moveZ /= length
  state.x += moveX * CONFIG.player.walkSpeed * dt
  state.z += moveZ * CONFIG.player.walkSpeed * dt
}

function followRoll(state, ball, dt) {
  const forwardX = Math.sin(state.yaw)
  const forwardZ = Math.cos(state.yaw)
  const stand = CONFIG.player.radius + ball.radius + CONFIG.player.rollGap
  const goalX = ball.body.position.x - forwardX * stand
  const goalZ = ball.body.position.z - forwardZ * stand
  let dx = goalX - state.x
  let dz = goalZ - state.z
  const along = dx * forwardX + dz * forwardZ
  if (along < 0) {
    dx -= forwardX * along
    dz -= forwardZ * along
  }
  const dist = Math.hypot(dx, dz)
  if (dist < 1e-4) return
  const step = Math.min(dist, CONFIG.player.walkSpeed * dt)
  state.x += (dx / dist) * step
  state.z += (dz / dist) * step
}

function held(keys, codes) {
  for (const code of codes) {
    if (keys.has(code)) return true
  }
  return false
}

export function slopeAlong(x, z, dirX, dirZ) {
  const sample = CONFIG.player.slopeSample
  const ahead = terrainHeight(x + dirX * sample, z + dirZ * sample)
  const here = terrainHeight(x, z)
  return (ahead - here) / sample
}

export function groundSlope(x, z) {
  const sample = CONFIG.player.slopeSample
  const riseX = terrainHeight(x + sample, z) - terrainHeight(x - sample, z)
  const riseZ = terrainHeight(x, z + sample) - terrainHeight(x, z - sample)
  return Math.hypot(riseX, riseZ) / (sample * 2)
}

export function rollSpeedScale(x, z, dirX, dirZ) {
  const length = Math.hypot(dirX, dirZ)
  if (length < 1e-5) return 1
  return slopeMultiplier(slopeAlong(x, z, dirX / length, dirZ / length))
}

function slopeMultiplier(slope) {
  const cfg = CONFIG.player
  if (slope >= cfg.maxWalkSlope) return cfg.blockedSlopeMultiplier
  if (slope > 0) {
    const t = slope / cfg.maxWalkSlope
    return 1 + (cfg.uphillSpeedMultiplier - 1) * t
  }
  const t = Math.min(1, -slope / cfg.maxWalkSlope)
  return 1 + (cfg.downhillSpeedMultiplier - 1) * t
}

function contain(state, colliders, solids) {
  const limit = CONFIG.world.size / 2 - CONFIG.player.boundsMargin
  for (let pass = 0; pass < CONFIG.player.collisionIterations; pass += 1) {
    if (solids) {
      for (let i = 0; i < colliders.length; i += 1) {
        pushOutOfSegment(state, colliders[i])
      }
    }
    state.x = clamp(state.x, -limit, limit)
    state.z = clamp(state.z, -limit, limit)
  }
}

function pushOutOfSegment(state, segment) {
  const radius = CONFIG.player.radius
  const height = CONFIG.player.height
  const hit = closestSegments(
    state.x,
    state.y + radius,
    state.z,
    state.x,
    state.y + height - radius,
    state.z,
    segment.ax,
    segment.ay,
    segment.az,
    segment.bx,
    segment.by,
    segment.bz,
  )
  const minDist = radius + segment.radius
  const overlap = minDist - hit.dist
  if (overlap <= 0) return

  let nx = hit.px - hit.qx
  let nz = hit.pz - hit.qz
  const horizontal = Math.hypot(nx, nz)
  if (horizontal < 1e-6) {
    nx = state.x - segment.ax
    nz = state.z - segment.az
    const fallback = Math.hypot(nx, nz) || 1
    nx /= fallback
    nz /= fallback
  } else {
    nx /= horizontal
    nz /= horizontal
  }
  state.x += nx * (overlap + 0.001)
  state.z += nz * (overlap + 0.001)
}

function separateFromBalls(state, balls) {
  const cfg = CONFIG.player
  const playerMass = cfg.mass
  for (let pass = 0; pass < cfg.collisionIterations; pass += 1) {
    for (let i = 0; i < balls.length; i += 1) {
      const ball = balls[i]
      const body = ball.body
      const y0 = state.y + cfg.radius
      const y1 = state.y + cfg.height - cfg.radius
      const closestY = clamp(body.position.y, y0, y1)
      const dx = state.x - body.position.x
      const dy = closestY - body.position.y
      const dz = state.z - body.position.z
      const dist = Math.hypot(dx, dy, dz) || 1e-6
      const minDist = cfg.radius + ball.radius
      if (dist >= minDist) continue

      const overlap = minDist - dist
      const nx = dx / dist
      const ny = dy / dist
      const nz = dz / dist
      const ballMass = Math.max(body.mass, 0.001)
      const total = playerMass + ballMass
      state.x += nx * overlap * (ballMass / total)
      state.z += nz * overlap * (ballMass / total)
      body.position.x -= nx * overlap * (playerMass / total)
      body.position.y -= ny * overlap * (playerMass / total)
      body.position.z -= nz * overlap * (playerMass / total)

      const minY = terrainHeight(body.position.x, body.position.z) + ball.radius
      if (body.position.y < minY) body.position.y = minY

      const rel =
        (state.vx - body.velocity.x) * nx +
        (0 - body.velocity.y) * ny +
        (state.vz - body.velocity.z) * nz
      if (pass === 0 && rel < 0) {
        const impulse = (-(1 + cfg.ballRestitution) * rel) / (1 / playerMass + 1 / ballMass)
        body.velocity.x -= (impulse * nx) / ballMass
        body.velocity.y -= (impulse * ny) / ballMass
        body.velocity.z -= (impulse * nz) / ballMass
        body.wakeUp()
      }
      body.updateAABB()
    }
  }
}

function closestSegments(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  const d1x = bx - ax
  const d1y = by - ay
  const d1z = bz - az
  const d2x = dx - cx
  const d2y = dy - cy
  const d2z = dz - cz
  const rx = ax - cx
  const ry = ay - cy
  const rz = az - cz
  const aa = d1x * d1x + d1y * d1y + d1z * d1z
  const bb = d2x * d2x + d2y * d2y + d2z * d2z
  const ab = d1x * d2x + d1y * d2y + d1z * d2z
  const ar = d1x * rx + d1y * ry + d1z * rz
  const br = d2x * rx + d2y * ry + d2z * rz
  const eps = 1e-8
  let s = 0
  let t = 0

  if (aa <= eps && bb <= eps) {
    s = 0
    t = 0
  } else if (aa <= eps) {
    s = 0
    t = clamp(br / bb, 0, 1)
  } else if (bb <= eps) {
    t = 0
    s = clamp(-ar / aa, 0, 1)
  } else {
    const denom = aa * bb - ab * ab
    s = denom > eps ? clamp((ab * br - ar * bb) / denom, 0, 1) : 0
    t = (ab * s + br) / bb
    if (t < 0) {
      t = 0
      s = clamp(-ar / aa, 0, 1)
    } else if (t > 1) {
      t = 1
      s = clamp((ab - ar) / aa, 0, 1)
    }
  }

  const px = ax + d1x * s
  const py = ay + d1y * s
  const pz = az + d1z * s
  const qx = cx + d2x * t
  const qy = cy + d2y * t
  const qz = cz + d2z * t
  return {
    px,
    py,
    pz,
    qx,
    qy,
    qz,
    dist: Math.hypot(px - qx, py - qy, pz - qz),
  }
}

function terrainNormal(x, z, target) {
  const e = 0.4
  return target.set(
    terrainHeight(x - e, z) - terrainHeight(x + e, z),
    e * 2,
    terrainHeight(x, z - e) - terrainHeight(x, z + e),
  ).normalize()
}

function createShadowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(30, 40, 58, 0.38)')
  gradient.addColorStop(1, 'rgba(30, 40, 58, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
