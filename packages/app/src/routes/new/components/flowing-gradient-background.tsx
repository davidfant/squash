import { useTheme } from "@/contexts/ThemeContext";
import { memo, useEffect, useRef } from "react";

/**
 * --- FlowingGradientBackground ---------------------------------------------
 * A self‑contained React component that renders an animated flowing gradient
 * background. It uses a WebGL fragment shader to generate smooth colour bands
 * driven by 3‑D simplex noise. If WebGL is unavailable, it gracefully falls
 * back to a static CSS linear‑gradient.
 * ---------------------------------------------------------------------------
 * Props
 *  - colors  : string[]  ‑ Array of hex colours used as stops in the gradient.
 *  - className: string    ‑ Additional class names appended to the <canvas>.
 *  - xScale  : number    ‑ Horizontal stretch factor applied in the shader.
 *  - scale   : number    ‑ Overall scale factor (zoom) for the noise field.
 *  - speed   : number    ‑ Animation speed multiplier.
 * ---------------------------------------------------------------------------
 */

// -----------------------------------------------------------------------------
//  Default configuration -------------------------------------------------------
// -----------------------------------------------------------------------------
const DEFAULT_LIGHT_COLORS = [
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#C679C4",
  "#FA3D1D",
  "#F7B801",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
  "#FBFAF9",
];
const DEFAULT_DARK_COLORS = [
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#091552", // darker gold
  "#3f1340", // muted purple
  "#54122d", // deep red
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
  "#000000",
];

// -----------------------------------------------------------------------------
//  Helper functions ------------------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * Converts a hexadecimal CSS colour (#rrggbb) to a normalised [0‑1] vec3.
 */
const hexToRgbNorm = (hex: string) => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
};

/**
 * Compiles a WebGL shader of given `type` (VERTEX_SHADER / FRAGMENT_SHADER).
 */
const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`WebGL shader compile error: ${log}`);
  }
  return shader;
};

/**
 * Links a WebGL program from vertex & fragment shader sources.
 */
const createProgram = (
  gl: WebGLRenderingContext,
  vertexSrc: string,
  fragmentSrc: string
) => {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`WebGL program link error: ${log}`);
  }

  // Shaders can be detached/deleted once linked.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
};

// -----------------------------------------------------------------------------
//  Shaders ---------------------------------------------------------------------
// -----------------------------------------------------------------------------

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5; // Map from [-1,1] ➜ [0,1]
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

/**
 * Assemble fragment shader source dynamically so we can inject an arbitrary
 * number of colour stops for the interpolation function.
 */
const buildFragmentShader = (colors: string[]) => {
  // Convert & declare colour constants ---------------------------------------
  const rgb = colors.map(hexToRgbNorm);
  const colourDecl = rgb
    .map(
      (c: { r: number; g: number; b: number }, idx: number) =>
        `vec3 COLOR${idx + 1} = vec3(${c.r.toFixed(6)}, ${c.g.toFixed(
          6
        )}, ${c.b.toFixed(6)});`
    )
    .join("\n");

  // Build colour‑selection if‑else chain (GLSL ES 1.00 has no switch) ---------
  const n = rgb.length;
  const elseChain = Array.from({ length: n - 1 }, (_, i) => {
    const c1 = `COLOR${i + 1}`;
    const c2 = `COLOR${i + 2}`;
    const cond = i === 0 ? "if" : "else if";
    return `${cond} (index == ${i}) {\n      return mix(${c1}, ${c2}, frac);\n    }`;
  }).join(" ");

  // Final colour constant for upper boundary.
  const lastColor = `COLOR${n}`;

  // Template ------------------------------------------------------------------
  return `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_xScale;
uniform float u_scale;
uniform float u_speed;
uniform float u_seed;

varying vec2 v_uv;

// ~~~ 3‑D simplex noise implementation ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
vec3  mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4  mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4  permute(vec4 x){return mod289(((x*34.)+1.)*x);} 
vec4  taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float simplex_noise(vec3 v){
  const vec2  C=vec2(1./6.,1./3.);
  const vec4  D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857; // 1/7
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy, h.x);
  vec3 p1=vec3(a0.zw, h.y);
  vec3 p2=vec3(a1.xy, h.z);
  vec3 p3=vec3(a1.zw, h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

// ~~~ Derived helpers ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const float N      = float(${n - 1}); // segments = colours‑1

${colourDecl}

float background_noise(vec2 p,float time){
  const float L = 0.0008;  // noise wavelength
  const float S = 0.13;    // temporal scale
  const float Y = 2.0;     // y‑axis stretch
  const float F = 0.11;    // drift factor
  float x = p.x * u_resolution.x / u_xScale / u_scale;
  float y = p.y * u_resolution.y * Y         / u_scale;
  float n = 0.5;
  float tt = time * u_speed + u_seed; // add random phase offset
  n += simplex_noise(vec3(x*L*1.0 , y*L*1.00, tt*S)) * 0.30;
  n += simplex_noise(vec3(x*L*0.6 + F*tt, y*L*0.85, tt*S)) * 0.26;
  n += simplex_noise(vec3(x*L*0.4 - F*tt*0.6, y*L*0.70, tt*S)) * 0.22;
  return clamp(n, 0.0, 1.0);
}

vec3 getColor(float t){
  if(${n} == 1) return COLOR1;
  float scaled = t * N;
  int   index  = int(floor(scaled));
  float frac   = scaled - float(index);
  if(index < 0)           return COLOR1;
  else if(index >= ${n - 1}) return ${lastColor};
  ${elseChain}
  return COLOR1; // fallback (should not hit)
}

void main(){
  float t  = pow(background_noise(v_uv, u_time), 1.2); // raise contrast
  vec3 col = getColor(t);
  gl_FragColor = vec4(col, 1.0);
}`;
};

