import { Body, Sphere, Vec3 } from 'cannon-es'
import * as THREE from 'three'
import { CONFIG } from './config.js'
import { rollSpeedScale, slopeAlong } from './player.js'
import { terrainHeight } from './terrain.js'

const followForce = new Vec3()
const followPoint = new Vec3()

export function createSnowballs({ scene, physics, camera, domElement, ground, colliders, getPlayer, isBlocked }) {
  const list = []
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const geometry = new THREE.SphereGeometry(1, CONFIG.snowball.segments, CONFIG.snowball.segments)
  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.snowball,
    roughness: CONFIG.snowball.roughness,
    metalness: CONFIG.snowball.metalness,
  })

  let dragging = false
  let active = null
  let lastPointer = 0
  let lastMoveAt = 0
  let lastGround = null

  function massForRadius(radius) {
    return CONFIG.snowball.density * (4 / 3) * Math.PI * radius * radius * radius
  }

  function setRadius(ball, radius) {
    const shape = ball.body.shapes[0]
    ball.radius = radius
    ball.mesh.scale.setScalar(radius)
    shape.radius = radius
    ball.body.mass = massForRadius(radius)
    ball.body.updateBoundingRadius()
    ball.body.updateMassProperties()
    const lift = terrainHeight(ball.body.position.x, ball.body.position.z) + radius
    if (ball.body.position.y < lift) ball.body.position.y = lift
    ball.body.wakeUp()
  }

  function canGrow(ball, radius) {
    const padding = CONFIG.snowball.growPadding
    for (let i = 0; i < list.length; i += 1) {
      const other = list[i]
      if (other === ball) continue
      const dx = other.body.position.x - ball.body.position.x
      const dy = other.body.position.y - ball.body.position.y
      const dz = other.body.position.z - ball.body.position.z
      if (Math.hypot(dx, dy, dz) < radius + other.radius + padding) return false
    }
    return true
  }

  function grow(ball, traveled, dt) {
    const cfg = CONFIG.snowball
    if (ball.radius >= cfg.maxRadius - 1e-4) return
    const step = Math.min(traveled * cfg.growthPerMeter, cfg.maxGrowthPerSecond * dt)
    const proposed = Math.min(cfg.maxRadius, ball.radius + step)
    if (proposed <= ball.radius || !canGrow(ball, proposed)) return
    setRadius(ball, proposed)
  }

  function spawn(x, z) {
    if (list.length >= CONFIG.snowball.maxCount) return null
    const radius = CONFIG.snowball.minRadius
    const body = new Body({
      mass: massForRadius(radius),
      material: physics.materials.ball,
      linearDamping: CONFIG.snowball.linearDamping,
      angularDamping: CONFIG.snowball.angularDamping,
      allowSleep: true,
      sleepSpeedLimit: CONFIG.snowball.sleepSpeedLimit,
      sleepTimeLimit: CONFIG.snowball.sleepTimeLimit,
    })
    body.addShape(new Sphere(radius))
    body.position.set(x, terrainHeight(x, z) + radius, z)
    physics.world.addBody(body)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.scale.setScalar(radius)
    scene.add(mesh)

    const ball = { body, mesh, radius }
    mesh.userData.ball = ball
    list.push(ball)
    return ball
  }

  function spotClear(x, z, radius) {
    const y = terrainHeight(x, z) + radius
    return !overlapsPlayer(x, y, z, radius) && !overlapsBalls(x, y, z, radius) && !overlapsFence(x, y, z, radius)
  }

  function overlapsBalls(x, y, z, radius) {
    const padding = CONFIG.snowball.growPadding
    for (let i = 0; i < list.length; i += 1) {
      const other = list[i]
      const dx = other.body.position.x - x
      const dy = other.body.position.y - y
      const dz = other.body.position.z - z
      if (Math.hypot(dx, dy, dz) < radius + other.radius + padding) return true
    }
    return false
  }

  function overlapsPlayer(x, y, z, radius) {
    const player = getPlayer()
    const cfg = CONFIG.player
    const closestY = clamp(y, player.y + cfg.radius, player.y + cfg.height - cfg.radius)
    return Math.hypot(x - player.x, y - closestY, z - player.z) < radius + cfg.radius + CONFIG.snowball.growPadding
  }

  function overlapsFence(x, y, z, radius) {
    const padding = CONFIG.snowball.growPadding
    for (let i = 0; i < colliders.length; i += 1) {
      const segment = colliders[i]
      if (pointSegmentDistance(x, y, z, segment) < radius + segment.radius + padding) return true
    }
    return false
  }

  function aim(event) {
    const rect = domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
  }

  function onPointerDown(event) {
    if (event.button !== 0 || isBlocked()) return
    aim(event)
    const groundHit = raycaster.intersectObject(ground, false)[0] ?? null
    const ballHit = list.length ? raycaster.intersectObjects(list.map((ball) => ball.mesh), false)[0] : null
    const existing = ballHit && (!groundHit || ballHit.distance <= groundHit.distance)
      ? ballHit.object.userData.ball
      : null
    if (!existing && !groundHit) return

    dragging = true
    const now = performance.now()
    lastPointer = now
    lastMoveAt = 0
    document.body.classList.add('rolling')
    if (existing) {
      active = existing
      lastGround = { x: existing.body.position.x, z: existing.body.position.z }
      active.body.wakeUp()
      return
    }
    const placed = placement(groundHit.point.x, groundHit.point.z, CONFIG.snowball.minRadius)
    if (placed) {
      active = spawn(placed.x, placed.z)
      lastGround = placed
      return
    }
    active = null
    lastGround = { x: groundHit.point.x, z: groundHit.point.z }
  }

  function onPointerMove(event) {
    if (!dragging) return
    aim(event)
    const hit = raycaster.intersectObject(ground, false)[0]
    if (!hit) return
    const x = hit.point.x
    const z = hit.point.z

    if (!active) {
      const placed = placement(x, z, CONFIG.snowball.minRadius)
      if (!placed) {
        lastGround = { x, z }
        return
      }
      active = spawn(placed.x, placed.z)
      lastGround = placed
      lastPointer = performance.now()
      return
    }

    const now = performance.now()
    const dt = Math.min(0.1, Math.max(0.001, (now - lastPointer) / 1000))
    const dx = x - lastGround.x
    const dz = z - lastGround.z
    const traveled = Math.hypot(dx, dz)
    lastGround = { x, z }
    lastPointer = now
    if (traveled > 0.004) lastMoveAt = now
    grow(active, traveled, dt)
  }

  function endDrag() {
    dragging = false
    active = null
    lastGround = null
    document.body.classList.remove('rolling')
  }

  function placement(x, z, radius) {
    if (spotClear(x, z, radius)) return { x, z }
    const y = terrainHeight(x, z) + radius
    if (!overlapsPlayer(x, y, z, radius)) return null
    const player = getPlayer()
    let dx = x - player.x
    let dz = z - player.z
    let len = Math.hypot(dx, dz)
    if (len < 1e-3) {
      dx = Math.sin(player.yaw)
      dz = Math.cos(player.yaw)
      len = 1
    }
    const reach = CONFIG.player.radius + radius + CONFIG.snowball.growPadding + 0.12
    const sx = player.x + (dx / len) * reach
    const sz = player.z + (dz / len) * reach
    return spotClear(sx, sz, radius) ? { x: sx, z: sz } : null
  }

  function applyRoll(ball, dirX, dirZ, dist) {
    const cfg = CONFIG.snowball
    const slopeScale = rollSpeedScale(ball.body.position.x, ball.body.position.z, dirX, dirZ)
    const maxSpeed = Math.max(cfg.maxRollSpeed, CONFIG.player.walkSpeed) * slopeScale
    const desired = Math.min(maxSpeed, dist * cfg.catchup)
    let vx = 0
    let vz = 0
    const speed = Math.hypot(dirX, dirZ)
    if (speed > 1e-6) {
      vx = (dirX / speed) * desired
      vz = (dirZ / speed) * desired
    }
    const mass = Math.max(ball.body.mass, 0.001)
    const gain = cfg.followGain * mass
    let fx = (vx - ball.body.velocity.x) * gain
    let fy = -ball.body.velocity.y * gain * 0.15
    let fz = (vz - ball.body.velocity.z) * gain
    const magnitude = Math.hypot(fx, fy, fz)
    const dirLen = Math.hypot(vx, vz) || 1
    const grade = slopeAlong(ball.body.position.x, ball.body.position.z, vx / dirLen, vz / dirLen)
    const sine = grade / Math.hypot(1, grade)
    const weight = mass * Math.abs(CONFIG.physics.gravity) * Math.max(0, sine)
    const forceCap = weight * cfg.climbMargin + mass * cfg.climbAccel + cfg.rollForce * Math.max(slopeScale, 0.35)
    if (magnitude > forceCap) {
      const limited = forceCap / magnitude
      fx *= limited
      fy *= limited
      fz *= limited
    }
    followForce.set(fx, fy, fz)
    ball.body.applyForce(followForce, followPoint)
  }

  function coast(ball, dt) {
    const keep = Math.exp(-CONFIG.snowball.coastStrength * dt)
    ball.body.velocity.x *= keep
    ball.body.velocity.z *= keep
    ball.body.angularVelocity.x *= keep
    ball.body.angularVelocity.y *= keep
    ball.body.angularVelocity.z *= keep
  }

  domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
  domElement.addEventListener('contextmenu', (event) => event.preventDefault())

  return {
    list,
    update(dt) {
      if (!active) return
      const idle = !lastGround || performance.now() - lastMoveAt > CONFIG.snowball.coastDelayMs
      const dx = lastGround ? lastGround.x - active.body.position.x : 0
      const dz = lastGround ? lastGround.z - active.body.position.z : 0
      if (idle || Math.hypot(dx, dz) < 0.04) {
        coast(active, dt)
        return
      }
      applyRoll(active, dx, dz, Math.hypot(dx, dz))
    },
    rollingBall() {
      return active
    },
    sync() {
      for (let i = 0; i < list.length; i += 1) {
        const ball = list[i]
        ball.mesh.position.set(ball.body.position.x, ball.body.position.y, ball.body.position.z)
        ball.mesh.quaternion.set(
          ball.body.quaternion.x,
          ball.body.quaternion.y,
          ball.body.quaternion.z,
          ball.body.quaternion.w,
        )
      }
    },
    clear() {
      for (let i = 0; i < list.length; i += 1) {
        physics.world.removeBody(list[i].body)
        scene.remove(list[i].mesh)
      }
      list.length = 0
      endDrag()
    },
  }
}

function pointSegmentDistance(px, py, pz, segment) {
  const abx = segment.bx - segment.ax
  const aby = segment.by - segment.ay
  const abz = segment.bz - segment.az
  const ab2 = abx * abx + aby * aby + abz * abz || 1
  const t = clamp(((px - segment.ax) * abx + (py - segment.ay) * aby + (pz - segment.az) * abz) / ab2, 0, 1)
  const x = segment.ax + abx * t
  const y = segment.ay + aby * t
  const z = segment.az + abz * t
  return Math.hypot(px - x, py - y, pz - z)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
