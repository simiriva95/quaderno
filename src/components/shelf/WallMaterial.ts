import { Color, ShaderMaterial, Vector2 } from 'three'
import { cssVar } from '../../lib/covers'

export const MAX_SHELVES = 8

/** L'intonaco dietro la mensola, in GLSL: gradiente verticale nei toni della
 *  stanza, grana fine a due ottave, vignetta ai bordi, una chiazza calda in
 *  alto a sinistra (la finestra) e un'ombra morbida sotto ogni ripiano.
 *  È un fondale: non riceve ombre proiettate, le dipinge. */
export function makeWallMaterial(
  shelfY: number[],
  halfWidth: number,
  dark: boolean,
): ShaderMaterial {
  const ys = new Array<number>(MAX_SHELVES).fill(0)
  shelfY.slice(0, MAX_SHELVES).forEach((y, i) => (ys[i] = y))

  return new ShaderMaterial({
    uniforms: {
      uTop: { value: new Color(cssVar('--c-paper-warm')) },
      uMid: { value: new Color(cssVar('--c-wall')) },
      uBottom: { value: new Color(cssVar('--c-desk-deep')) },
      uShelfY: { value: ys },
      uShelves: { value: Math.min(shelfY.length, MAX_SHELVES) },
      uHalfWidth: { value: halfWidth },
      // di giorno la finestra, fuori campo a sinistra; di sera la lampada da
      // scrivania, a destra: il muro è un fondale e la luce gliela dipingiamo
      uGlowPos: { value: dark ? new Vector2(1.9, 0.7) : new Vector2(-2.4, 1.6) },
      uGlowColor: { value: dark ? new Color('#FFB570') : new Color('#FFF0D6') },
      uGlowStrength: { value: dark ? 0.16 : 0.07 },
      uVignette: { value: dark ? 0.32 : 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPos;
      void main() {
        vUv = uv;
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBottom;
      uniform float uShelfY[${MAX_SHELVES}];
      uniform int uShelves;
      uniform float uHalfWidth;
      uniform vec2 uGlowPos;
      uniform vec3 uGlowColor;
      uniform float uGlowStrength;
      uniform float uVignette;
      varying vec2 vUv;
      varying vec3 vPos;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y);
      }

      void main() {
        // gradiente a tre fermate: la luce viene dall'alto
        float t = clamp(vPos.y * 0.16 + 0.55, 0.0, 1.0);
        vec3 c = t > 0.5 ? mix(uMid, uTop, (t - 0.5) * 2.0) : mix(uBottom, uMid, t * 2.0);

        // intonaco: grana fine, appena visibile
        float n = noise(vPos.xy * 22.0) * 0.55 + noise(vPos.xy * 71.0) * 0.45;
        c *= 1.0 + (n - 0.5) * 0.05;

        // la chiazza di luce: finestra o lampada, a seconda dell'ora
        float w = exp(-length((vPos.xy - uGlowPos) * vec2(0.42, 0.55)));
        c += uGlowColor * w * uGlowStrength;

        // vignetta: la stanza si scurisce verso i bordi
        vec2 d = (vUv - 0.5) * vec2(1.6, 1.0);
        c *= 1.0 - dot(d, d) * uVignette;

        // ombra morbida sotto ogni ripiano, più densa al centro della tavola
        for (int i = 0; i < ${MAX_SHELVES}; i++) {
          if (i >= uShelves) break;
          float dy = uShelfY[i] - vPos.y;
          float band = smoothstep(-0.02, 0.06, dy) * (1.0 - smoothstep(0.06, 0.62, dy));
          float across = 1.0 - smoothstep(uHalfWidth * 0.9, uHalfWidth * 1.08, abs(vPos.x));
          c *= 1.0 - 0.2 * band * across;
        }

        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}
