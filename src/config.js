// Every tunable lives here. Edit these while debugging, then reload.
// Values marked "live" are read during play. Everything else is read when the world is built.

export const CONFIG = {
  // startup
  renderer: {
    maxPixelRatio: 1.75,
    exposure: 1,
  },

  // startup. Square width of the snow field, in meters.
  world: {
    size: 112,
    wallThickness: 1.5,
    wallHeight: 8,
  },

  // live, except the mesh and heightfield, which keep the startup hills until reload
  terrain: {
    visualSegments: 220,
    physicsDivisions: 140,
    colorLow: '#f4f7fb',
    colorHigh: '#dce8f3',
    roughness: 0.94,
    metalness: 0,
    hills: [
      { x: 1.5, z: 5, radius: 2.3, height: 1.15 },
      { x: -12, z: 9, radius: 2.1, height: 0.72 },
      { x: 15, z: -1, radius: 2.6, height: 1.05 },
      { x: -5, z: -14, radius: 2.4, height: 0.85 },
      { x: 22, z: 18, radius: 2.0, height: 0.65 },
      { x: -24, z: -6, radius: 2.8, height: 1.1 },
    ],
  },

  // startup
  fence: {
    seed: 4,
    runCount: 5,
    minPosts: 4,
    maxPosts: 7,
    postSpacing: 1.45,
    spacingJitter: 0.22,
    wander: 0.55,
    radiusMin: 8,
    radiusMax: 15,
    edgeMargin: 3.5,
    spawnClearance: 6,
    postRadius: 0.085,
    postHeightMin: 0.95,
    postHeightMax: 1.28,
    railRadius: 0.042,
    railFractions: [0.4, 0.74],
    sink: 0.16,
    radialSegments: 18,
    capSegments: 5,
    colliderSegments: 8,
    colorJitter: 0.04,
    roughness: 0.82,
    maxPlacementAttempts: 40,
  },

  // live
  player: {
    spawn: { x: 0, z: 16, yaw: Math.PI },
    height: 1.65,
    radius: 0.38,
    mass: 72,
    walkSpeed: 5,
    turnSpeed: 1.65,
    // How far behind the snowball the walker stands while rolling it.
    rollGap: 0.55,
    // Slope changes speed only while a ball is being rolled. 1 is flat ground.
    uphillSpeedMultiplier: 0.2,
    downhillSpeedMultiplier: 2.45,
    // Rise over run. Steeper than this and uphill walking nearly stops.
    maxWalkSlope: 0.44,
    blockedSlopeMultiplier: 0.055,
    slopeSample: 0.45,
    boundsMargin: 0.85,
    collisionIterations: 4,
    ballRestitution: 0.04,
    shadowRadius: 0.62,
    shadowLift: 0.045,
  },

  // live, except the shared sphere mesh detail
  snowball: {
    minRadius: 0.32,
    maxRadius: 1.05,
    // Packed-snow feel in game units. Mass = density * (4/3) * pi * r^3.
    density: 14,
    growthPerMeter: 0.034,
    maxGrowthPerSecond: 0.1,
    growPadding: 0.05,
    maxCount: 36,
    segments: 32,
    followGain: 38,
    // Fixed push in newtons. Heavy balls also get climbAccel and enough force to beat their weight uphill.
    rollForce: 84,
    climbAccel: 2.4,
    climbMargin: 1.55,
    maxRollSpeed: 5,
    // How quickly the ball closes on the cursor while the mouse is moving.
    catchup: 6,
    coastDelayMs: 70,
    coastStrength: 4.2,
    linearDamping: 0.42,
    angularDamping: 0.4,
    sleepSpeedLimit: 0.08,
    sleepTimeLimit: 0.35,
    roughness: 0.78,
    metalness: 0,
  },

  // live movement, startup count and texture size
  snowflakes: {
    enabled: true,
    count: 850,
    size: 0.28,
    spread: 60,
    height: 18,
    fallSpeed: 1.35,
    fallVariance: 0.85,
    drift: 0.45,
    minCameraDistance: 6,
    color: '#ffffff',
    opacity: 0.92,
  },

  // startup structure, live because modes are reapplied from here
  lighting: {
    defaultMode: 'day',
    shadow: {
      mapSize: 2048,
      size: 46,
      near: 0.5,
      far: 130,
      bias: -0.00018,
      normalBias: 0.04,
      radius: 1.5,
    },
    modes: [
      {
        id: 'morning',
        label: 'Morning',
        background: '#f3c7ae',
        fog: '#f6d3c2',
        fogDensity: 0.015,
        exposure: 1.02,
        sunColor: '#ffd2a8',
        sunIntensity: 1.55,
        sunPosition: [30, 12, 16],
        hemiSky: '#ffd8c4',
        hemiGround: '#cbb6a4',
        hemiIntensity: 0.62,
      },
      {
        id: 'day',
        label: 'Day',
        background: '#b9d6f4',
        fog: '#d7e7f6',
        fogDensity: 0.012,
        exposure: 1.04,
        sunColor: '#fff4e4',
        sunIntensity: 1.7,
        sunPosition: [22, 20, 8],
        hemiSky: '#d5ebff',
        hemiGround: '#c5d0dc',
        hemiIntensity: 0.58,
      },
      {
        id: 'evening',
        label: 'Evening',
        background: '#e7a184',
        fog: '#efc0aa',
        fogDensity: 0.016,
        exposure: 0.98,
        sunColor: '#ffb184',
        sunIntensity: 1.35,
        sunPosition: [-28, 10, -12],
        hemiSky: '#ffc6ad',
        hemiGround: '#8d7b90',
        hemiIntensity: 0.5,
      },
      {
        id: 'night',
        label: 'Night',
        background: '#1a2233',
        fog: '#1b2436',
        fogDensity: 0.026,
        exposure: 0.78,
        sunColor: '#c5d4ff',
        sunIntensity: 0.42,
        sunPosition: [-16, 24, 18],
        hemiSky: '#24344e',
        hemiGround: '#141820',
        hemiIntensity: 0.38,
      },
    ],
  },

  // startup. Contact values are copied into the physics world once.
  physics: {
    gravity: -9.82,
    fixedStep: 1 / 60,
    maxFrameDelta: 0.05,
    maxSubSteps: 5,
    solverIterations: 12,
    solverTolerance: 1e-7,
    ballSnowFriction: 0.38,
    ballSnowRestitution: 0.01,
    ballWoodFriction: 0.55,
    ballWoodRestitution: 0.02,
    ballBallFriction: 0.4,
    ballBallRestitution: 0.04,
    defaultFriction: 0.3,
    defaultRestitution: 0.01,
  },

  // live
  camera: {
    fov: 48,
    near: 0.1,
    far: 320,
    distance: 8.6,
    height: 4.4,
    lookHeight: 1.15,
    groundClearance: 0.7,
    // Mouse wheel scales the boom. 1 matches the distance and height above.
    minZoom: 0.45,
    maxZoom: 2.4,
    zoomSpeed: 0.0016,
  },

  // startup defaults, toggled live by the panel
  audio: {
    sound: false,
    music: false,
  },

  colors: {
    snowball: '#f7fbff',
    wood: '#b9855c',
  },

  help: {
    title: 'How to play',
    close: 'Close',
    lines: [
      'Hold the left mouse button on the snow and a small snowball appears. Roll it in the direction the mouse moves. It grows slowly as you keep rolling, up to a limit, and eases to a stop when the mouse stops.',
      'Drag a snowball that is already there to keep rolling it. Bigger balls are heavier, so they lag behind the cursor and shove smaller ones.',
      'W and S, or the up and down arrows, walk forward and back. A and D, or the left and right arrows, step sideways. Q and E turn. Scroll the mouse wheel to move the camera closer or farther. Until you roll a ball, you walk through the fence and other snowballs. While you roll, you walk with the ball and do not step backward. Uphill is slow and downhill is much faster.',
      'The panel toggles falling snow, steps through morning, day, evening, and night, resets the field, and switches sound and music. Sound and music do not play anything yet.',
    ],
  },
}
