import {
  Body,
  Box,
  ContactMaterial,
  Material,
  SAPBroadphase,
  Vec3,
  World,
} from 'cannon-es'
import { CONFIG } from './config.js'

export function createPhysics() {
  const world = new World({
    gravity: new Vec3(0, CONFIG.physics.gravity, 0),
  })
  world.broadphase = new SAPBroadphase(world)
  world.allowSleep = true
  world.solver.iterations = CONFIG.physics.solverIterations
  world.solver.tolerance = CONFIG.physics.solverTolerance
  world.defaultContactMaterial.friction = CONFIG.physics.defaultFriction
  world.defaultContactMaterial.restitution = CONFIG.physics.defaultRestitution

  const snow = new Material('snow')
  const wood = new Material('wood')
  const ball = new Material('ball')

  const pair = (a, b, friction, restitution) => {
    world.addContactMaterial(new ContactMaterial(a, b, { friction, restitution }))
  }

  pair(ball, snow, CONFIG.physics.ballSnowFriction, CONFIG.physics.ballSnowRestitution)
  pair(ball, wood, CONFIG.physics.ballWoodFriction, CONFIG.physics.ballWoodRestitution)
  pair(ball, ball, CONFIG.physics.ballBallFriction, CONFIG.physics.ballBallRestitution)

  addBounds(world, snow)

  return { world, materials: { snow, wood, ball } }
}

function addBounds(world, material) {
  const half = CONFIG.world.size / 2
  const thickness = CONFIG.world.wallThickness
  const height = CONFIG.world.wallHeight
  const span = CONFIG.world.size + thickness * 2
  const y = height / 2
  const walls = [
    [half + thickness / 2, y, 0, thickness, height, span],
    [-half - thickness / 2, y, 0, thickness, height, span],
    [0, y, half + thickness / 2, span, height, thickness],
    [0, y, -half - thickness / 2, span, height, thickness],
  ]

  for (const [x, wy, z, sx, sy, sz] of walls) {
    const body = new Body({ mass: 0, material })
    body.addShape(new Box(new Vec3(sx / 2, sy / 2, sz / 2)))
    body.position.set(x, wy, z)
    world.addBody(body)
  }
}
