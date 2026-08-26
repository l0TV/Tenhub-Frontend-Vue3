<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref(null)

const vertexShaderSource = `
  attribute vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

// Adapted from the supplied ShaderToy fragment shader for a native WebGL canvas.
const fragmentShaderSource = `
  precision highp float;

  #define NUM_LAYERS 13.0
  #define ITER 8

  uniform float iTime;
  uniform vec2 iResolution;

  vec4 tex(vec3 p) {
    float t = iTime + 78.0;
    vec4 o = vec4(p.xyz, 3.0 * sin(t * 0.1));
    vec4 dec = vec4(1.0, 0.9, 0.1, 0.15) + vec4(0.06 * cos(t * 0.1), 0.0, 0.0, 0.14 * cos(t * 0.23));

    for (int i = 0; i < ITER; i++) {
      o.xzyw = abs(o / dot(o, o) - dec);
    }

    return o;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
    vec3 col = vec3(0.0);
    float t = iTime * 0.3;

    for (int layer = 0; layer <= 16; layer++) {
      float i = float(layer) / NUM_LAYERS;
      float d = fract(i + t);
      float s = mix(5.0, 0.5, d);
      float f = d * smoothstep(1.0, 0.9, d);
      col += tex(vec3(uv * s, i * 4.0)).xyz * f;
    }

    col /= NUM_LAYERS;
    col *= vec3(2.0, 1.0, 2.0);
    col = pow(col, vec3(0.5));

    // ShaderToy ignores alpha for presentation; an opaque canvas is required in the DOM.
    gl_FragColor = vec4(col, 1.0);
  }
`

let animationFrame
let resizeObserver
let motionQuery
let motionChangeHandler
let gl
let program
let positionBuffer
let timeLocation
let resolutionLocation
let animationStart

function createShader(type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function createProgram() {
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

  if (!vertexShader || !fragmentShader) return null

  const shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    gl.deleteProgram(shaderProgram)
    return null
  }

  return shaderProgram
}

function draw(elapsedSeconds) {
  if (!gl || !program) return

  gl.useProgram(program)
  gl.uniform1f(timeLocation, elapsedSeconds)
  gl.uniform2f(resolutionLocation, canvas.value.width, canvas.value.height)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function resizeCanvas() {
  if (!canvas.value || !gl) return

  const { width, height } = canvas.value.getBoundingClientRect()
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  const nextWidth = Math.max(1, Math.round(width * pixelRatio))
  const nextHeight = Math.max(1, Math.round(height * pixelRatio))

  if (canvas.value.width !== nextWidth || canvas.value.height !== nextHeight) {
    canvas.value.width = nextWidth
    canvas.value.height = nextHeight
    gl.viewport(0, 0, nextWidth, nextHeight)
  }

  draw(motionQuery?.matches ? 0 : (performance.now() - animationStart) / 1000)
}

function animate(now) {
  draw((now - animationStart) / 1000)
  animationFrame = window.requestAnimationFrame(animate)
}

function updateAnimationPreference() {
  window.cancelAnimationFrame(animationFrame)
  animationStart = performance.now()
  resizeCanvas()

  if (!motionQuery.matches) {
    animationFrame = window.requestAnimationFrame(animate)
  }
}

onMounted(() => {
  gl = canvas.value?.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
  })

  if (!gl) return

  program = createProgram()
  if (!program) {
    gl = null
    return
  }

  const positionLocation = gl.getAttribLocation(program, 'aPosition')
  timeLocation = gl.getUniformLocation(program, 'iTime')
  resolutionLocation = gl.getUniformLocation(program, 'iResolution')
  positionBuffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  animationStart = performance.now()
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionChangeHandler = updateAnimationPreference
  motionQuery.addEventListener('change', motionChangeHandler)
  resizeObserver = new ResizeObserver(resizeCanvas)
  resizeObserver.observe(canvas.value)
  updateAnimationPreference()
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  motionQuery?.removeEventListener('change', motionChangeHandler)

  if (gl) {
    if (positionBuffer) gl.deleteBuffer(positionBuffer)
    if (program) gl.deleteProgram(program)
  }
})
</script>

<template>
  <canvas ref="canvas" class="auth-shader-canvas" aria-hidden="true"></canvas>
</template>

<style scoped>
.auth-shader-canvas {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  background: #17091f;
}
</style>
