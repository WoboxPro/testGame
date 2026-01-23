<template>
  <div class="test3">
    <div class="viewport" ref="viewportRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { World } from '../../../pixi_game2/pixigame/src/World.js'
import { Region } from '../../../pixi_game2/pixigame/src/Region.js'
import { Canvas, Camera } from '../../../pixi_game2/pixigame-renderer/src/index.js'
import { UITextEntity } from '../../../pixi_game2/pixigame/src/entities/UIEntities.js'
import { CameraController } from '../../../pixi_game2/pixigame/src/CameraController.js'

const viewportRef = ref(null)

let world = null
let canvas = null
let camera1 = null
let camera2 = null
let cameraController = null

async function init() {
  console.log('🚀 Starting test3...')

  // 1. Create World
  world = new World({
    id: 'test_world',
    type: 'bounded',
    width: 2000,
    height: 2000,
    backgroundColor: '#1a1a2e',
    showBounds: true,
    boundsColor: '#FF4444'
  })
  console.log('✅ World created:', world.id)

  // 2. Create Region
  const region = new Region({
    id: 'test_region',
    name: 'test_region_type',
    displayName: 'Test Region',
    worldId: world.id,
    bounds: {
      x: 200,
      y: 200,
      width: 600,
      height: 600,
      priority: 1
    },
    regionType: {
      name: 'test_region_type',
      displayName: 'Test Region Type',
      groundTexture: {
        textureUrl: '/assets/grass.png',
        scaleMode: 'tile',
        tint: null
      },
      borders: {
        enabled: true,
        color: '#00FFFF',
        width: 3,
        alpha: 1.0
      }
    }
  })
  world.regionSystem.addRegion(region)
  console.log('✅ Region created:', region.id)

  // 3. Create Canvas
  canvas = new Canvas({
    id: 'test_canvas',
    sizeMode: 'fixed',
    width: 800,
    height: 600,
    backgroundColor: '#0f0f0f'
  })
  console.log('✅ Canvas created:', canvas.id)

  // 4. Start Canvas
  await canvas.start(viewportRef.value)
  console.log('✅ Canvas started')

  // 5. Create Cameras
  camera1 = new Camera({
    id: 'test_camera_1',
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    anchor: 'center',
    focusX: 0,
    focusY: 0,
    zoom: 1.0,
    priority: 0,
    worldBackgroundColor: null,
    world: world,
    canvas: canvas
  })
  console.log('✅ Camera 1 created:', camera1.id)

  camera2 = new Camera({
    id: 'test_camera_2',
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    anchor: 'topleft',
    focusX: 500,
    focusY: 500,
    zoom: 1.0,
    priority: 1,
    worldBackgroundColor: null,
    world: world,
    canvas: canvas
  })
  console.log('✅ Camera 2 created:', camera2.id)

  // 6. Create Camera Controller (1235 movement, +- zoom)
  cameraController = new CameraController({
    id: 'test_camera_controller',
    type: 'camera',
    enabled: true,
    moveSpeed: 500,
    zoomSpeed: 2.0,
    minZoom: 0.1,
    maxZoom: 5.0,
    bindings: {
      move_up: { primary: 'Numpad5', secondary: null },
      move_down: { primary: 'Numpad2', secondary: null },
      move_left: { primary: 'Numpad1', secondary: null },
      move_right: { primary: 'Numpad3', secondary: null },
      zoom_in: { primary: 'NumpadAdd', secondary: null },
      zoom_out: { primary: 'NumpadSubtract', secondary: null },
      switch_target: { primary: 'Numpad0', secondary: null }
    }
  })
  cameraController.setAllCameras([camera1, camera2])
  cameraController.attachTo(camera1)
  console.log('✅ Camera Controller created')

  // 7. Add UI Entity
  const uiText = new UITextEntity({
    id: 'test_ui_text',
    position: { x: 50, y: 50 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    screenSpace: true,
    canvasId: canvas.id,
    text: {
      content: 'Hello from test3!\nControls: 1=left, 2=down, 5=up, 3=right\n+/- to zoom, Scroll to zoom\nNumpad0 to switch camera',
      fontSize: 20,
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'left'
    }
  })

  canvas.addUIEntity({
    id: uiText.id,
    subtype: 'text',
    bindingLabel: `canvas:${canvas.id}`,
    instance: uiText
  })
  console.log('✅ UI Entity added')

  // 8. Start render loop
  startRenderLoop()
}

function startRenderLoop() {
  function loop() {
    if (world) {
      world.update()
    }

    if (cameraController) {
      cameraController.update(1 / 60)
    }

    if (canvas) {
      try {
        canvas.render()
      } catch (e) {
        console.error('Render error:', e)
      }
    }

    requestAnimationFrame(loop)
  }

  loop()
  console.log('✅ Render loop started')
}

function onKeyDown(e) {
  console.log('Key down:', e.code)
  cameraController?.handleKeyDown?.(e.code)
}

function onKeyUp(e) {
  console.log('Key up:', e.code)
  cameraController?.handleKeyUp?.(e.code)
}

function onWheel(e) {
  const direction = e.deltaY > 0 ? -1 : 1
  const activeCamera = cameraController?.target || camera1
  const newZoom = Math.max(0.1, Math.min(5.0, activeCamera.zoom + direction * 0.1))
  activeCamera.setZoom(newZoom)
  e.preventDefault()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('wheel', onWheel)
  await init()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('wheel', onWheel)
  if (canvas) {
    canvas.destroy()
  }
})
</script>

<style scoped>
.test3 {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0a;
}

.viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