// -----------------------------------------------------------------------------
//  Main component --------------------------------------------------------------
// -----------------------------------------------------------------------------

export const FlowingGradientBackground = memo(
  ({
    className = "",
    xScale = 1,
    scale = 1,
    speed = 1,
  }: {
    colors?: string[];
    className?: string;
    xScale?: number;
    scale?: number;
    speed?: number;
  }) => {
    const theme = useTheme();

    const colors =
      theme.theme === "dark" ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;
    // --- Refs ----------------------------------------------------------------
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const bufferRef = useRef<WebGLBuffer | null>(null);
    const uniformLoc = useRef<{
      u_time: WebGLUniformLocation | null;
      u_resolution: WebGLUniformLocation | null;
      u_xScale: WebGLUniformLocation | null;
      u_scale: WebGLUniformLocation | null;
      u_speed: WebGLUniformLocation | null;
      u_seed: WebGLUniformLocation | null;
    }>({
      u_time: null,
      u_resolution: null,
      u_xScale: null,
      u_scale: null,
      u_speed: null,
      u_seed: null,
    });
    const startTime = useRef(performance.now());
    const rafIdRef = useRef(0);
    const resizeTimer = useRef<NodeJS.Timeout | null>(null);
    const randomSeed = useRef(Math.random() * 1000);

    // -------------------------------------------------------------------------
    //  Effect: Initialise / re‑initialise when deps change ---------------------
    // -------------------------------------------------------------------------
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Reset random seed on dependency change so each mounting feels unique.
      randomSeed.current = Math.random() * 1000;

      // Obtain WebGL context ---------------------------------------------------
      const gl = canvas.getContext("webgl", {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
      });

      // Fallback: no WebGL -----------------------------------------------------
      if (!gl) {
        const stops = colors.join(", ");
        canvas.style.background = `linear-gradient(135deg, ${stops})`;
        canvas.style.opacity = "1";
        return; // ➜ no further processing
      }

      glRef.current = gl;

      // Build shaders ----------------------------------------------------------
      const fragmentShader = buildFragmentShader(colors);
      const program = createProgram(gl, VERTEX_SHADER, fragmentShader);
      programRef.current = program;

      // Upload a fullscreen triangle ------------------------------------------
      const vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
      const buffer = gl.createBuffer();
      bufferRef.current = buffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Bind attribute ---------------------------------------------------------
      const aPos = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Cache uniform locations -----------------------------------------------
      uniformLoc.current = {
        u_time: gl.getUniformLocation(program, "u_time"),
        u_resolution: gl.getUniformLocation(program, "u_resolution"),
        u_xScale: gl.getUniformLocation(program, "u_xScale"),
        u_scale: gl.getUniformLocation(program, "u_scale"),
        u_speed: gl.getUniformLocation(program, "u_speed"),
        u_seed: gl.getUniformLocation(program, "u_seed"),
      };

      // Handle resize ----------------------------------------------------------
      const resize = () => {
        const DPR = Math.min(window.devicePixelRatio || 1, 2);
        const widthPx = Math.max(1, canvas.clientWidth);
        const heightPx = Math.max(1, canvas.clientHeight);
        const w = Math.floor(widthPx * DPR);
        const h = Math.floor(heightPx * DPR);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, w, h);
        gl.useProgram(program);
        gl.uniform2f(uniformLoc.current.u_resolution, w, h);
      };
      resize(); // initial

      const debounceResize = () => {
        if (resizeTimer.current) clearTimeout(resizeTimer.current);
        resizeTimer.current = setTimeout(resize, 200);
      };
      window.addEventListener("resize", debounceResize);

      // Render loop ------------------------------------------------------------
      const render = () => {
        const now = (performance.now() - startTime.current) / 1000;
        gl.useProgram(program);

        const u = uniformLoc.current;
        gl.uniform1f(u.u_time, now);
        gl.uniform1f(u.u_xScale, xScale);
        gl.uniform1f(u.u_scale, scale);
        gl.uniform1f(u.u_speed, speed);
        gl.uniform1f(u.u_seed, randomSeed.current);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        rafIdRef.current = requestAnimationFrame(render);
      };
      rafIdRef.current = requestAnimationFrame(render);

      // Cleanup ---------------------------------------------------------------
      return () => {
        cancelAnimationFrame(rafIdRef.current);
        if (resizeTimer.current) clearTimeout(resizeTimer.current);
        window.removeEventListener("resize", debounceResize);

        if (gl && program) {
          gl.deleteBuffer(bufferRef.current);
          gl.deleteProgram(program);
        }
      };
    }, [colors, xScale, scale, speed]);

    // -------------------------------------------------------------------------
    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${className}`}
        aria-hidden="true"
      />
    );
  }
);
