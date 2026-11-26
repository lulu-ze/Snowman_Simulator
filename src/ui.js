import { CONFIG } from './config.js'

export function createUI({ onToggleSnow, onCycleTime, onReset }) {
  let snow = CONFIG.snowflakes.enabled
  let sound = CONFIG.audio.sound
  let music = CONFIG.audio.music
  let helpOpen = false

  const panel = document.createElement('aside')
  panel.id = 'panel'
  panel.innerHTML = '<h1>Snowman</h1>'

  const helpButton = addButton(panel, 'Help')
  const snowButton = addButton(panel, '')
  const timeButton = addButton(panel, '')
  const resetButton = addButton(panel, 'Reset')
  const soundButton = addButton(panel, '')
  const musicButton = addButton(panel, '')

  const help = document.createElement('div')
  help.id = 'help'
  const card = document.createElement('div')
  card.id = 'help-card'
  const heading = document.createElement('h2')
  heading.textContent = CONFIG.help.title
  card.appendChild(heading)
  for (const line of CONFIG.help.lines) {
    const paragraph = document.createElement('p')
    paragraph.textContent = line
    card.appendChild(paragraph)
  }
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = CONFIG.help.close
  card.appendChild(closeButton)
  help.appendChild(card)

  document.body.append(panel, help)

  function paint() {
    snowButton.textContent = `Snowflakes: ${snow ? 'On' : 'Off'}`
    snowButton.dataset.on = String(snow)
    soundButton.textContent = `Sound: ${sound ? 'On' : 'Off'}`
    soundButton.dataset.on = String(sound)
    musicButton.textContent = `Music: ${music ? 'On' : 'Off'}`
    musicButton.dataset.on = String(music)
    help.classList.toggle('open', helpOpen)
  }

  function setTime(mode) {
    timeButton.textContent = `Time: ${mode.label}`
  }

  helpButton.addEventListener('click', () => {
    helpOpen = true
    paint()
    helpButton.blur()
  })
  closeButton.addEventListener('click', () => {
    helpOpen = false
    paint()
  })
  help.addEventListener('pointerdown', (event) => {
    if (event.target !== help) return
    helpOpen = false
    paint()
  })
  snowButton.addEventListener('click', () => {
    snow = !snow
    onToggleSnow(snow)
    paint()
    snowButton.blur()
  })
  timeButton.addEventListener('click', () => {
    setTime(onCycleTime())
    timeButton.blur()
  })
  resetButton.addEventListener('click', () => {
    onReset()
    resetButton.blur()
  })
  soundButton.addEventListener('click', () => {
    sound = !sound
    paint()
    soundButton.blur()
  })
  musicButton.addEventListener('click', () => {
    music = !music
    paint()
    musicButton.blur()
  })

  paint()

  return {
    isHelpOpen: () => helpOpen,
    setTime,
    applyDefaults(mode) {
      snow = CONFIG.snowflakes.enabled
      sound = CONFIG.audio.sound
      music = CONFIG.audio.music
      helpOpen = false
      setTime(mode)
      paint()
    },
  }
}

function addButton(panel, label) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  panel.appendChild(button)
  return button
}
