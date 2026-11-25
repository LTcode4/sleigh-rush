import { BackSide, Color, ShaderMaterial, Side, Vector2, Vector3 } from 'three';

export const CLEAR_COLOR = 0x000000;

export const sceneUniforms = {
  light: { value: new Vector3(0, 2, 0) },
  lightPower: { value: 1 },
  sky: { value: 0.45 },
  fade: { value: 1 },
  fogNear: { value: 26 },
  fogFar: { value: 64 },
  bend: { value: new Vector2(0, 0.0016) },
  inkDark: { value: new Color(CLEAR_COLOR) },
  inkWhite: { value: new Color(0xffffff) },
  inkRed: { value: new Color(0xe8413c) },
  inkGold: { value: new Color(0xffd36b) },
  inkGreen: { value: new Color(0x3fae5a) },
  inkWood: { value: new Color(0xa8693a) },
  time: { value: 0 },
};

export function bendPoint(p: Vector3, cameraZ: number) {
  const dz = Math.max(0, cameraZ - p.z);
  const { bend } = sceneUniforms;
  p.x += bend.value.x * dz * dz;
  p.y -= bend.value.y * dz * dz;
  return p;
}

const VERTEX = `
uniform vec2 bend;
varying vec3 vWorldPos;
varying vec3 vNormal;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 wp = modelMatrix * p;
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  float dz = max(0.0, cameraPosition.z - wp.z);
  wp.x += bend.x * dz * dz;
  wp.y -= bend.y * dz * dz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAGMENT_COMMON = `
uniform vec3 light;
uniform float lightPower;
uniform float sky;
uniform float fade;
uniform float fogNear;
uniform float fogFar;
uniform vec3 inkDark;
uniform vec3 inkWhite;
uniform vec3 inkRed;
uniform vec3 inkGold;
uniform vec3 inkGreen;
uniform vec3 inkWood;
varying vec3 vWorldPos;
varying vec3 vNormal;

float bayer2(float x, float y) { return x * 2.0 + y * 3.0 - x * y * 4.0; }

float bayerThreshold() {
  vec2 p = floor(gl_FragCoord.xy);
  float x0 = mod(p.x, 2.0);
  float y0 = mod(p.y, 2.0);
  float x1 = mod(floor(p.x / 2.0), 2.0);
  float y1 = mod(floor(p.y / 2.0), 2.0);
  return (bayer2(x0, y0) * 4.0 + bayer2(x1, y1) + 0.5) / 16.0;
}

vec2 lighting(float albedo, float emissive) {
  vec3 n = normalize(vNormal);
  vec3 toLight = light - vWorldPos;
  float dist = length(toLight);
  float lambert = max(dot(n, toLight / dist), 0.0) * 0.82 + 0.18;
  float lamp = lightPower * 2.2 / (dist * dist * 0.08 + 1.0) * lambert;
  float moon = (max(dot(n, vec3(-0.45, 0.8, 0.4)), 0.0) * 0.95 + 0.12) * sky;
  float lit = albedo * (lamp + moon) + emissive;
  vec3 view = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 2.5) * (1.0 - abs(n.y));
  lit *= 1.0 - rim * 0.5;
  float near = clamp(lightPower * 1.4 / (dist * dist * 0.06 + 1.0), 0.0, 1.0);
  float warm = albedo * lamp / max(lit, 0.001) * near;
  float fog = 1.0 - smoothstep(fogNear, fogFar, length(vWorldPos - cameraPosition));
  return vec2(clamp(lit * fog * fade, 0.0, 1.0), warm);
}

