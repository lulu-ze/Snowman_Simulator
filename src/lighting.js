import * as THREE from 'three'
import { CONFIG } from './config.js'

export function createLighting(scene, renderer) {
  const hemi = new THREE.HemisphereLight()
  const sun = new THREE.DirectionalLight()
  sun.castShadow = true

  const shadow = CONFIG.lighting.shadow
  sun.shadow.mapSize.set(shadow.mapSize, shadow.mapSize)
  sun.shadow.camera.left = -shadow.size
  sun.shadow.camera.right = shadow.size
  sun.shadow.camera.top = shadow.size
  sun.shadow.camera.bottom = -shadow.size
  sun.shadow.camera.near = shadow.near
  sun.shadow.camera.far = shadow.far
  sun.shadow.bias = shadow.bias
  sun.shadow.normalBias = shadow.normalBias
  sun.shadow.radius = shadow.radius
  sun.shadow.camera.updateProjectionMatrix()

  scene.add(hemi)
  scene.add(sun)
  scene.add(sun.target)
  scene.fog = new THREE.FogExp2('#ffffff', 0.02)

  const modes = () => CONFIG.lighting.modes
  let index = Math.max(0, modes().findIndex((mode) => mode.id === CONFIG.lighting.defaultMode))

  function apply(nextIndex) {
    const list = modes()
    index = (nextIndex + list.length) % list.length
    const mode = list[index]
    hemi.color.set(mode.hemiSky)
    hemi.groundColor.set(mode.hemiGround)
    hemi.intensity = mode.hemiIntensity
    sun.color.set(mode.sunColor)
    sun.intensity = mode.sunIntensity
    sun.position.set(mode.sunPosition[0], mode.sunPosition[1], mode.sunPosition[2])
    sun.target.position.set(0, 0, 0)
    sun.target.updateMatrixWorld()
    scene.background = new THREE.Color(mode.background)
    scene.fog.color.set(mode.fog)
    scene.fog.density = mode.fogDensity
    renderer.toneMappingExposure = mode.exposure
    return mode
  }

  apply(index)

  return {
    cycle() {
      return apply(index + 1)
    },
    reset() {
      const start = modes().findIndex((mode) => mode.id === CONFIG.lighting.defaultMode)
      return apply(start < 0 ? 0 : start)
    },
    current() {
      return modes()[index]
    },
  }
}
