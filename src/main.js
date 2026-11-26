import * as THREE from 'three'
import { CONFIG } from './config.js'
import { createFence } from './fence.js'
import { createLighting } from './lighting.js'
import { createPhysics } from './physics.js'
import { createPlayer } from './player.js'
import { createSnowballs } from './snowballs.js'
import { createSnowflakes } from './snowflakes.js'
import { createTerrain } from './terrain.js'
import { createUI } from './ui.js'

const app = document.querySelector('#app')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = CONFIG.renderer.exposure
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov,
  window.innerWidth / window.innerHeight,
  CONFIG.camera.near,
  CONFIG.camera.far,
)

const physics = createPhysics()
const terrain = createTerrain(scene, physics)
const fence = createFence(scene, physics)
const lighting = createLighting(scene, renderer)
const player = createPlayer(scene, camera, fence.colliders)
const snowflakes = createSnowflakes(scene, camera)

const ui = createUI({
  onToggleSnow(enabled) {
    snowflakes.setEnabled(enabled)
  },
  onCycleTime() {
    return lighting.cycle()
  },
  onReset() {
    reset()
  },
})
ui.setTime(lighting.current())

const snowballs = createSnowballs({
  scene,
  physics,
  camera,
  domElement: renderer.domElement,
  ground: terrain.mesh,
  colliders: fence.colliders,
  getPlayer: () => player.state,
  isBlocked: () => ui.isHelpOpen(),
})
player.setRollingBallGetter(() => snowballs.rollingBall())

function reset() {
  snowballs.clear()
  player.reset()
  snowflakes.setEnabled(CONFIG.snowflakes.enabled)
  ui.applyDefaults(lighting.reset())
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio))
  renderer.setSize(window.innerWidth, window.innerHeight)
})

let last = performance.now()
let accumulator = 0

function frame(now) {
  const frameDt = Math.min(CONFIG.physics.maxFrameDelta, (now - last) / 1000)
  last = now
  accumulator += frameDt

  const step = CONFIG.physics.fixedStep
  let steps = 0
  while (accumulator >= step && steps < CONFIG.physics.maxSubSteps) {
    player.update(step)
    snowballs.update(step)
    physics.world.step(step)
    player.resolveBalls(snowballs.list)
    accumulator -= step
    steps += 1
  }
  if (steps === CONFIG.physics.maxSubSteps) accumulator = 0

  player.lateUpdate()
  snowballs.sync()
  snowflakes.update(frameDt)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