vec3 shade(vec2 l, float flag, float t) {
  vec3 ink = inkWhite;
  if (flag > 3.5) ink = inkWood;
  else if (flag > 2.5) ink = inkGreen;
  else if (flag > 1.5) ink = inkGold;
  else if (flag > 0.5) ink = inkRed;
  else if (flag > -0.5 && l.y > 1.0 - t) ink = inkGold;
  return mix(inkDark, ink, step(t, l.x));
}
`;

const DITHER_FRAGMENT = `
${FRAGMENT_COMMON}
uniform vec3 uParams;
uniform float uOpacity;
void main() {
  float t = bayerThreshold();
  if (uOpacity < t) discard;
  gl_FragColor = vec4(shade(lighting(uParams.x, uParams.y), uParams.z, t), 1.0);
  #include <colorspace_fragment>
}
`;

const GROUND_FRAGMENT = `
${FRAGMENT_COMMON}
uniform float roadHalf;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float t = bayerThreshold();
  vec2 w = vWorldPos.xz;
  float ax = abs(w.x);
  float albedo;
  float emissive = 0.0;
  if (ax < roadHalf) {
    albedo = 0.3 + (hash(floor(w * vec2(1.6, 0.7))) - 0.5) * 0.22;
    albedo *= mix(0.2, 1.0, smoothstep(0.06, 0.18, abs(ax - 0.72)));
  } else if (ax < roadHalf + 0.7) {
    albedo = 0.95;
  } else {
    float h = hash(floor(w * 3.0));
    albedo = 0.5 + (h - 0.5) * 0.12;
    emissive = step(0.985, h) * 1.2;
  }
  gl_FragColor = vec4(shade(lighting(albedo, emissive), 0.0, t), 1.0);
  #include <colorspace_fragment>
}
`;

const GIFT_FRAGMENT = `
${FRAGMENT_COMMON}
uniform vec3 uParams;
uniform float uGlow;
uniform float time;
void main() {
  vec3 ink = inkWhite;
  float flag = uParams.z;
  if (flag > 3.5) ink = inkWood;
  else if (flag > 2.5) ink = inkGreen;
  else if (flag > 1.5) ink = inkGold;
  else if (flag > 0.5) ink = inkRed;
  float breath = uGlow * (0.5 + 0.5 * sin(time * 7.0));

  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(vec3(-0.45, 0.85, 0.0) + v * 0.75);
  float diff = max(dot(n, L), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);
  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 18.0);
  float fog = 1.0 - smoothstep(fogNear, fogFar, length(vWorldPos - cameraPosition));
  float k = fog * fade;
  float lum = clamp((0.2 + diff * 0.9 - rim * 0.4) * k, 0.0, 1.0);

  vec2 q = mod(floor(gl_FragCoord.xy), 4.0) + 0.5;
  float d = length(q - vec2(1.5));
  float r = 0.6 + lum * 1.0 + breath * 0.5 + uGlow * 0.3;

  vec3 col = ink * (0.06 + breath * 0.18) * k;
  if (d <= r) col = mix(ink, inkWhite, breath * 0.3) * k;
  if (d <= r && spec > 0.5) col = inkWhite * k;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const GLOW_FRAGMENT = `
${FRAGMENT_COMMON}
uniform vec3 uParams;
uniform float time;
void main() {
  vec3 ink = inkWhite;
  float flag = uParams.z;
  if (flag > 2.5) ink = inkGreen;
  else if (flag > 1.5) ink = inkGold;
  else if (flag > 0.5) ink = inkRed;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorldPos);
  float core = pow(abs(dot(n, v)), 1.5);
  float breath = 0.55 + 0.45 * sin(time * 7.0);
  float fog = 1.0 - smoothstep(fogNear, fogFar, length(vWorldPos - cameraPosition));
  vec2 q = mod(floor(gl_FragCoord.xy), 4.0) + 0.5;
  float d = length(q - vec2(1.5));
  float r = core * breath * 1.7 * fog * fade;
  if (d > r || r < 0.45) discard;
  gl_FragColor = vec4(mix(ink, inkWhite, 0.35) * fade, 1.0);
  #include <colorspace_fragment>
}
`;

const SHADOW_FRAGMENT = `
${FRAGMENT_COMMON}
uniform vec3 uCenter;
uniform vec2 uRadius;
uniform float uStrength;
void main() {
  float t = bayerThreshold();
  vec2 d = (vWorldPos.xz - uCenter.xz) / uRadius;
  float r = length(d);
  float a = (1.0 - smoothstep(0.15, 1.0, r)) * uStrength * fade;
  if (a < t) discard;
  gl_FragColor = vec4(inkDark, 1.0);
  #include <colorspace_fragment>
}
`;

const BLOB_VERTEX = `
uniform vec2 bend;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vLocal;
void main() {
  vLocal = position.xz;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
  #endif
  vec4 wp = modelMatrix * p;
  vWorldPos = wp.xyz;
  vNormal = vec3(0.0, 1.0, 0.0);
  float dz = max(0.0, cameraPosition.z - wp.z);
  wp.x += bend.x * dz * dz;
  wp.y -= bend.y * dz * dz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const BLOB_FRAGMENT = `
${FRAGMENT_COMMON}
uniform float uStrength;
uniform float uRadius;
varying vec2 vLocal;
void main() {
  float t = bayerThreshold();
  float fog = 1.0 - smoothstep(fogNear, fogFar, length(vWorldPos - cameraPosition));
  float a = (1.0 - smoothstep(0.25, 1.0, length(vLocal) / uRadius)) * uStrength * fade * fog;
  if (a < t) discard;
  gl_FragColor = vec4(inkDark, 1.0);
  #include <colorspace_fragment>
}
`;

export type Tint = 'white' | 'red' | 'gold' | 'green' | 'wood';

export interface DitherMaterialOptions {
  albedo?: number;
  emissive?: number;
  opacity?: number;
  side?: Side;
  tint?: Tint;
  warm?: boolean;
  glow?: boolean;
}

function flagOf(opts: DitherMaterialOptions) {
  const tints: Record<Tint, number> = { white: 0, red: 1, gold: 2, green: 3, wood: 4 };
  if (opts.tint && opts.tint !== 'white') return tints[opts.tint];
  return opts.warm === false ? -1 : 0;
}

export function createDitherMaterial(opts: DitherMaterialOptions = {}): ShaderMaterial {
  const material = new ShaderMaterial({
    uniforms: {
      ...sceneUniforms,
      uParams: { value: new Vector3(opts.albedo ?? 0.8, opts.emissive ?? 0, flagOf(opts)) },
      uOpacity: { value: opts.opacity ?? 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: DITHER_FRAGMENT,
  });
  if (opts.side !== undefined) material.side = opts.side;
  return material;
}

export function setDitherOpacity(material: ShaderMaterial, opacity: number) {
  material.uniforms.uOpacity.value = opacity;
}

export function setDitherEmissive(material: ShaderMaterial, emissive: number) {
  material.uniforms.uParams.value.y = emissive;
}

export function createGiftMaterial(opts: DitherMaterialOptions = {}) {
  return new ShaderMaterial({
    uniforms: {
      ...sceneUniforms,
      uParams: { value: new Vector3(opts.albedo ?? 0.9, opts.emissive ?? 0, flagOf(opts)) },
      uGlow: { value: opts.glow ? 1 : 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: GIFT_FRAGMENT,
  });
}

export function createGiftGlowMaterial(tint: Tint) {
  return new ShaderMaterial({
    uniforms: {
      ...sceneUniforms,
      uParams: { value: new Vector3(0, 0, flagOf({ tint })) },
    },
    vertexShader: VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    side: BackSide,
  });
}

export function createShadowMaterial() {
  return new ShaderMaterial({
    uniforms: {
      ...sceneUniforms,
      uCenter: { value: new Vector3() },
      uRadius: { value: new Vector2(1, 1) },
      uStrength: { value: 0.6 },
    },
    vertexShader: VERTEX,
    fragmentShader: SHADOW_FRAGMENT,
  });
}

export function createBlobShadowMaterial(strength = 0.55, radius = 1) {
  return new ShaderMaterial({
    uniforms: {
      ...sceneUniforms,
      uStrength: { value: strength },
      uRadius: { value: radius },
    },
    vertexShader: BLOB_VERTEX,
    fragmentShader: BLOB_FRAGMENT,
  });
}

export function createGroundMaterial(roadHalf: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...sceneUniforms, roadHalf: { value: roadHalf } },
    vertexShader: VERTEX,
    fragmentShader: GROUND_FRAGMENT,
  });
}

export function createOutlineMaterial(): ShaderMaterial {
  return createDitherMaterial({ albedo: 0, emissive: 0, side: BackSide });
}
