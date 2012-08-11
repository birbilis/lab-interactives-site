(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

/*jslint indent: 2 */
//
// energy2d-module.js
//

// Module definition and namespace helper function.

energy2d = { VERSION: "0.1.0" };

energy2d.namespace = function (ns_string) {
  'use strict';
  var
    parts = ns_string.split('.'),
    parent = energy2d,
    i;
  // Strip redundant leading global.
  if (parts[0] === "energy2d") {
    parts = parts.slice(1);
  }
  for (i = 0; i < parts.length; i += 1) {
    // Create a property if it doesn't exist.
    if (typeof parent[parts[i]] === "undefined") {
      parent[parts[i]] = {};
    }
    parent = parent[parts[i]];
  }
  return parent;
};
var lab = lab || {};
lab.glsl = {};

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/apply-buoyancy.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float g;\n\
uniform float b;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    float t = texture2D(data0_tex, coord).r;\n\
    // Get average column temperature.\n\
\n\
    float avg_t = t;\n\
    float count = 1.0;\n\
    vec2 n_coord = coord - dx;\n\
    // Silly while(true) loop (almost).\n\
    // While loops are not allowed.\n\
    // For loops with non-constant expressions also.\n\
    for (int i = 1; i != 0; i++) {\n\
      if (n_coord.x > 0.0 && texture2D(data1_tex, n_coord).a == 1.0) {\n\
        avg_t += texture2D(data0_tex, n_coord).r;\n\
        count += 1.0;\n\
        n_coord -= dx;\n\
      } else {\n\
        break;\n\
      }\n\
    }\n\
    n_coord = coord + dx;\n\
    // Silly while(true) loop (almost).\n\
    // While loops are not allowed.\n\
    // For loops with non-constant expressions also.\n\
    for (int i = 1; i != 0; i++) {\n\
      if (n_coord.x < 1.0 && texture2D(data1_tex, n_coord).a == 1.0) {\n\
        avg_t += texture2D(data0_tex, n_coord).r;\n\
        count += 1.0;\n\
        n_coord += dx;\n\
      } else {\n\
        break;\n\
      }\n\
    }\n\
    avg_t /= count;\n\
\n\
    // Update velocity V component.\n\
    data2.g += (g - b) * t + b * avg_t;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/apply-u0v0-boundary.fs.glsl'] = '\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  // Process corners.\n\
  // TODO: values from previous step are used for corners.\n\
  if (coord.x < grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.ba = 0.5 * (data2_p_dy.ba + data2_p_dx.ba);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.ba = 0.5 * (data2_p_dy.ba + data2_m_dx.ba);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.ba = 0.5 * (data2_m_dy.ba + data2_m_dx.ba);\n\
  }\n\
  else if (coord.x < grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.ba = 0.5 * (data2_m_dy.ba + data2_p_dx.ba);\n\
  }\n\
  // Process boundaries.\n\
  // Left.\n\
  else if (coord.x < grid.x) {\n\
    data2.ba = texture2D(data2_tex, coord + dx).ba;\n\
  }\n\
  // Right.\n\
  else if (coord.x > 1.0 - grid.x) {\n\
    data2.ba = texture2D(data2_tex, coord - dx).ba;\n\
  }\n\
  // Down.\n\
  else if (coord.y < grid.y) {\n\
    data2.ba = texture2D(data2_tex, coord + dy).ba;\n\
  }\n\
  // Up.\n\
  else if (coord.y > 1.0 - grid.y) {\n\
    data2.ba = texture2D(data2_tex, coord - dy).ba;\n\
  }\n\
  \n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/apply-uv-boundary.fs.glsl'] = '\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  // Process corners.\n\
  // TODO: values from previous step are used for corners.\n\
  if (coord.x < grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.rg = 0.5 * (data2_p_dy.rg + data2_p_dx.rg);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.rg = 0.5 * (data2_p_dy.rg + data2_m_dx.rg);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.rg = 0.5 * (data2_m_dy.rg + data2_m_dx.rg);\n\
  }\n\
  else if (coord.x < grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.rg = 0.5 * (data2_m_dy.rg + data2_p_dx.rg);\n\
  }\n\
  // Process boundaries.\n\
  // Left.\n\
  else if (coord.x < grid.x) {\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.rg = vec2(data2_p_dx.r, -data2_p_dx.g);\n\
  }\n\
  // Right.\n\
  else if (coord.x > 1.0 - grid.x) {\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.rg = vec2(data2_m_dx.r, -data2_m_dx.g);\n\
  }\n\
  // Down.\n\
  else if (coord.y < grid.y) {\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    data2.rg = vec2(-data2_p_dy.r, data2_p_dy.g);\n\
  }\n\
  // Up.\n\
  else if (coord.y > 1.0 - grid.y) {\n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    data2.rg = vec2(-data2_m_dy.r, data2_m_dy.g);\n\
  }\n\
  \n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/basic.vs.glsl'] = '\
varying vec2 coord;\n\
\n\
void main() {\n\
  coord = gl_Vertex.xy * 0.5 + 0.5;\n\
  gl_Position = vec4(gl_Vertex.xy, 0.0, 1.0);\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/conserve-step1.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float i2dx;\n\
uniform float i2dy;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    \n\
    // Phi.\n\
    data2.b = 0.0;\n\
    // Div.\n\
    data2.a = (data2_p_dy.r - data2_m_dy.r) * i2dx + (data2_p_dx.g - data2_m_dx.g) * i2dy;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/conserve-step2.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float s;\n\
uniform float idxsq;\n\
uniform float idysq;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    \n\
    // Phi.\n\
    data2.b = s * ((data2_m_dy.b + data2_p_dy.b) * idxsq + (data2_m_dx.b + data2_p_dx.b) * idysq - data2.a);\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/conserve-step3.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float i2dx;\n\
uniform float i2dy;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    \n\
    // U.\n\
    data2.r -= (data2_p_dy.b - data2_m_dy.b) * i2dx;\n\
    // V.\n\
    data2.g -= (data2_p_dx.b - data2_m_dx.b) * i2dy;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/diffuse.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float hx;\n\
uniform float hy;\n\
uniform float dn;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    // Update velocity UV components.\n\
    data2.rg = (data2.ba + hx * (data2_m_dy.rg + data2_p_dy.rg)\n\
                         + hy * (data2_m_dx.rg + data2_p_dx.rg)) * dn;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/maccormack-step1.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    // Update velocity UV components.\n\
    data2.rg = data2.ba - tx * (data2_p_dy.bb * data2_p_dy.ba - data2_m_dy.bb * data2_m_dy.ba)\n\
              - ty * (data2_p_dx.aa * data2_p_dx.ba - data2_m_dx.aa * data2_m_dx.ba);\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/maccormack-step2.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    // Update velocity UV components.\n\
    data2.rg = 0.5 * (data2.ba + data2.rg) \n\
            - 0.5 * tx * data2.bb * (data2_p_dy.rg - data2_m_dy.rg)\n\
            - 0.5 * ty * data2.aa * (data2_p_dx.rg - data2_m_dx.rg);\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/set-obstacle-boundary.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 0.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
\n\
    if (texture2D(data1_tex, coord - dy).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord - dy).ba;\n\
    } \n\
    else if (texture2D(data1_tex, coord + dy).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord + dy).ba;\n\
    } \n\
\n\
    if (texture2D(data1_tex, coord - dx).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord - dx).ba;\n\
    } \n\
    else if (texture2D(data1_tex, coord + dx).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord + dx).ba;\n\
    } \n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/set-obstacle-velocity.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
// texture 3: \n\
// - R: uWind\n\
// - G: vWind\n\
// - B: undefined\n\
// - A: undefined\n\
uniform sampler2D data3_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
\n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 0.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
\n\
    int count = 0;\n\
\n\
    if (texture2D(data1_tex, coord - dy).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_m_dy = texture2D(data2_tex, coord - dy).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(-data2_m_dy.r, data2_m_dy.g);\n\
    } \n\
    else if (texture2D(data1_tex, coord + dy).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_p_dy = texture2D(data2_tex, coord + dy).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(-data2_p_dy.r, data2_p_dy.g);\n\
    } \n\
\n\
    if (texture2D(data1_tex, coord - dx).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_m_dx = texture2D(data2_tex, coord - dx).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(data2_m_dx.r, -data2_m_dx.g);\n\
    } \n\
    else if (texture2D(data1_tex, coord + dx).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_p_dx = texture2D(data2_tex, coord + dx).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(data2_p_dx.r, -data2_p_dx.g);\n\
    } \n\
\n\
    if (count == 0) {\n\
      data2.rg = texture2D(data3_tex, coord).rg;\n\
    }\n\
  }\n\
  \n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/uv-to-u0v0.fs.glsl'] = '\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
	vec4 data2 = texture2D(data2_tex, coord);\n\
	data2.ba = data2.rg;\n\
	gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/basic.vs.glsl'] = '\
varying vec2 coord;\n\
\n\
void main() {\n\
  coord = gl_Vertex.xy * 0.5 + 0.5;\n\
  gl_Position = vec4(gl_Vertex.xy, 0.0, 1.0);\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/force-flux-t.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
uniform float delta_x;\n\
uniform float delta_y;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  if (coord.x < grid.x) {\n\
    data0.r = texture2D(data0_tex, coord + dx).r\n\
            + vN * delta_y / data0.a;\n\
  } else if (coord.x > 1.0 - grid.x) {\n\
    data0.r = texture2D(data0_tex, coord - dx).r\n\
            - vS * delta_y / data0.a;\n\
  } else if (coord.y < grid.y) {\n\
    data0.r = texture2D(data0_tex, coord + dy).r\n\
            - vW * delta_x / data0.a;\n\
  } else if (coord.y > 1.0 - grid.y) {\n\
    data0.r = texture2D(data0_tex, coord - dy).r\n\
            + vE * delta_x / data0.a;\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/force-flux-t0.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
uniform float delta_x;\n\
uniform float delta_y;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  if (coord.x < grid.x) {\n\
    data0.g = texture2D(data0_tex, coord + dx).r\n\
            + vN * delta_y / data0.a;\n\
  } else if (coord.x > 1.0 - grid.x) {\n\
    data0.g = texture2D(data0_tex, coord - dx).r\n\
            - vS * delta_y / data0.a;\n\
  } else if (coord.y < grid.y) {\n\
    data0.g = texture2D(data0_tex, coord + dy).r\n\
            - vW * delta_x / data0.a;\n\
  } else if (coord.y > 1.0 - grid.y) {\n\
    data0.g = texture2D(data0_tex, coord - dy).r\n\
            + vE * delta_x / data0.a;\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/maccormack-step1.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
// Boundary conditions uniforms.\n\
uniform float enforce_temp;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y) {\n\
    \n\
    float fluidity = texture2D(data1_tex, coord).a;\n\
    if (fluidity == 1.0) {\n\
      vec2 dx = vec2(grid.x, 0.0);\n\
      vec2 dy = vec2(0.0, grid.y);\n\
\n\
      // Temperature.\n\
      float t_m_dy = texture2D(data0_tex, coord - dy).r;\n\
      float t_p_dy = texture2D(data0_tex, coord + dy).r;\n\
      float t_m_dx = texture2D(data0_tex, coord - dx).r;\n\
      float t_p_dx = texture2D(data0_tex, coord + dx).r;\n\
      // Velocity.\n\
      float u_m_dy = texture2D(data2_tex, coord - dy).r;\n\
      float u_p_dy = texture2D(data2_tex, coord + dy).r;\n\
      float v_m_dx = texture2D(data2_tex, coord - dx).g;\n\
      float v_p_dx = texture2D(data2_tex, coord + dx).g;\n\
      // Update T0.\n\
      data0.g = data0.r - tx * (u_p_dy * t_p_dy - u_m_dy * t_m_dy)\n\
                        - ty * (v_p_dx * t_p_dx - v_m_dx * t_m_dx);\n\
    }\n\
  } else if (enforce_temp == 1.0) {\n\
    // "temperature at border" boundary conditions are\n\
    // integrated into this shader.\n\
    if (coord.x < grid.x) {\n\
      data0.g = vN;\n\
    } else if (coord.x > 1.0 - grid.x) {\n\
      data0.g = vS;\n\
    } else if (coord.y < grid.y) {\n\
      data0.g = vW;\n\
    } else if (coord.y > 1.0 - grid.y) {\n\
      data0.g = vE;\n\
    }\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/maccormack-step2.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
// Boundary conditions uniforms.\n\
uniform float enforce_temp;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y) {\n\
    \n\
    float fluidity = texture2D(data1_tex, coord).a;\n\
    if (fluidity == 1.0) {\n\
      vec2 dx = vec2(grid.x, 0.0);\n\
      vec2 dy = vec2(0.0, grid.y);\n\
\n\
      // Temperature t0.\n\
      float t0_m_dy = texture2D(data0_tex, coord - dy).g;\n\
      float t0_p_dy = texture2D(data0_tex, coord + dy).g;\n\
      float t0_m_dx = texture2D(data0_tex, coord - dx).g;\n\
      float t0_p_dx = texture2D(data0_tex, coord + dx).g;\n\
      // Velocity.\n\
      float u = texture2D(data2_tex, coord).r;\n\
      float v = texture2D(data2_tex, coord).g;\n\
      // Update T.\n\
      data0.r = 0.5 * (data0.r + data0.g)\n\
              - 0.5 * tx * u * (t0_p_dy - t0_m_dy)\n\
              - 0.5 * ty * v * (t0_p_dx - t0_m_dx);\n\
    }\n\
  } else if (enforce_temp == 1.0) {\n\
    // "temperature at border" boundary conditions are\n\
    // integrated into this shader.\n\
    if (coord.x < grid.x) {\n\
      data0.r = vN;\n\
    } else if (coord.x > 1.0 - grid.x) {\n\
      data0.r = vS;\n\
    } else if (coord.y < grid.y) {\n\
      data0.r = vW;\n\
    } else if (coord.y > 1.0 - grid.y) {\n\
      data0.r = vE;\n\
    }\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/solver.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float hx;\n\
uniform float hy;\n\
uniform float inv_timestep;\n\
\n\
// Boundary conditions uniforms\n\
uniform float enforce_temp;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y) {\n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    float tb = data0.b;\n\
    // Check if tb is NaN. isnan() function is not available\n\
    // in OpenGL ES GLSL, so use some tricks. IEEE 754 spec defines\n\
    // that NaN != NaN, however this seems to not work on Windows.\n\
    // So, also check if the value is outside [-3.4e38, 3.4e38] (3.4e38\n\
    // is close to 32Float max value), as such values are not expected.\n\
    if (tb != tb || tb < -3.4e38 || tb > 3.4e38) {\n\
      vec4 data1 = texture2D(data1_tex, coord);\n\
      vec4 data0_m_dy = texture2D(data0_tex, coord - dy);\n\
      vec4 data0_p_dy = texture2D(data0_tex, coord + dy);\n\
      vec4 data0_m_dx = texture2D(data0_tex, coord - dx);\n\
      vec4 data0_p_dx = texture2D(data0_tex, coord + dx);\n\
      float sij = data1.g * data1.b * inv_timestep;\n\
      float rij = data0.a;\n\
      float axij = hx * (rij + data0_m_dy.a);\n\
      float bxij = hx * (rij + data0_p_dy.a);\n\
      float ayij = hy * (rij + data0_m_dx.a);\n\
      float byij = hy * (rij + data0_p_dx.a);\n\
      data0.r = (data0.g * sij + data1.r\n\
                 + axij * data0_m_dy.r\n\
                 + bxij * data0_p_dy.r\n\
                 + ayij * data0_m_dx.r\n\
                 + byij * data0_p_dx.r)\n\
                 / (sij + axij + bxij + ayij + byij);\n\
    } else {\n\
      data0.r = tb;\n\
    }\n\
  } else if (enforce_temp == 1.0) {\n\
    // "temperature at border" boundary conditions are\n\
    // integrated into this shader.\n\
    if (coord.x < grid.x) {\n\
      data0.r = vN;\n\
    } else if (coord.x > 1.0 - grid.x) {\n\
      data0.r = vS;\n\
    } else if (coord.y < grid.y) {\n\
      data0.r = vW;\n\
    } else if (coord.y > 1.0 - grid.y) {\n\
      data0.r = vE;\n\
    }\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/t-to-t0.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
	vec4 data0 = texture2D(data0_tex, coord);\n\
	data0.g = data0.r;\n\
	gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/heatmap-webgl-glsl/basic.vs.glsl'] = '\
varying vec2 coord;\n\
\n\
void main() {\n\
  coord = gl_TexCoord.xy;\n\
  gl_Position = vec4(gl_Vertex.xyz, 1.0);\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/heatmap-webgl-glsl/temp-renderer.fs.glsl'] = '\
// Provided textur contains temperature data in R channel.\n\
uniform sampler2D heatmap_tex;\n\
uniform sampler2D palette_tex;\n\
\n\
uniform float max_temp;\n\
uniform float min_temp;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  float temp = texture2D(heatmap_tex, coord).r;\n\
  float scaled_temp = (temp - min_temp) / (max_temp - min_temp);\n\
  gl_FragColor = texture2D(palette_tex, vec2(scaled_temp, 0.5));\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/vectormap-webgl-glsl/vectormap.fs.glsl'] = '\
uniform vec4 color;\n\
\n\
void main() {\n\
  gl_FragColor = color;\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/vectormap-webgl-glsl/vectormap.vs.glsl'] = '\
// Provided texture contains vector data in RG channels.\n\
attribute vec2 origin;\n\
\n\
uniform sampler2D vectormap_tex;\n\
uniform float base_length;\n\
uniform float vector_scale;\n\
uniform vec2 scale;\n\
\n\
void main() {\n\
  // Read vector which should be visualized.\n\
  vec2 vec = texture2D(vectormap_tex, gl_TexCoord.xy).xy;\n\
  vec.y = -vec.y;\n\
\n\
  if (length(vec) < 1e-15) {\n\
    // Do not draw to small vectors.\n\
    // Set position outside [-1, 1] region, which is rendered.\n\
    gl_Position = vec4(2.0);\n\
    return;\n\
  }\n\
\n\
  // Test which part of the vector arrow is being processed. \n\
  if (gl_Vertex.x == 0.0 && gl_Vertex.y == 0.0) {\n\
    // Origin of the arrow is being processed.\n\
    // Just transform its coordinates.\n\
    gl_Position = vec4(origin, 0.0, 1.0);\n\
  } else {\n\
    // Other parts of arrow are being processed.\n\
    // Set proper length of the arrow, rotate it, scale\n\
    // and finally transform.\n\
\n\
    // Calculate arrow length.\n\
    vec2 new_pos = gl_Vertex.xy;\n\
    new_pos.x += base_length + vector_scale * length(vec);\n\
\n\
    // Calculate angle between reference arrow (horizontal).\n\
    vec = normalize(vec);\n\
    float angle = acos(dot(vec, vec2(1.0, 0.0)));\n\
    if (vec.y < 0.0) {\n\
      angle = -angle;\n\
    }\n\
    // Prepare rotation matrix.\n\
    // See: http://en.wikipedia.org/wiki/Rotation_matrix\n\
    mat2 rot_m = mat2(\n\
      cos(angle), sin(angle),\n\
     -sin(angle), cos(angle)\n\
    );\n\
    // Rotate.\n\
    new_pos = rot_m * new_pos;\n\
    // Scale.\n\
    new_pos = new_pos * scale;\n\
    // Transform.\n\
    gl_Position = vec4(new_pos + origin, 0.0, 1.0);\n\
  }\n\
}\n\
\n\
';

var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/arrays/arrays.js", function (require, module, exports, __dirname, __filename) {
/*globals window Uint8Array Int8Array Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array */
/*jshint newcap: false */

//
// 'requirified' version of Typed Array Utilities.
//

var arrays;

arrays = exports.arrays = {};

arrays.version = '0.0.1';
arrays.webgl = (typeof window !== 'undefined') && !!window.WebGLRenderingContext;
arrays.typed = false;
try {
  var a = new Float64Array(0);
  arrays.typed = true;
} catch(e) {

}

// regular
// Uint8Array
// Uint16Array
// Uint32Array
// Int8Array
// Int16Array
// Int32Array
// Float32Array

arrays.create = function(size, fill, array_type) {
  if (!array_type) {
    if (arrays.webgl || arrays.typed) {
      array_type = "Float32Array";
    } else {
      array_type = "regular";
    }
  }
  // fill = fill || 0; -> this doesn't handle NaN value
  if (fill === undefined)
    fill = 0;
  var a, i;
  if (array_type === "regular") {
    a = new Array(size);
  } else {
    switch(array_type) {
      case "Float64Array":
      a = new Float64Array(size);
      break;
      case "Float32Array":
      a = new Float32Array(size);
      break;
      case "Int32Array":
      a = new Int32Array(size);
      break;
      case "Int16Array":
      a = new Int16Array(size);
      break;
      case "Int8Array":
      a = new Int8Array(size);
      break;
      case "Uint32Array":
      a = new Uint32Array(size);
      break;
      case "Uint16Array":
      a = new Uint16Array(size);
      break;
      case "Uint8Array":
      a = new Uint8Array(size);
      break;
      default:
      a = new Array(size);
      break;
    }
  }
  i=-1; while(++i < size) { a[i] = fill; }
  return a;
};

arrays.constructor_function = function(source) {
  if (source.buffer && source.buffer.__proto__ && source.buffer.__proto__.constructor) {
    return source.__proto__.constructor;
  }
  if (source.constructor === Array) {
    return source.constructor;
  }
  throw new Error(
      "arrays.constructor_function: must be an Array or Typed Array: " +
      "  source: " + source +
      ", source.constructor: " + source.constructor +
      ", source.buffer: " + source.buffer +
      ", source.buffer.slice: " + source.buffer.slice +
      ", source.buffer.__proto__: " + source.buffer.__proto__ +
      ", source.buffer.__proto__.constructor: " + source.buffer.__proto__.constructor
    );
};

arrays.copy = function(source, dest) {
  var len = source.length,
      i = -1;
  while(++i < len) { dest[i] = source[i]; }
  if (arrays.constructor_function(dest) === Array) dest.length = len;
  return dest;
};

arrays.clone = function(source) {
  var i, len = source.length, clone, constructor;
  constructor = arrays.constructor_function(source);
  if (constructor === Array) {
    clone = new constructor(len);
    for (i = 0; i < len; i++) { clone[i] = source[i]; }
    return clone;
  }
  if (source.buffer.slice) {
    clone = new constructor(source.buffer.slice(0));
    return clone;
  }
  clone = new constructor(len);
  for (i = 0; i < len; i++) { clone[i] = source[i]; }
  return clone;
};

/** @return true if x is between a and b. */
// float a, float b, float x
arrays.between = function(a, b, x) {
  return x < Math.max(a, b) && x > Math.min(a, b);
};

// float[] array
arrays.max = function(array) {
  return Math.max.apply( Math, array );
};

// float[] array
arrays.min = function(array) {
  return Math.min.apply( Math, array );
};

// FloatxxArray[] array
arrays.maxTypedArray = function(array) {
  var test, i,
  max = Number.MIN_VALUE,
  length = array.length;
  for(i = 0; i < length; i++) {
    test = array[i];
    max = test > max ? test : max;
  }
  return max;
};

// FloatxxArray[] array
arrays.minTypedArray = function(array) {
  var test, i,
  min = Number.MAX_VALUE,
  length = array.length;
  for(i = 0; i < length; i++) {
    test = array[i];
    min = test < min ? test : min;
  }
  return min;
};

// float[] array
arrays.maxAnyArray = function(array) {
  try {
    return Math.max.apply( Math, array );
  }
  catch (e) {
    if (e instanceof TypeError) {
      var test, i,
      max = Number.MIN_VALUE,
      length = array.length;
      for(i = 0; i < length; i++) {
        test = array[i];
        max = test > max ? test : max;
      }
      return max;
    }
  }
};

// float[] array
arrays.minAnyArray = function(array) {
  try {
    return Math.min.apply( Math, array );
  }
  catch (e) {
    if (e instanceof TypeError) {
      var test, i,
      min = Number.MAX_VALUE,
      length = array.length;
      for(i = 0; i < length; i++) {
        test = array[i];
        min = test < min ? test : min;
      }
      return min;
    }
  }
};

arrays.average = function(array) {
  var i, acc = 0,
  length = array.length;
  for (i = 0; i < length; i++) {
    acc += array[i];
  }
  return acc / length;
};
});

require.define("/physics-solvers/heat-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
// TODO: fix loops (nx vs ny)
//
// lab/models/energy2d/engine/physics-solvers/heat-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays,

  RELAXATION_STEPS = 5;

exports.makeHeatSolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    timeStep = model_options.timestep,
    boundary = model_options.boundary,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,

    // Simulation arrays provided by model.
    conductivity = model.getConductivityArray(),
    capacity     = model.getCapacityArray(),
    density      = model.getDensityArray(),
    u            = model.getUVelocityArray(),
    v            = model.getVVelocityArray(),
    tb           = model.getBoundaryTemperatureArray(),
    fluidity     = model.getFluidityArray(),

    // Internal array that stores the previous temperature results.
    t0 = arrays.create(nx * ny, 0, model.getArrayType()),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    //
    // Private methods
    //
    applyBoundary  = function (t) {
      var
        vN, vS, vW, vE,
        i, j, inx, inx_ny1;

      if (boundary.temperature_at_border) {
        vN = boundary.temperature_at_border.upper;
        vS = boundary.temperature_at_border.lower;
        vW = boundary.temperature_at_border.left;
        vE = boundary.temperature_at_border.right;
        for (i = 0; i < nx; i += 1) {
          inx = i * nx;
          t[inx] = vN;
          t[inx + ny1] = vS;
        }
        for (j = 0; j <  ny; j += 1) {
          t[j] = vW;
          t[nx1 * nx + j] = vE;
        }
      } else if (boundary.flux_at_border) {
        vN = boundary.flux_at_border.upper;
        vS = boundary.flux_at_border.lower;
        vW = boundary.flux_at_border.left;
        vE = boundary.flux_at_border.right;
        for (i = 0; i < nx; i += 1) {
          inx = i * nx;
          inx_ny1 = inx + ny1;
          t[inx] = t[inx + 1] + vN * deltaY / conductivity[inx];
          t[inx_ny1] = t[inx + ny2] - vS * deltaY / conductivity[inx_ny1];
        }
        for (j = 0; j < ny; j += 1) {
          t[j] = t[nx + j] - vW * deltaX / conductivity[j];
          t[nx1 * nx + j] = t[nx2 * nx + j] + vE * deltaX / conductivity[nx1 * nx + j];
        }
      } else {
        throw new Error("Heat solver: wrong boundary settings definition.");
      }
    },

    macCormack  = function (t) {
      var
        tx = 0.5 * timeStep / deltaX,
        ty = 0.5 * timeStep / deltaY,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          jinx_minus_nx = jinx - nx;
          jinx_plus_nx = jinx + nx;
          jinx_minus_1 = jinx - 1;
          jinx_plus_1 = jinx + 1;
          if (fluidity[jinx]) {
            t0[jinx] = t[jinx]
              - tx * (u[jinx_plus_nx] * t[jinx_plus_nx] - u[jinx_minus_nx] * t[jinx_minus_nx])
              - ty * (v[jinx_plus_1] * t[jinx_plus_1] - v[jinx_minus_1] * t[jinx_minus_1]);
          }
        }
      }
      applyBoundary(t0);

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            t[jinx] = 0.5 * (t[jinx] + t0[jinx]) - 0.5 * tx * u[jinx]
              * (t0[jinx_plus_nx] - t0[jinx_minus_nx]) - 0.5 * ty * v[jinx]
              * (t0[jinx_plus_1] - t0[jinx_minus_1]);
          }
        }
      }
      applyBoundary(t);
    };

  return {
    solve: function (convective, t, q) {
      var
        hx = 0.5 / (deltaX * deltaX),
        hy = 0.5 / (deltaY * deltaY),
        invTimeStep = 1.0 / timeStep,
        rij, sij, axij, bxij, ayij, byij,
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      arrays.copy(t, t0);

      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (isNaN(tb[jinx])) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              sij = capacity[jinx] * density[jinx] * invTimeStep;
              rij = conductivity[jinx];
              axij = hx * (rij + conductivity[jinx_minus_nx]);
              bxij = hx * (rij + conductivity[jinx_plus_nx]);
              ayij = hy * (rij + conductivity[jinx_minus_1]);
              byij = hy * (rij + conductivity[jinx_plus_1]);
              t[jinx] = (t0[jinx] * sij + q[jinx] + axij * t[jinx_minus_nx] + bxij
                        * t[jinx_plus_nx] + ayij * t[jinx_minus_1] + byij * t[jinx_plus_1])
                        / (sij + axij + bxij + ayij + byij);
            } else {
              t[jinx] = tb[jinx];
            }
          }
        }
        applyBoundary(t);
      }
      if (convective) {
        // advect(t)
        macCormack(t);
      }
    }
  };
};

});

require.define("/physics-solvers-gpu/heat-solver-gpu.js", function (require, module, exports, __dirname, __filename) {
/*globals lab: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true, es5: true */
//
// lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-gpu.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  RELAXATION_STEPS = 10;

exports.makeHeatSolverGPU = function (model) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GPGPU utilities. It's a singleton instance.
    //   It should have been previously initialized by core-model.
    gpgpu = energy2d.utils.gpu.gpgpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to JavaScript file.
    GLSL_PREFIX = 'src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/',
    basic_vs            = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    solver_fs           = glsl[GLSL_PREFIX + 'solver.fs.glsl'],
    force_flux_t_fs     = glsl[GLSL_PREFIX + 'force-flux-t.fs.glsl'],
    force_flux_t0_fs    = glsl[GLSL_PREFIX + 'force-flux-t.fs.glsl'],
    t_to_t0             = glsl[GLSL_PREFIX + 't-to-t0.fs.glsl'],
    maccormack_step1_fs = glsl[GLSL_PREFIX + 'maccormack-step1.fs.glsl'],
    maccormack_step2_fs = glsl[GLSL_PREFIX + 'maccormack-step2.fs.glsl'],

    // ========================================================================
    // GLSL Shaders:
    // - Main solver.
    solver_program           = new gpu.Shader(basic_vs, solver_fs),
    // - Force flux boundary (for T).
    force_flux_t_program     = new gpu.Shader(basic_vs, force_flux_t_fs),
    // - Force flux boundary (for T0).
    force_flux_t0_program    = new gpu.Shader(basic_vs, force_flux_t0_fs),
    // - Copy single channel of texture (t to t0).
    t_to_t0_program          = new gpu.Shader(basic_vs, t_to_t0),
    // - MacCormack advection step 1.
    maccormack_step1_program = new gpu.Shader(basic_vs, maccormack_step1_fs),
    // - MacCormack advection step 2.
    maccormack_step2_program = new gpu.Shader(basic_vs, maccormack_step2_fs),
    // ========================================================================

    // Basic simulation parameters.
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    model_options = model.getModelOptions(),
    timestep = model_options.timestep,
    boundary = model_options.boundary,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    relaxation_steps = RELAXATION_STEPS,

    // Simulation textures provided by model.
    // texture 0: 
    // - R: t
    // - G: t0
    // - B: tb
    // - A: conductivity
    data0_tex = model.getSimulationTexture(0),
    // texture 1: 
    // - R: q
    // - G: capacity
    // - B: density
    // - A: fluidity
    data1_tex = model.getSimulationTexture(1),
    // texture 2: 
    // - R: u
    // - G: v
    // - B: u0
    // - A: v0
    data2_tex = model.getSimulationTexture(2),

    // Convenience variables.  
    data_0_1_2_array = [data0_tex, data1_tex, data2_tex],
    data_0_1_array = [data0_tex, data1_tex],
    data_0_array = [data0_tex],
    grid_vec = [1 / ny, 1 / nx],

    init = function () {
      var uniforms;

      // Solver program uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        // Uniforms.
        grid: grid_vec,
        enforce_temp: 0.0,
        hx: 0.5 / (delta_x * delta_x),
        hy: 0.5 / (delta_y * delta_y),
        inv_timestep: 1.0 / timestep
      };
      solver_program.uniforms(uniforms);

      // MacCormack step 1 program uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        data2_tex: 2,
        // Uniforms.
        grid: grid_vec,
        enforce_temp: 0.0,
        tx: 0.5 * timestep / delta_x,
        ty: 0.5 * timestep / delta_y,
      };
      maccormack_step1_program.uniforms(uniforms);
      maccormack_step2_program.uniforms(uniforms);

      if (boundary.temperature_at_border) {
        uniforms = {
          // Additional uniforms.
          enforce_temp: 1.0,
          vN:  boundary.temperature_at_border.upper,
          vS:  boundary.temperature_at_border.lower,
          vW:  boundary.temperature_at_border.left,
          vE:  boundary.temperature_at_border.right
        };
        // Integrate boundary conditions with other programs.
        // This is optimization that allows to limit render-to-texture calls.
        solver_program.uniforms(uniforms);
        maccormack_step1_program.uniforms(uniforms);
        maccormack_step2_program.uniforms(uniforms);
      } else if (boundary.flux_at_border) {
        uniforms = {
          // Texture units.
          data0_tex: 0,
          // Uniforms.
          grid: grid_vec,
          vN: boundary.flux_at_border.upper,
          vS: boundary.flux_at_border.lower,
          vW: boundary.flux_at_border.left,
          vE: boundary.flux_at_border.right,
          delta_x: delta_x,
          delta_y: delta_y
        };
        // Flux boundary conditions can't be integrated into solver program,
        // so use separate GLSL programs.
        force_flux_t_program.uniforms(uniforms);
        force_flux_t0_program.uniforms(uniforms);
      }
    },

    macCormack = function () {
      // MacCormack step 1.
      gpgpu.executeProgram(
        maccormack_step1_program,
        data_0_1_2_array,
        data0_tex
      );
      if (boundary.flux_at_border) {
        // Additional program for boundary conditions
        // is required only for "flux at border" option.
        // If "temperature at border" is used, boundary
        // conditions are enforced by the MacCormack program.
        gpgpu.executeProgram(
          force_flux_t0_program,
          data_0_array,
          data0_tex
        );
      }
      // MacCormack step 2.
      gpgpu.executeProgram(
        maccormack_step2_program,
        data_0_1_2_array,
        data0_tex
      );
      if (boundary.flux_at_border) {
        // Additional program for boundary conditions
        // is required only for "flux at border" option.
        // If "temperature at border" is used, boundary
        // conditions are enforced by the MacCormack program.
        gpgpu.executeProgram(
          force_flux_t_program,
          data_0_array,
          data0_tex
        );
      }
    },

    heat_solver_gpu = {
      solve: function (convective) {
        var k;
        // Store previous values of t in t0.
        gpgpu.executeProgram(
          t_to_t0_program,
          data_0_array,
          data0_tex
        );
        for (k = 0; k < relaxation_steps; k += 1) {
          gpgpu.executeProgram(
            solver_program,
            data_0_1_array,
            data0_tex
          );
          if (boundary.flux_at_border) {
            // Additional program for boundary conditions
            // is required only for "flux at border" option.
            // If "temperature at border" is used, boundary
            // conditions are enforced by the solver program.
            gpgpu.executeProgram(
              force_flux_t_program,
              data_0_array,
              data0_tex
            );
          }
        }
        if (convective) {
          macCormack();
        }
        // Synchronize. It's not required but it 
        // allows to measure time (for optimization).
        gpgpu.tryFinish();
      }
    };
  // One-off initialization.
  init();
  return heat_solver_gpu;
};

});

require.define("/physics-solvers/fluid-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
//
// lab/models/energy2d/engine/physics-solvers/fluid-solver.js
//
var
  arrays = require('../arrays/arrays.js').arrays,

  RELAXATION_STEPS = 5,
  GRAVITY = 0,

  BUOYANCY_AVERAGE_ALL = 0,
  BUOYANCY_AVERAGE_COLUMN = 1;

exports.makeFluidSolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options         = model.getModelOptions(),
    timeStep              = model_options.timestep,
    thermalBuoyancy       = model_options.thermal_buoyancy,
    buoyancyApproximation = model_options.buoyancy_approximation,
    viscosity             = model_options.background_viscosity,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Simulation arrays provided by model.
    t        = model.getTemperatureArray(),
    fluidity = model.getFluidityArray(),
    uWind    = model.getUWindArray(),
    vWind    = model.getVWindArray(),

    // Internal simulation arrays.
    array_type = model.getArrayType(),
    u0         = arrays.create(nx * ny, 0, array_type),
    v0         = arrays.create(nx * ny, 0, array_type),

    // Convenience variables.   
    i2dx  = 0.5 / deltaX,
    i2dy  = 0.5 / deltaY,
    idxsq = 1.0 / (deltaX * deltaX),
    idysq = 1.0 / (deltaY * deltaY),

    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    // 
    // Private methods
    //

    // b = 1 horizontal; b = 2 vertical 
    applyBoundary = function (b, f) {
      var
        horizontal = b === 1,
        vertical   = b === 2,
        nx1nx = nx1 * nx,
        nx2nx = nx2 * nx,
        i, j, inx, inx_plus1, inx_plus_ny1, inx_plus_ny2, nx_plusj;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        inx_plus1 = inx + 1;
        inx_plus_ny1 = inx + ny1;
        inx_plus_ny2 = inx + ny2;
        // upper side
        f[inx] = vertical ? -f[inx_plus1] : f[inx_plus1];
        // lower side
        f[inx_plus_ny1] = vertical ? -f[inx_plus_ny2] : f[inx_plus_ny2];
      }
      for (j = 1; j < ny1; j += 1) {
        // left side
        nx_plusj = nx + j;
        f[j] = horizontal ? -f[nx_plusj] : f[nx_plusj];
        // right side
        f[nx1nx + j] = horizontal ? -f[nx2nx + j] : f[nx2nx + j];
      }

      // upper-left corner
      f[0] = 0.5 * (f[nx] + f[1]);
      // upper-right corner
      f[nx1nx] = 0.5 * (f[nx2nx] + f[nx1nx + 1]);
      // lower-left corner
      f[ny1] = 0.5 * (f[nx + ny1] + f[ny2]);
      // lower-right corner
      f[nx1nx + ny1] = 0.5 * (f[nx2nx + ny1] + f[nx1nx + ny2]);
    },

    setObstacleVelocity = function (u, v) {
      var
        count = 0,
        uw, vw,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          jinx_minus_nx = jinx - nx;
          jinx_plus_nx = jinx + nx;
          jinx_minus_1 = jinx - 1;
          jinx_plus_1 = jinx + 1;

          if (!fluidity[jinx]) {
            uw = uWind[jinx];
            vw = vWind[jinx];
            count = 0;
            if (fluidity[jinx_minus_nx]) {
              count += 1;
              u[jinx] = uw - u[jinx_minus_nx];
              v[jinx] = vw + v[jinx_minus_nx];
            } else if (fluidity[jinx_plus_nx]) {
              count += 1;
              u[jinx] = uw - u[jinx_plus_nx];
              v[jinx] = vw + v[jinx_plus_nx];
            }
            if (fluidity[jinx_minus_1]) {
              count += 1;
              u[jinx] = uw + u[jinx_minus_1];
              v[jinx] = vw - v[jinx_minus_1];
            } else if (fluidity[jinx_plus_1]) {
              count += 1;
              u[jinx] = uw + u[jinx_plus_1];
              v[jinx] = vw - v[jinx_plus_1];
            }
            if (count === 0) {
              u[jinx] = uw;
              v[jinx] = vw;
            }
          }
        }
      }
    },

    // ensure dx/dn = 0 at the boundary (the Neumann boundary condition)
    // float[][] x
    setObstacleBoundary = function (x) {
      var i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (!fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            if (fluidity[jinx_minus_nx]) {
              x[jinx] = x[jinx_minus_nx];
            } else if (fluidity[jinx_plus_nx]) {
              x[jinx] = x[jinx_plus_nx];
            }
            if (fluidity[jinx_minus_1]) {
              x[jinx] = x[jinx_minus_1];
            } else if (fluidity[jinx_plus_1]) {
              x[jinx] = x[jinx_plus_1];
            }
          }
        }
      }
    },

    getMeanTemperature = function (i, j) {
      var
        lowerBound = 0,
        upperBound = ny,
        t0 = 0,
        k, inx_plus_k;

        // search for the upper bound
      for (k = j - 1; k > 0; k -= 1) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
          lowerBound = k;
          break;
        }
      }

      for (k = j + 1; k < ny; k += 1) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
          upperBound = k;
          break;
        }
      }

      for (k = lowerBound; k < upperBound; k += 1) {
        inx_plus_k = i * nx + k;
        t0 += t[inx_plus_k];
      }
      return t0 / (upperBound - lowerBound);
    },

    applyBuoyancy = function (f) {
      var
        g = gravity * timeStep,
        b = thermalBuoyancy * timeStep,
        t0,
        i, j, inx, jinx;

      switch (buoyancyApproximation) {
      case BUOYANCY_AVERAGE_ALL:
        t0 = (function (array) {
          // Returns average value of an array.
          var
            acc = 0,
            length = array.length,
            i;
          for (i = 0; i < length; i += 1) {
            acc += array[i];
          }
          return acc / length;
        }(t)); // Call with the temperature array.
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              f[jinx] += (g - b) * t[jinx] + b * t0;
            }
          }
        }
        break;
      case BUOYANCY_AVERAGE_COLUMN:
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              t0 = getMeanTemperature(i, j);
              f[jinx] += (g - b) * t[jinx] + b * t0;
            }
          }
        }
        break;
      }
    },

    conserve = function (u, v, phi, div) {
      var
        s = 0.5 / (idxsq + idysq),
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            div[jinx] = (u[jinx_plus_nx] - u[jinx_minus_nx]) * i2dx + (v[jinx_plus_1] - v[jinx_minus_1]) * i2dy;
            phi[jinx] = 0;
          }
        }
      }
      applyBoundary(0, div);
      applyBoundary(0, phi);
      setObstacleBoundary(div);
      setObstacleBoundary(phi);

      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              phi[jinx] = s
                  * ((phi[jinx_minus_nx] + phi[jinx_plus_nx]) * idxsq
                  + (phi[jinx_minus_1] + phi[jinx_plus_1]) * idysq - div[jinx]);
            }
          }
        }
      }

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            u[jinx] -= (phi[jinx_plus_nx] - phi[jinx_minus_nx]) * i2dx;
            v[jinx] -= (phi[jinx_plus_1] - phi[jinx_minus_1]) * i2dy;
          }
        }
      }
      applyBoundary(1, u);
      applyBoundary(2, v);
    },

    diffuse = function (b, f0, f) {
      var
        hx = timeStep * viscosity * idxsq,
        hy = timeStep * viscosity * idysq,
        dn = 1.0 / (1 + 2 * (hx + hy)),
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      arrays.copy(f, f0);
      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              f[jinx] = (f0[jinx] + hx * (f[jinx_minus_nx] + f[jinx_plus_nx]) + hy
                      * (f[jinx_minus_1] + f[jinx_plus_1]))
                      * dn;
            }
          }
        }
        applyBoundary(b, f);
      }
    },

    // MacCormack
    macCormack = function (b, f0, f) {
      var
        tx = 0.5 * timeStep / deltaX,
        ty = 0.5 * timeStep / deltaY,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            f[jinx] = f0[jinx]
                    - tx
                    * (u0[jinx_plus_nx] * f0[jinx_plus_nx] - u0[jinx_minus_nx]
                            * f0[jinx_minus_nx])
                    - ty
                    * (v0[jinx_plus_1] * f0[jinx_plus_1] - v0[jinx_minus_1]
                            * f0[jinx_minus_1]);
          }
        }
      }

      applyBoundary(b, f);

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            f0[jinx] = 0.5 * (f0[jinx] + f[jinx]) - 0.5 * tx
                    * u0[jinx] * (f[jinx_plus_nx] - f[jinx_minus_nx]) - 0.5
                    * ty * v0[jinx] * (f[jinx_plus_1] - f[jinx_minus_1]);
          }
        }
      }

      arrays.copy(f0, f);

      applyBoundary(b, f);
    },

    advect = function (b, f0, f) {
      macCormack(b, f0, f);
    };

  return {
    // TODO: swap the two arrays instead of copying them every time?
    solve: function (u, v) {
      if (thermalBuoyancy !== 0) {
        applyBuoyancy(v);
      }
      setObstacleVelocity(u, v);
      if (viscosity > 0) {
        // inviscid case
        diffuse(1, u0, u);
        diffuse(2, v0, v);
        conserve(u, v, u0, v0);
        setObstacleVelocity(u, v);
      }
      arrays.copy(u, u0);
      arrays.copy(v, v0);
      advect(1, u0, u);
      advect(2, v0, v);
      conserve(u, v, u0, v0);
      setObstacleVelocity(u, v);
    }
  };
};
});

require.define("/physics-solvers-gpu/fluid-solver-gpu.js", function (require, module, exports, __dirname, __filename) {
/*globals lab: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true, es5: true */
//
// lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-gpu.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  RELAXATION_STEPS = 10,
  GRAVITY = 0,

  BUOYANCY_AVERAGE_ALL = 0,
  BUOYANCY_AVERAGE_COLUMN = 1;

exports.makeFluidSolverGPU = function (model) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GPGPU utilities. It's a singleton instance.
    //   It should have been previously initialized by core-model.
    gpgpu = energy2d.utils.gpu.gpgpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to JavaScript file.
    GLSL_PREFIX = 'src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/',
    basic_vs                 = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    maccormack_step1_fs      = glsl[GLSL_PREFIX + 'maccormack-step1.fs.glsl'],
    maccormack_step2_fs      = glsl[GLSL_PREFIX + 'maccormack-step2.fs.glsl'],
    apply_uv_boundary_fs     = glsl[GLSL_PREFIX + 'apply-uv-boundary.fs.glsl'],
    apply_u0v0_boundary_fs   = glsl[GLSL_PREFIX + 'apply-u0v0-boundary.fs.glsl'],
    set_obstacle_boundary_fs = glsl[GLSL_PREFIX + 'set-obstacle-boundary.fs.glsl'],
    set_obstacle_velocity_fs = glsl[GLSL_PREFIX + 'set-obstacle-velocity.fs.glsl'],
    uv_to_u0v0_fs            = glsl[GLSL_PREFIX + 'uv-to-u0v0.fs.glsl'],
    conserve_step1_fs        = glsl[GLSL_PREFIX + 'conserve-step1.fs.glsl'],
    conserve_step2_fs        = glsl[GLSL_PREFIX + 'conserve-step2.fs.glsl'],
    conserve_step3_fs        = glsl[GLSL_PREFIX + 'conserve-step3.fs.glsl'],
    diffuse_fs               = glsl[GLSL_PREFIX + 'diffuse.fs.glsl'],
    apply_buoyancy_fs        = glsl[GLSL_PREFIX + 'apply-buoyancy.fs.glsl'],

    // ========================================================================
    // GLSL Shaders:
    // - MacCormack advection, first step.
    maccormack_step1_program      = new gpu.Shader(basic_vs, maccormack_step1_fs),
    maccormack_step2_program      = new gpu.Shader(basic_vs, maccormack_step2_fs),
    apply_uv_boundary_program     = new gpu.Shader(basic_vs, apply_uv_boundary_fs),
    apply_u0v0_boundary_program   = new gpu.Shader(basic_vs, apply_u0v0_boundary_fs),
    set_obstacle_boundary_program = new gpu.Shader(basic_vs, set_obstacle_boundary_fs),
    set_obstacle_velocity_program = new gpu.Shader(basic_vs, set_obstacle_velocity_fs),
    uv_to_u0v0_program            = new gpu.Shader(basic_vs, uv_to_u0v0_fs),
    conserve_step1_program        = new gpu.Shader(basic_vs, conserve_step1_fs),
    conserve_step2_program        = new gpu.Shader(basic_vs, conserve_step2_fs),
    conserve_step3_program        = new gpu.Shader(basic_vs, conserve_step3_fs),
    diffuse_program               = new gpu.Shader(basic_vs, diffuse_fs),
    apply_buoyancy_program        = new gpu.Shader(basic_vs, apply_buoyancy_fs),
    // ========================================================================

    // Simulation arrays provided by model.
    // texture 0: 
    // - R: t
    // - G: t0
    // - B: tb
    // - A: conductivity
    data0_tex = model.getSimulationTexture(0),
    // texture 1: 
    // - R: q
    // - G: capacity
    // - B: density
    // - A: fluidity
    data1_tex = model.getSimulationTexture(1),
    // texture 2: 
    // - R: u
    // - G: v
    // - B: u0
    // - A: v0
    data2_tex = model.getSimulationTexture(2),
    // texture 3: 
    // - R: uWind
    // - G: vWind
    // - B: undefined
    // - A: undefined
    data3_tex = model.getSimulationTexture(3),

    // Basic simulation parameters.
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    model_options          = model.getModelOptions(),
    timestep               = model_options.timestep,
    thermal_buoyancy       = model_options.thermal_buoyancy,
    buoyancy_approximation = model_options.buoyancy_approximation,
    viscosity              = model_options.background_viscosity,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    relaxation_steps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Convenience variables.   
    i2dx  = 0.5 / delta_x,
    i2dy  = 0.5 / delta_y,
    idxsq = 1.0 / (delta_x * delta_x),
    idysq = 1.0 / (delta_y * delta_y),
    s     = 0.5 / (idxsq + idysq),

    hx = timestep * viscosity * idxsq,
    hy = timestep * viscosity * idysq,
    dn = 1.0 / (1 + 2 * (hx + hy)),

    g = gravity * timestep,
    b = thermal_buoyancy * timestep,

    grid_vec = [1 / ny, 1 / nx],

    // Textures sets.
    data_2_array = [data2_tex],
    data_1_2_array = [data1_tex, data2_tex],
    data_0_1_2_array = [data0_tex, data1_tex, data2_tex],
    data_1_2_3_array = [data1_tex, data2_tex, data3_tex],

    init = function () {
      var uniforms;

      // MacCormack step 1 and 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        tx: 0.5 * timestep / delta_x,
        ty: 0.5 * timestep / delta_y
      };
      maccormack_step1_program.uniforms(uniforms);
      maccormack_step2_program.uniforms(uniforms);

      // Apply UV / U0V0 boundary uniforms.
      uniforms = {
        // Texture units.
        data2_tex: 0,
        // Uniforms.
        grid: grid_vec,
      };
      apply_uv_boundary_program.uniforms(uniforms);
      apply_u0v0_boundary_program.uniforms(uniforms);

      // Set obstacle boundary uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
      };
      set_obstacle_boundary_program.uniforms(uniforms);

      // Set obstacle velocity uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        data3_tex: 2,
        // Uniforms.
        grid: grid_vec,
      };
      set_obstacle_velocity_program.uniforms(uniforms);

      // Conserve step 1 and 3 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        i2dx: i2dx,
        i2dy: i2dy
      };
      conserve_step1_program.uniforms(uniforms);
      conserve_step3_program.uniforms(uniforms);

      // Conserve step 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        s: s,
        idxsq: idxsq,
        idysq: idysq
      };
      conserve_step2_program.uniforms(uniforms);

      // Diffuse uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        hx: hx,
        hy: hy,
        dn: dn
      };
      diffuse_program.uniforms(uniforms);

      // Apply buoyancy uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        data2_tex: 2,
        // Uniforms.
        grid: grid_vec,
        g: g,
        b: b
      };
      apply_buoyancy_program.uniforms(uniforms);
    },

    applyBuoyancy = function () {
      gpgpu.executeProgram(
        apply_buoyancy_program,
        data_0_1_2_array,
        data2_tex
      );
    },

    macCormack = function () {
      // Step 1.
      gpgpu.executeProgram(
        maccormack_step1_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
      // Step 2.
      gpgpu.executeProgram(
        maccormack_step2_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary again.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
    },

    conserve = function () {
      var k;
      // Step 1.
      gpgpu.executeProgram(
        conserve_step1_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_u0v0_boundary_program,
        data_2_array,
        data2_tex
      );
      // Set obstacle boundary.
      gpgpu.executeProgram(
        set_obstacle_boundary_program,
        data_1_2_array,
        data2_tex
      );
      // Relaxation.
      for (k = 0; k < relaxation_steps; k += 1) {
        // Step 2.
        gpgpu.executeProgram(
          conserve_step2_program,
          data_1_2_array,
          data2_tex
        );
      }
      // Step 3.
      gpgpu.executeProgram(
        conserve_step3_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
    },

    diffuse = function () {
      var k;
      // Copy UV to U0V0.
      gpgpu.executeProgram(
        uv_to_u0v0_program,
        data_2_array,
        data2_tex
      );
      // Relaxation.
      for (k = 0; k < relaxation_steps; k += 1) {
        // Step 2.
        gpgpu.executeProgram(
          diffuse_program,
          data_1_2_array,
          data2_tex
        );

        // Apply boundary.
        gpgpu.executeProgram(
          apply_uv_boundary_program,
          data_2_array,
          data2_tex
        );
      }
    },

    setObstacleVelocity = function () {
      gpgpu.executeProgram(
        set_obstacle_velocity_program,
        data_1_2_3_array,
        data2_tex
      );
    },

    copyUVtoU0V0 = function () {
      gpgpu.executeProgram(
        uv_to_u0v0_program,
        data_2_array,
        data2_tex
      );
    },

    fluid_solver_gpu = {
      solve: function () {
        if (thermal_buoyancy !== 0) {
          applyBuoyancy();
        }
        setObstacleVelocity();
        if (viscosity > 0) {
          diffuse();
          conserve();
          setObstacleVelocity();
        }
        copyUVtoU0V0();
        macCormack();
        conserve();
        setObstacleVelocity();
        // Synchronize. It's not required but it 
        // allows to measure time (for optimization).
        gpgpu.tryFinish();
      }
    };

  // One-off initialization.
  init();

  return fluid_solver_gpu;
};

});

require.define("/physics-solvers/ray-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/physics-solvers/ray-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  Photon = require('../photon.js').Photon;

exports.makeRaySolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    lx = model_options.model_width,
    ly = model_options.model_height,
    timestep = model_options.timestep,
    sun_angle = Math.PI - model_options.sun_angle,
    ray_count = model_options.solar_ray_count,
    solar_power_density = model_options.solar_power_density,
    ray_power = model_options.solar_power_density,
    ray_speed = model_options.solar_ray_speed,
    photon_emission_interval = model_options.photon_emission_interval,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    // Simulation arrays provided by model.
    q       = model.getPowerArray(),
    parts   = model.getPartsArray(),
    photons = model.getPhotonsArray(),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    //
    // Private methods
    //

    // TODO: implement something efficient. Linked list?
    cleanupPhotonsArray = function () {
      var i = 0;
      while (i < photons.length) {
        if (photons[i] === undefined) {
          photons.splice(i, 1);
        } else {
          i += 1;
        }
      }
    },

    applyBoundary = function () {
      var i, len, photon;
      for (i = 0, len = photons.length; i < len; i += 1) {
        if (!photons[i].isContained(0, lx, 0, ly)) {
          photons[i] = undefined;
        }
      }
      cleanupPhotonsArray();
    },

    isContained = function (x, y) {
      var
        i, len, part;
      for (i = 0, len = parts.length; i < len; i += 1) {
        if (parts[i].contains(x, y)) {
          return true;
        }
      }
      return false;
    },

    shootAtAngle = function (dx, dy) {
      var
        m = Math.floor(lx / dx),
        n = Math.floor(ly / dy),
        x, y, i;
      if (sun_angle >= 0 && sun_angle < 0.5 * Math.PI) {
        y = 0;
        for (i = 1; i <= m; i += 1) {
          x = dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = 0;
        for (i = 0; i <= n; i += 1) {
          y = dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      } else if (sun_angle < 0 && sun_angle >= -0.5 * Math.PI) {
        y = ly;
        for (i = 1; i <= m; i += 1) {
          x = dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = 0;
        for (i = 0; i <= n; i += 1) {
          y = ly - dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      } else if (sun_angle < Math.PI + 0.001 && sun_angle >= 0.5 * Math.PI) {
        y = 0;
        for (i = 0; i <= m; i += 1) {
          x = lx - dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = lx;
        for (i = 1; i <= n; i += 1) {
          y = dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      } else if (sun_angle >= -Math.PI && sun_angle < -0.5 * Math.PI) {
        y = ly;
        for (i = 0; i <= m; i += 1) {
          x = lx - dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = lx;
        for (i = 1; i <= n; i += 1) {
          y = ly - dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      }
    };

  return {
    solve: function () {
      var
        factor = 1.0 / (timestep * photon_emission_interval),
        idx = 1.0 / delta_x,
        idy = 1.0 / delta_y,
        photon, part, x, y,
        i, j, photons_len, parts_len;

      for (i = 0, photons_len = photons.length; i < photons_len; i += 1) {
        photon = photons[i];
        photon.move(timestep);

        for (j = 0, parts_len = parts.length; j < parts_len; j += 1) {
          part = parts[j];
          if (part.reflect(photon, timestep)) {
            break;
          } else if (part.absorb(photon)) {
            x = Math.max(Math.min(Math.round(photon.x * idx), nx1), 0);
            y = Math.max(Math.min(Math.round(photon.y * idy), ny1), 0);
            q[x * ny + y] = photon.energy * factor;
            // Remove photon.
            photons[i] = undefined;
            break;
          }
        }
      }
      // Clean up absorbed photons.
      cleanupPhotonsArray();
      // Remove photons that are out of bounds.
      applyBoundary();
    },

    radiate: function () {
      var part, i, len;
      for (i = 0, len = parts.length; i < len; i += 1) {
        part = parts[i];
        if (part.emissivity > 0) {
          part.radiate(model);
        }
      }
    },

    sunShine: function () {
      var s, c, spacing;
      if (sun_angle < 0) {
        return;
      }
      s = Math.abs(Math.sin(sun_angle));
      c = Math.abs(Math.cos(sun_angle));
      spacing = s * ly < c * lx ? ly / c : lx / s;
      spacing /= ray_count;
      shootAtAngle(spacing / s, spacing / c);
    }
  };
};

});

require.define("/photon.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/photon.js
//

var
  hypot     = require('./utils/math.js').hypot,
  Line      = require('./utils/shape.js').Line,
  Rectangle = require('./utils/shape.js').Rectangle;

// 
// Photon class.
//
var Photon = exports.Photon = function (x, y, energy, c, angle) {
  'use strict';
  this.x = x;
  this.y = y;
  this.energy = energy;
  this.c = c;

  if (angle !== undefined) {
    this.vx = Math.cos(angle) * c;
    this.vy = Math.sin(angle) * c;
  }
};

Photon.prototype.isContained = function (xmin, xmax, ymin, ymax) {
  'use strict';
  return this.x >= xmin && this.x <= xmax && this.y >= ymin && this.y <= ymax;
};

Photon.prototype.move = function (dt) {
  'use strict';
  this.x += this.vx * dt;
  this.y += this.vy * dt;
};

Photon.prototype.reflectFromLine = function (line, time_step) {
  'use strict';
  var
    x1 = this.x,
    y1 = this.y,
    x2 = this.x - this.vx * time_step,
    y2 = this.y - this.vy * time_step,
    photon_line = new Line(x1, y1, x2, y2),
    vx = this.vx,
    vy = this.vy,
    r12, sin, cos, u, w;

  if (photon_line.intersectsLine(line)) {
    x1 = line.x1;
    y1 = line.y1;
    x2 = line.x2;
    y2 = line.y2;
    r12 = 1.0 / hypot(x1 - x2, y1 - y2);
    sin = (y2 - y1) * r12;
    cos = (x2 - x1) * r12;
    // Velocity component parallel to the line.
    u = vx * cos + vy * sin;
    // Velocity component perpendicular to the line.
    w = vy * cos - vx * sin;
    // Update velocities.
    this.vx = u * cos + w * sin;
    this.vy = u * sin - w * cos;
    return true;
  }
  return false;
};

Photon.prototype.reflectFromRectangle = function (rectangle, time_step) {
  'use strict';
  var
    x0 = rectangle.x,
    y0 = rectangle.y,
    x1 = rectangle.x + rectangle.width,
    y1 = rectangle.y + rectangle.height,
    dx, dy;

  dx = this.vx * time_step;
  if (this.x - dx < x0) {
    this.vx = -Math.abs(this.vx);
  } else if (this.x - dx > x1) {
    this.vx = Math.abs(this.vx);
  }
  dy = this.vy * time_step;
  if (this.y - dy < y0) {
    this.vy = -Math.abs(this.vy);
  } else if (this.y - dy > y1) {
    this.vy = Math.abs(this.vy);
  }
};

Photon.prototype.reflectFromPolygon = function (polygon, time_step) {
  'use strict';
  var
    line = new Line(), // no params, as this object will be reused many times
    i, len;

  for (i = 0, len = polygon.count - 1; i < len; i += 1) {
    line.x1 = polygon.x_coords[i];
    line.y1 = polygon.y_coords[i];
    line.x2 = polygon.x_coords[i + 1];
    line.y2 = polygon.y_coords[i + 1];
    if (this.reflectFromLine(line, time_step)) {
      return;
    }
  }
  line.x1 = polygon.x_coords[polygon.count - 1];
  line.y1 = polygon.y_coords[polygon.count - 1];
  line.x2 = polygon.x_coords[0];
  line.y2 = polygon.y_coords[0];
  this.reflectFromLine(line, time_step);
};

Photon.prototype.reflect = function (shape, time_step) {
  'use strict';
  // Check if part contains a photon BEFORE possible polygonization.
  if (!shape.contains(this.x, this.y)) {
    return false;
  }

  if (shape instanceof Rectangle) {
    // Rectangle also can be polygonized, but for performance reasons
    // use separate method.
    this.reflectFromRectangle(shape, time_step);
  } else {
    // Other shapes (ellipses, rings, polygons) - polygonize() first
    // (polygonize() for polygon returns itself).
    this.reflectFromPolygon(shape.polygonize(), time_step);
  }
  return true;
};

});

require.define("/utils/math.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/utils/math.js
//

exports.hypot = function (x, y) {
  'use strict';
  var t;
  x = Math.abs(x);
  y = Math.abs(y);
  t = Math.min(x, y);
  x = Math.max(x, y);
  y = t;
  return x * Math.sqrt(1 + (y / x) * (y / x));
};
});

require.define("/utils/shape.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/utils/shape.js
//

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
exports.pointInsidePolygon = function (nvert, vertx, verty, testx, testy) {
  'use strict';
  var c = 0, i, j;
  for (i = 0, j = nvert - 1; i < nvert; j = i, i += 1) {
    if (((verty[i] > testy) !== (verty[j] > testy)) &&
        (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
      c = !c;
    }
  }
  return !!c;
};

//
// Line in 2D.
// 
// It is defined by two points - (x1, y1) and (x2, y2).
var Line = exports.Line = function (x1, y1, x2, y2) {
  'use strict';
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
};

Line.prototype.intersectsLine = function (line) {
  'use strict';
  var
    result,
    a1 = {x: this.x1, y: this.y1},
    a2 = {x: this.x2, y: this.y2},
    b1 = {x: line.x1, y: line.y1},
    b2 = {x: line.x2, y: line.y2},
    ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
    ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
    u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y),
    ua, ub;

  if (u_b !== 0) {
    ua = ua_t / u_b;
    ub = ub_t / u_b;

    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      result = true;
    } else {
      result = false;
    }
  } else {
    if (ua_t === 0 || ub_t === 0) {
      result = true;  // Coincident.
    } else {
      result = false; // Parallel.
    }
  }
  return result;
};

//
// Polygon.
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Polygon = exports.Polygon = function (count, x_coords, y_coords) {
  'use strict';
  this.count = count;
  this.x_coords = x_coords;
  this.y_coords = y_coords;
};

Polygon.prototype.polygonize = function () {
  'use strict';
  return this;
};

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
Polygon.prototype.contains = function (x, y) {
  'use strict';
  var
    x_coords = this.x_coords,
    y_coords = this.y_coords,
    count = this.count,
    c = 0, i, j;

  for (i = 0, j = count - 1; i < count; j = i, i += 1) {
    if (((y_coords[i] > y) !== (y_coords[j] > y)) &&
        (x < (x_coords[j] - x_coords[i]) * (y - y_coords[i]) / (y_coords[j] - y_coords[i]) + x_coords[i])) {
      c = !c;
    }
  }
  // Convert to Boolean.
  return !!c;
};

//
// Rectangle.
// x, y - left-top corner
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Rectangle = exports.Rectangle = function (x, y, width, height) {
  'use strict';
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.polygon_cache = undefined;
};

Rectangle.prototype.polygonize = function () {
  'use strict';
  var
    x, y, w, h;

  if (!this.polygon_cache) {
    x = this.x;
    y = this.y;
    w = this.width;
    h = this.height;
    this.polygon_cache = new Polygon(4, [x, x + w, x + w, x], [y, y, y + h, y + h]);
  }
  return this.polygon_cache;
};

Rectangle.prototype.contains = function (x, y) {
  'use strict';
  return x >= this.x && x <= this.x + this.width &&
         y >= this.y && y <= this.y + this.height;
};

// Helper function, used by Ellipse and Ring.
var polygonizeEllipse = function (x, y, ra, rb, segments) {
  'use strict';
  var
    vx = new Array(segments),
    vy = new Array(segments),
    delta = 2 * Math.PI / segments,
    theta, i;

  for (i = 0; i < segments; i += 1) {
    theta = delta * i;
    vx[i] = x + ra * Math.cos(theta);
    vy[i] = y + rb * Math.sin(theta);
  }
  return new Polygon(segments, vx, vy);
};

//
// Ellipse.
// x, y - center
// a, b - diameter (not radius)
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Ellipse = exports.Ellipse = function (x, y, a, b) {
  'use strict';
  this.x = x;
  this.y = y;
  this.a = a;
  this.b = b;
  this.polygon_cache = undefined;
};

Ellipse.prototype.POLYGON_SEGMENTS = 50;

Ellipse.prototype.polygonize = function () {
  'use strict';
  if (!this.polygon_cache) {
    this.polygon_cache = polygonizeEllipse(this.x, this.y, this.a * 0.5, this.b * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache;
};

Ellipse.prototype.contains = function (x, y) {
  'use strict';
  var
    px = x - this.x,
    py = y - this.y,
    ra = this.a * 0.5,
    rb = this.b * 0.5;

  return px * px / (ra * ra) + py * py / (rb * rb) <= 1;
};

//
// Ring.
// x, y - center
// inner, outer - diameter (not radius)
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Ring = exports.Ring = function (x, y, inner, outer) {
  'use strict';
  this.x = x;
  this.y = y;
  this.inner = inner;
  this.outer = outer;
  this.polygon_cache = undefined;
};

Ring.prototype.POLYGON_SEGMENTS = 50;

// Returns OUTER circle polygonization.
Ring.prototype.polygonize = function () {
  'use strict';
  if (!this.polygon_cache) {
    this.polygon_cache = polygonizeEllipse(this.x, this.y, this.outer * 0.5, this.outer * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache;
};

// Returns INNER circle polygonization.
Ring.prototype.polygonizeInner = function () {
  'use strict';
  var x, y, r, vx, vy, line, delta, theta, i, len;

  if (!this.polygon_cache_inner) {
    this.polygon_cache_inner = polygonizeEllipse(this.x, this.y, this.inner * 0.5, this.inner * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache_inner;
};

Ring.prototype.contains = function (x, y) {
  'use strict';
  var
    px = x - this.x,
    py = y - this.y,
    ra_outer = this.outer * 0.5,
    rb_outer = this.outer * 0.5,
    ra_inner = this.inner * 0.5,
    rb_inner = this.inner * 0.5;

  return (px * px / (ra_outer * ra_outer) + py * py / (rb_outer * rb_outer) <= 1) &&
         (px * px / (ra_inner * ra_inner) + py * py / (rb_inner * rb_inner) >= 1);
};
});

require.define("/part.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK (complaining only about Array(size) constructor)
//
// lab/models/energy2d/engines/this.js
//

var
  default_config = require('./default-config.js'),
  constants      = require('./constants.js'),
  Photon         = require('./photon.js').Photon,
  hypot          = require('./utils/math.js').hypot,
  shape_utils    = require('./utils/shape.js'),
  Line           = require('./utils/shape.js').Line,
  Polygon        = require('./utils/shape.js').Polygon,
  Rectangle      = require('./utils/shape.js').Rectangle,
  Ellipse        = require('./utils/shape.js').Ellipse,
  Ring           = require('./utils/shape.js').Ring,

  // Part's constants.
  RADIATOR_SPACING = 0.5,
  MINIMUM_RADIATING_TEMPERATUE = 20,
  UNIT_SURFACE_AREA = 100,
  SIN30 = Math.sin(Math.PI / 6),
  COS30 = Math.cos(Math.PI / 6),
  SIN60 = Math.sin(Math.PI / 3),
  COS60 = Math.cos(Math.PI / 3);

var Part = exports.Part = function (options) {
  'use strict';
  var count, i, s;

  options = default_config.fillWithDefaultValues(options, default_config.DEFAULT_VALUES.part);

  // Validate and process options.

  // Check shape
  if (options.rectangle) {
    s = this.rectangle = options.rectangle;
    this.shape = new Rectangle(s.x, s.y, s.width, s.height);
  } else if (options.ellipse) {
    s = this.ellipse = options.ellipse;
    this.shape = new Ellipse(s.x, s.y, s.a, s.b);
  } else if (options.ring) {
    s = this.ring = options.ring;
    this.shape = new Ring(s.x, s.y, s.inner, s.outer);
  } else if (options.polygon) {
    this.polygon = options.polygon;
    if (typeof (this.polygon.vertices) === "string") {
      count = this.polygon.count;
      this.polygon.vertices = this.polygon.vertices.split(', ');
      this.polygon.x_coords = [];
      this.polygon.y_coords = [];
      if (count * 2 !== this.polygon.vertices.length) {
        throw new Error("Part: polygon contains different vertices count than declared in the count parameter.");
      }
      for (i = 0; i < count; i += 1) {
        this.polygon.x_coords[i] = this.polygon.vertices[2 * i]     = Number(this.polygon.vertices[2 * i]);
        this.polygon.y_coords[i] = this.polygon.vertices[2 * i + 1] = Number(this.polygon.vertices[2 * i + 1]);
      }
      this.shape = new Polygon(count, this.polygon.x_coords, this.polygon.y_coords);
    }
  } else {
    throw new Error("Part: shape not defined.");
  }

  // source properties
  this.thermal_conductivity = options.thermal_conductivity;
  this.specific_heat = options.specific_heat;
  this.density = options.density;
  this.temperature = options.temperature;
  this.constant_temperature = options.constant_temperature;
  this.power = options.power;
  this.wind_speed = options.wind_speed;
  this.wind_angle = options.wind_angle;

  // optics properties
  this.transmission = options.transmission;
  this.reflection = options.reflection;
  this.absorption = options.absorption;
  this.emissivity = options.emissivity;

  // visual properties
  this.visible = options.visible;
  this.filled = options.filled;
  this.color = options.color;
  this.texture = options.texture;
  this.label = options.label;
};

Part.prototype.getLabel = function () {
  'use strict';
  var label = this.label, s;

  if (label === "%temperature") {
    s = this.temperature + " \u00b0C";
  } else if (label === "%density") {
    s = this.density + " kg/m\u00b3";
  } else if (label === "%specific_heat") {
    s = this.specific_heat + " J/(kg\u00d7\u00b0C)";
  } else if (label === "%thermal_conductivity") {
    s = this.thermal_conductivity + " W/(m\u00d7\u00b0C)";
  } else if (label === "%power_density") {
    s = this.power + " W/m\u00b3";
  } else if (label === "%area") {
    if (this.rectangle) {
      s = (this.rectangle.width * this.rectangle.height) + " m\u00b2";
    } else if (this.ellipse) {
      s = (this.ellipse.width * this.ellipse.height * 0.25 * Math.PI) + " m\u00b2";
    }
  } else if (label === "%width") {
    if (this.rectangle) {
      s = this.rectangle.width + " m";
    } else if (this.ellipse) {
      s = this.ellipse.width + " m";
    }
  } else if (label === "%height") {
    if (this.rectangle) {
      s = this.rectangle.height + " m";
    } else if (this.ellipse) {
      s = this.ellipse.height + " m";
    }
  } else {
    s = label;
  }
  return s;
};

// Returns cells occupied by part on the given grid
// Grid is described by:
//   nx - grid columns count
//   ny - grid rows count
//   lx - grid width
//   ly - grid height
// TODO: refactor it, probably using contains method.
Part.prototype.getGridCells = function (nx, ny, lx, ly) {
  'use strict';
  var
    nx1 = nx - 1,
    ny1 = ny - 1,
    dx = nx1 / lx,
    dy = ny1 / ly,

    rectangleIndices = function (rect) {
      var i, j, i0, j0, i_max, j_max, idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(rect.x * dx), 0), nx1);
      j0 = Math.min(Math.max(Math.ceil(rect.y * dy), 0), ny1);
      i_max = Math.min(Math.max(Math.floor((rect.x + rect.width) * dx), 0), nx1);
      j_max = Math.min(Math.max(Math.floor((rect.y + rect.height) * dy), 0), ny1);
      indices = new Array((i_max - i0 + 1) * (j_max - j0 + 1));
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ellipseIndices = function (ellipse) {
      var
        px = ellipse.x * dx,
        py = ellipse.y * dy,
        ra = ellipse.a * 0.5 * dx,
        rb = ellipse.b * 0.5 * dy,
        eq, i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ringIndices = function (ring) {
      var
        px = ring.x * dx,
        py = ring.y * dy,
        ra = ring.outer * 0.5 * dx,
        rb = ring.outer * 0.5 * dy,
        ra_inner = ring.inner * 0.5 * dx,
        rb_inner = ring.inner * 0.5 * dy,
        i, i0, i_max, j, j0, j1, j2, j_max, eq,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);

      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);

        if (Math.abs(i - px) < ra_inner) {
          // also calculate inner ellipse
          eq = Math.sqrt(1 - (i - px) * (i - px) / (ra_inner * ra_inner));
          j1 = Math.min(Math.max(Math.ceil(py - rb_inner * eq), 0), ny1);
          j2 = Math.min(Math.max(Math.floor(py + rb_inner * eq), 0), ny1);
          for (j = j0; j <= j1; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
          for (j = j2; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        } else {
          // consider only outer ellipse
          for (j = j0; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    },

    polygonIndices = function (polygon) {
      var
        count = polygon.count,
        verts = polygon.vertices,
        x_coords = new Array(count),
        y_coords = new Array(count),
        x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE,
        y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE,
        i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      for (i = 0; i < count; i += 1) {
        x_coords[i] = verts[i * 2] * dx;
        y_coords[i] = verts[i * 2 + 1] * dy;
        if (x_coords[i] < x_min) {
          x_min = x_coords[i];
        }
        if (x_coords[i] > x_max) {
          x_max = x_coords[i];
        }
        if (y_coords[i] < y_min) {
          y_min = y_coords[i];
        }
        if (y_coords[i] > y_max) {
          y_max = y_coords[i];
        }
      }

      i0 = Math.min(Math.max(Math.round(x_min), 0), nx1);
      j0 = Math.min(Math.max(Math.round(y_min), 0), ny1);
      i_max = Math.min(Math.max(Math.round(x_max), 0), nx1);
      j_max = Math.min(Math.max(Math.round(y_max), 0), ny1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          if (shape_utils.pointInsidePolygon(count, x_coords, y_coords, i, j)) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    };

  if (this.rectangle) {
    return rectangleIndices(this.rectangle);
  }
  if (this.ellipse) {
    return ellipseIndices(this.ellipse);
  }
  if (this.ring) {
    return ringIndices(this.ring);
  }
  if (this.polygon) {
    return polygonIndices(this.polygon);
  }
  throw new Error("Part: unknown shape.");
};

// Tests if the specified coordinates are inside the boundary of the Part.
Part.prototype.contains = function (x, y) {
  'use strict';
  return this.shape.contains(x, y);
};

// Test whether part reflects given Photon p.
Part.prototype.reflect = function (p, time_step) {
  'use strict';
  // Try to reflect when part's reflection equals ~1.
  if (Math.abs(this.reflection - 1) < 0.001) {
    return p.reflect(this.shape, time_step);
  }
  // Other case.
  return false;
};

// Test whether part absorbs given Photon p.
Part.prototype.absorb = function (p) {
  'use strict';
  // Absorb when absorption equals ~1 and photon is inside part's shape.
  if (Math.abs(this.absorption - 1) < 0.001) {
    return this.shape.contains(p.x, p.y);
  }
  // Other case.
  return false;
};

Part.prototype.getIrradiance = function (temperature) {
  'use strict';
  var t2;
  if (this.emissivity === 0) {
    return 0;
  }
  t2 = 273 + temperature;
  t2 *= t2;
  return this.emissivity * constants.STEFAN_CONSTANT * UNIT_SURFACE_AREA * t2 * t2;
};

// Emit photons if part meets radiation conditions.
Part.prototype.radiate = function (model) {
  'use strict';
  var
    // The shape is polygonized and radiateFromLine() is called for each line.
    poly = this.shape.polygonize(),
    line = new Line(),
    i, len;

  if (this.emissivity === 0) {
    return;
  }
  // Must follow the clockwise direction in setting lines.
  for (i = 0, len = poly.count - 1; i < len; i += 1) {
    line.x1 = poly.x_coords[i];
    line.y1 = poly.y_coords[i];
    line.x2 = poly.x_coords[i + 1];
    line.y2 = poly.y_coords[i + 1];
    this.radiateFromLine(model, line);
  }
  line.x1 = poly.x_coords[poly.count - 1];
  line.y1 = poly.y_coords[poly.count - 1];
  line.x2 = poly.x_coords[0];
  line.y2 = poly.y_coords[0];
  this.radiateFromLine(model, line);
};

// Helper function for radiate() method.
Part.prototype.radiateFromLine = function (model, line) {
  'use strict';
  var options, length, cos, sin, n, x, y, p, d, vx, vy, vxi, vyi, nray, ir,
    i, k;

  if (this.emissivity === 0) {
    return;
  }
  options = model.getModelOptions();
  length = hypot(line.x1 - line.x2, line.y1 - line.y2);
  cos = (line.x2 - line.x1) / length;
  sin = (line.y2 - line.y1) / length;
  n = Math.max(1, Math.round(length / RADIATOR_SPACING));
  vx = options.solar_ray_speed * sin;
  vy = -options.solar_ray_speed * cos;
  if (n === 1) {
    d = 0.5 * length;
    x = line.x1 + d * cos;
    y = line.y1 + d * sin;
    d = model.getAverageTemperatureAt(x, y);
    if (d > MINIMUM_RADIATING_TEMPERATUE) {
      d = model.getTemperatureAt(x, y);
      p = new Photon(x, y, this.getIrradiance(d), options.solar_ray_speed);
      p.vx = vx;
      p.vy = vy;
      model.addPhoton(p);
      if (!this.constant_temperature) {
        model.setTemperatureAt(x, y, d - p.energy / this.specific_heat);
      }
    }
  } else {
    vxi = new Array(4);
    vyi = new Array(4);
    vxi[0] = vx * COS30 - vy * SIN30;
    vyi[0] = vx * SIN30 + vy * COS30;
    vxi[1] = vy * SIN30 + vx * COS30;
    vyi[1] = vy * COS30 - vx * SIN30;
    vxi[2] = vx * COS60 - vy * SIN60;
    vyi[2] = vx * SIN60 + vy * COS60;
    vxi[3] = vy * SIN60 + vx * COS60;
    vyi[3] = vy * COS60 - vx * SIN60;
    nray = 1 + vxi.length;
    for (i = 0; i < n; i += 1) {
      d = (i + 0.5) * RADIATOR_SPACING;
      x = line.x1 + d * cos;
      y = line.y1 + d * sin;
      d = model.getAverageTemperatureAt(x, y);
      ir = this.getIrradiance(d) / nray;
      if (d > MINIMUM_RADIATING_TEMPERATUE) {
        p = new Photon(x, y, ir, options.solar_ray_speed);
        p.vx = vx;
        p.vy = vy;
        model.addPhoton(p);
        for (k = 0; k < nray - 1; k += 1) {
          p = new Photon(x, y, ir, options.solar_ray_speed);
          p.vx = vxi[k];
          p.vy = vyi[k];
          model.addPhoton(p);
        }
        if (!this.constant_temperature) {
          model.changeAverageTemperatureAt(x, y, -ir * nray / this.specific_heat);
        }
      }
    }
  }
};

});

require.define("/default-config.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engines/default-config.js
//

var constants = require('./constants.js');

// This object defines default values for different configuration objects.
//
// It's used to provide a default value of property if it isn't defined.
// Object contains some undefined values to show that they are available, but optional.
exports.DEFAULT_VALUES = {
  // Default model properties.
  "model": {
    "use_WebGL": false,
    "grid_width": 100,
    "grid_height": 100,

    "model_width": 10,
    "model_height": 10,
    "timestep": 1,
    "convective": true,

    "background_temperature": 0,
    "background_conductivity": constants.AIR_THERMAL_CONDUCTIVITY,
    "background_specific_heat": constants.AIR_SPECIFIC_HEAT,
    "background_density": constants.AIR_DENSITY,
    "background_viscosity": constants.AIR_VISCOSITY,

    "thermal_buoyancy": 0.00025,
    "buoyancy_approximation": 1,

    "boundary": {
      "temperature_at_border": {
        "upper": 0,
        "lower": 0,
        "left": 0,
        "right": 0
      }
    },

    "measurement_interval": 500,        // unnecessary
    "viewupdate_interval": 100,         // unnecessary
    "stoptime": undefined,              // unnecessary
    "sunny": false,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,

    "structure": undefined
    // Structure can be undefined.
    // However, its desired form is:
    // "structure": {
    //   "part": [ 
    //     {
    //       ... part definition (see part fallback values below)
    //     },
    //     {
    //       ... second part definition
    //     },
    //   ]
    // }
  },

  // Default part properties.
  "part": {
    "thermal_conductivity": 1,
    "specific_heat": 1300,
    "density": 25,
    "transmission": 0,
    "reflection": 0,
    "absorption": 1,
    "emissivity": 0,
    "temperature": 0,
    "constant_temperature": false,
    "power": 0,
    "wind_speed": 0,
    "wind_angle": 0,
    "visible": true,
    "filled": true,
    "color": "gray",
    "label": undefined,
    "texture": undefined,
    // Texture can be undefined.
    // However, its desired form is (contains example values):
    // {
    //   "texture_fg": -0x1000000,
    //   "texture_bg": -0x7f7f80,
    //   "texture_style": 12,
    //   "texture_width": 12,
    //   "texture_height": 12
    // },
    "uid": undefined,       // unnecessary (not yet implemented)    
    "draggable": true       // unnecessary (not yet implemented)

    // Part should declare also *ONE* of available shapes:
    // 
    // "rectangle": {
    //   "x": 5,
    //   "y": 5,
    //   "width": 2,
    //   "height": 2
    // },
    // "ellipse": {
    //   "x": 5,
    //   "y": 5,
    //   "a": 3,
    //   "b": 3
    // },
    // "ring": {
    //   "x": 5,
    //   "y": 5,
    //   "inner": 1,
    //   "outer": 2
    // },
    // "polygon": {
    //   "count": 3,                    // Vertices count.
    //   "vertices": "1, 1, 2, 2, 3, 3" // String with coordinates.   
    // },
  }
};


// Returns configuration with default properties if the given configuration is not declaring them.
// Existing properties are copied into result.
exports.fillWithDefaultValues = function (config, default_config) {
  'use strict';
  var
    name,
    result,
    clone = function (obj) {
      // Clone to avoid situation when modification of the configuration
      // alters global default configuration.
      if (obj === undefined) {
        return undefined;
      }
      // a way of deep-cloning objects
      return JSON.parse(JSON.stringify(obj));
    };

  if (config === undefined) {
    // Return just default properties.
    return clone(default_config);
  }

  // Keep existing properties
  result = clone(config);
  // and add defaults.
  for (name in default_config) {
    if (default_config.hasOwnProperty(name) && config[name] === undefined) {
      result[name] = clone(default_config[name]);
    }
  }
  return result;
};

});

require.define("/constants.js", function (require, module, exports, __dirname, __filename) {
//
// lab/models/energy2d/engines/constants.js
//

// Basic constants used by Energy2D module
// TODO: follow convention of MD2D constants module


exports.AIR_THERMAL_CONDUCTIVITY = 0.025;       // Air's thermal conductivity = 0.025 W/(m*K)
exports.AIR_SPECIFIC_HEAT = 1012;               // Air's specific heat = 1012 J/(kg*K)
exports.AIR_DENSITY = 1.204;                    // Air's density = 1.204 kg/m^3 at 25 C

// By default, air's kinematic viscosity = 1.568 x 10^-5 m^2/s at 27 C is
// used. It can be set to zero for inviscid fluid.
exports.AIR_VISCOSITY = 0.00001568;


// Stefan's constant unit J/(s*m^2*K^-4)
exports.STEFAN_CONSTANT = 0.0000000567;
});

require.define("/core-model.js", function (require, module, exports, __dirname, __filename) {
    /*globals Float32Array: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true */
// JSLint report: OK (complains about 'new' for side effect and Array(size) constructor)
//
// lab/models/energy2d/engines/core-model.js
//

var
  arrays          = require('./arrays/arrays.js').arrays,
  heatsolver      = require('./physics-solvers/heat-solver.js'),
  heatsolver_GPU  = require('./physics-solvers-gpu/heat-solver-gpu.js'),
  fluidsolver     = require('./physics-solvers/fluid-solver.js'),
  fluidsolver_GPU = require('./physics-solvers-gpu/fluid-solver-gpu.js'),
  raysolver       = require('./physics-solvers/ray-solver.js'),
  part            = require('./part.js'),
  default_config  = require('./default-config.js'),
  gpgpu,       // = energy2d.utils.gpu.gpgpu - assign it only when WebGL requested (initGPGPU), 
               //   as it is unavailable in the node.js environment.

  array_type = (function () {
    'use strict';
    try {
      new Float32Array();
    } catch (e) {
      return 'regular';
    }
    return 'Float32Array';
  }());

// Core Energy2D model.
// 
// It creates and manages all the data and parameters used for calculations.
exports.makeCoreModel = function (model_options) {
  'use strict';
  var
    // Validate provided options.
    opt = (function () {
      var boundary;

      model_options = default_config.fillWithDefaultValues(model_options, default_config.DEFAULT_VALUES.model);

      // Validation.
      //
      // Check boundary settings, as they have complex structure.
      boundary = model_options.boundary.temperature_at_border || model_options.boundary.flux_at_border;
      if (!boundary) {
        throw new Error("Core model: missing boundary settings.");
      } else if (boundary.upper === undefined ||
                 boundary.right === undefined ||
                 boundary.lower === undefined ||
                 boundary.left  === undefined) {
        throw new Error("Core model: incomplete boundary settings.");
      }

      return model_options;
    }()),

    // WebGL GPGPU optimization.
    use_WebGL = opt.use_WebGL,
    // This variable holds possible error message connected with WebGL.
    WebGL_error,

    // Simulation grid dimensions.
    nx = opt.grid_width,
    ny = opt.grid_height,
    array_size = nx * ny,

    // Spacing.
    delta_x = opt.model_width / nx,
    delta_y = opt.model_height / ny,

    // Simulation steps counter.
    indexOfStep = 0,

    // Physics solvers
    // (initialized later, when core model object is built).
    heatSolver,
    fluidSolver,
    ray_solver,

    // GPU versions of solvers.
    heat_solver_gpu,
    fluid_solver_gpu,

    // Optimization flags.
    radiative,
    has_part_power,

    // Performance model.
    // By default, mock this object.
    // To measure performance, set valid object
    // using core_model.setPerformanceTools(tools);
    perf = {
      start: function () {},
      stop: function () {},
      startFPS: function () {},
      updateFPS: function () {},
      stopFPS: function () {}
    },

    //
    // Simulation arrays:
    //
    // - temperature array
    t = arrays.create(array_size, opt.background_temperature, array_type),
    // - internal temperature boundary array
    tb = arrays.create(array_size, NaN, array_type),
    // - velocity x-component array (m/s)
    u = arrays.create(array_size, 0, array_type),
    // - velocity y-component array (m/s)
    v = arrays.create(array_size, 0, array_type),
    // - internal heat generation array
    q = arrays.create(array_size, 0, array_type),
    // - wind speed
    uWind = arrays.create(array_size, 0, array_type),
    vWind = arrays.create(array_size, 0, array_type),
    // - conductivity array
    conductivity = arrays.create(array_size, opt.background_conductivity, array_type),
    // - specific heat capacity array
    capacity = arrays.create(array_size, opt.background_specific_heat, array_type),
    // - density array
    density = arrays.create(array_size, opt.background_density, array_type),
    // - fluid cell array
    fluidity = arrays.create(array_size, true, array_type),
    // - photons array
    photons = [],

    //
    // [GPGPU] Simulation textures:
    //
    // texture 0: 
    // - R: t
    // - G: t0
    // - B: tb
    // - A: conductivity
    // texture 1: 
    // - R: q
    // - G: capacity
    // - B: density
    // - A: fluidity
    // texture 2: 
    // - R: u
    // - G: v
    // - B: u0
    // - A: v0
    // texture 3: 
    // - R: uWind
    // - G: vWind
    // - B: undefined
    // - A: undefined
    texture = [],


    // Generate parts array.
    parts = (function () {
      var
        result = [],
        parts_options,
        i, len;

      if (opt.structure && opt.structure.part) {
        parts_options = opt.structure.part;
        if (parts_options.constructor !== Array) {
          parts_options = [parts_options];
        }

        result = new Array(parts_options.length);
        for (i = 0, len = parts_options.length; i < len; i += 1) {
          result[i] = new part.Part(parts_options[i]);
        }
      }
      return result;
    }()),

    //  
    // Private methods  
    //      
    initGPGPU = function () {
      // Make sure that environment is a browser.
      if (typeof window === 'undefined') {
        throw new Error("Core model: WebGL GPGPU unavailable in the node.js environment.");
      }
      // Request GPGPU utilities.
      gpgpu = energy2d.utils.gpu.gpgpu;
      // Init module.
      // Width is ny, height is nx (due to data organization).
      try {
        gpgpu.init(ny, nx);
      } catch (e) {
        // If WebGL initialization fails, just use CPU.
        use_WebGL = false;
        // Set error message.
        WebGL_error = e.message;
        // TODO: inform better.
        console.warn("WebGL initialization failed. Energy2D will use CPU solvers.");
        return;
      }
      // Create simulation textures.
      texture[0] = gpgpu.createTexture();
      texture[1] = gpgpu.createTexture();
      texture[2] = gpgpu.createTexture();
      texture[3] = gpgpu.createTexture();

      // Update textures as material properties should be already set.
      // texture 0: 
      // - R: t
      // - G: t0
      // - B: tb
      // - A: conductivity
      gpgpu.writeRGBATexture(texture[0], t, t, tb, conductivity);
      // texture 1: 
      // - R: q
      // - G: capacity
      // - B: density
      // - A: fluidity
      gpgpu.writeRGBATexture(texture[1], q, capacity, density, fluidity);
      // texture 2: 
      // - R: u
      // - G: v
      // - B: u0
      // - A: v0
      gpgpu.writeRGBATexture(texture[2], u, v, u, v);
      // texture 3: 
      // - R: uWind
      // - G: vWind
      // - B: undefined
      // - A: undefined
      gpgpu.writeRGBATexture(texture[3], uWind, vWind, uWind, vWind);

      // Create GPU solvers.
      // GPU version of heat solver.
      heat_solver_gpu = heatsolver_GPU.makeHeatSolverGPU(core_model);
      // GPU version of fluid solver.
      fluid_solver_gpu = fluidsolver_GPU.makeFluidSolverGPU(core_model);
    },

    setupMaterialProperties = function () {
      var
        lx = opt.model_width,
        ly = opt.model_height,
        part, indices, idx,
        i, ii, len;

      if (!parts || parts.length === 0) {
        return;
      }

      // workaround, to treat overlapping parts as original Energy2D
      for (i = parts.length - 1; i >= 0; i -= 1) {
        part = parts[i];
        indices = part.getGridCells(nx, ny, lx, ly);
        for (ii = 0, len = indices.length; ii < len; ii += 1) {
          idx = indices[ii];

          fluidity[idx] = false;
          t[idx] = part.temperature;
          q[idx] = part.power;
          conductivity[idx] = part.thermal_conductivity;
          capacity[idx] = part.specific_heat;
          density[idx] = part.density;

          if (part.wind_speed !== 0) {
            uWind[idx] = part.wind_speed * Math.cos(part.wind_angle);
            vWind[idx] = part.wind_speed * Math.sin(part.wind_angle);
          }

          if (part.constant_temperature) {
            tb[idx] = part.temperature;
          }
        }
      }
    },

    refreshPowerArray = function () {
      var part, x, y, i, iny, j, k, len;
      for (i = 0; i < nx; i += 1) {
        x = i * delta_x;
        iny = i * ny;
        for (j = 0; j < ny; j += 1) {
          y = j * delta_y;
          q[iny + j] = 0;
          if (has_part_power) {
            for (k = 0, len = parts.length; k < len; k += 1) {
              part = parts[k];
              if (part.power !== 0 && part.shape.contains(x, y)) {
                // No overlap of parts will be allowed.
                q[iny + j] = part.getPower();
                break;
              }
            }
          }
        }
      }
    },

    //
    // Public API
    //
    core_model = {
      // !!!
      // Performs next step of a simulation.
      // !!!
      nextStep: function () {
        perf.start('Core model step');
        if (use_WebGL) {
          // GPU solvers.
          if (opt.convective) {
            perf.start('Fluid solver GPU');
            fluid_solver_gpu.solve();
            perf.stop('Fluid solver GPU');
          }
          perf.start('Heat solver GPU');
          heat_solver_gpu.solve(opt.convective);
          perf.stop('Heat solver GPU');
        } else {
          // CPU solvers.
          if (radiative) {
            perf.start('Ray solver CPU');
            if (indexOfStep % opt.photon_emission_interval === 0) {
              refreshPowerArray();
              if (opt.sunny) {
                ray_solver.sunShine();
              }
              ray_solver.radiate();
            }
            ray_solver.solve();
            perf.stop('Ray solver CPU');
          }
          if (opt.convective) {
            perf.start('Fluid solver CPU');
            fluidSolver.solve(u, v);
            perf.stop('Fluid solver CPU');
          }
          perf.start('Heat solver CPU');
          heatSolver.solve(opt.convective, t, q);
          perf.stop('Heat solver CPU');
        }
        indexOfStep += 1;
        perf.stop('Core model step');
      },

      // Sets performance tools.
      // It's expected to be an object created by
      // energy2d.utils.performance.makePerformanceTools
      setPerformanceTools: function (perf_tools) {
        perf = perf_tools;
      },

      isWebGLActive: function () {
        return use_WebGL;
      },

      getWebGLError: function () {
        return WebGL_error;
      },

      updateTemperatureArray: function () {
        if (use_WebGL) {
          perf.start('Read temperature texture');
          gpgpu.readTexture(texture[0], t);
          perf.stop('Read temperature texture');
        }
      },

      updateVelocityArrays: function () {
        if (use_WebGL) {
          perf.start('Read velocity texture');
          gpgpu.readTexture(texture[2], u, 0);
          gpgpu.readTexture(texture[2], v, 1);
          perf.stop('Read velocity texture');
        }
      },

      getIndexOfStep: function () {
        return indexOfStep;
      },
      // Returns loaded options after validation.
      getModelOptions: function () {
        return opt;
      },

      // Temperature manipulation.
      getTemperatureAt: function (x, y) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        return t[i * ny + j];
      },

      setTemperatureAt: function (x, y, temperature) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        t[i * ny + j] = temperature;
      },

      getAverageTemperatureAt: function (x, y) {
        var
          temp = 0,
          nx1 = nx - 1,
          ny1 = ny - 1,
          i0 = Math.round(x / delta_x),
          j0 = Math.round(y / delta_y),
          i, j;

        i = Math.max(Math.min(nx1, i0), 0);
        j = Math.max(Math.min(ny1, j0), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0 + 1), 0);
        j = Math.max(Math.min(ny1, j0), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0 - 1), 0);
        j = Math.max(Math.min(ny1, j0), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0), 0);
        j = Math.max(Math.min(ny1, j0 + 1), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0), 0);
        j = Math.max(Math.min(ny1, j0 - 1), 0);
        temp += t[i * ny + j];
        return temp * 0.2;
      },

      // TODO: based on Java version, check it as the logic seems to be weird.
      changeAverageTemperatureAt: function (x, y, increment) {
        var
          nx1 = nx - 1,
          ny1 = ny - 1,
          i0 = Math.round(x / delta_x),
          j0 = Math.round(y / delta_y),
          i, j;

        increment *= 0.2;
        i = Math.min(nx1, i0);
        j = Math.min(ny1, j0);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0 + 1);
        j = Math.min(ny1, j0);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0 - 1);
        j = Math.min(ny1, j0);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0);
        j = Math.min(ny1, j0 + 1);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0);
        j = Math.min(ny1, j0 - 1);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
      },

      addPhoton: function (photon) {
        photons.push(photon);
      },

      removePhoton: function (photon) {
        var idx = photons.indexOf(photon);
        if (idx !== -1) {
          photons.splice(idx, 1);
        }
      },

      copyTextureToArray: function (tex, array) {
        gpgpu.readTexture(tex, array);
      },

      copyArrayToTexture: function (array, tex) {
        gpgpu.writeTexture(tex, array);
      },

      // Simple getters.
      getArrayType: function () {
        // return module variable
        return array_type;
      },
      getGridWidth: function () {
        return nx;
      },
      getGridHeight: function () {
        return ny;
      },
      getPerformanceModel: function () {
        return perf;
      },
      // Arrays.
      getTemperatureArray: function () {
        return t;
      },
      getUVelocityArray: function () {
        return u;
      },
      getVVelocityArray: function () {
        return v;
      },
      getUWindArray: function () {
        return uWind;
      },
      getVWindArray: function () {
        return vWind;
      },
      getBoundaryTemperatureArray: function () {
        return tb;
      },
      getPowerArray: function () {
        return q;
      },
      getConductivityArray: function () {
        return conductivity;
      },
      getCapacityArray: function () {
        return capacity;
      },
      getDensityArray: function () {
        return density;
      },
      getFluidityArray: function () {
        return fluidity;
      },
      getPhotonsArray: function () {
        return photons;
      },
      getPartsArray: function () {
        return parts;
      },
       // Textures.
      getTemperatureTexture: function () {
        return texture[0];
      },
      getVelocityTexture: function () {
        return texture[2];
      },
      getSimulationTexture: function (id) {
        return texture[id];
      }
    };

  // 
  // One-off initialization.
  //

  // Setup optimization flags.
  radiative = (function () {
    var i, len;
    if (opt.sunny) {
      return true;
    }
    for (i = 0, len = parts.length; i < len; i += 1) {
      if (parts[i].emissivity > 0) {
        return true;
      }
    }
    return false;
  }());

  has_part_power = (function () {
    var i, len;
    for (i = 0, len = parts.length; i < len; i += 1) {
      if (parts[i].power > 0) {
        return true;
      }
    }
    return false;
  }());

  setupMaterialProperties();

  // CPU version of solvers.
  heatSolver = heatsolver.makeHeatSolver(core_model);
  fluidSolver = fluidsolver.makeFluidSolver(core_model);
  ray_solver = raysolver.makeRaySolver(core_model);

  if (use_WebGL) {
    initGPGPU();
  }

  // Finally, return public API object.
  return core_model;
};

});
require("/core-model.js");
/*globals energy2d */
/*jslint indent: 2, node: true */
// JSLint report: OK
//
// lab/models/energy2d/modeler.js
//

// Why not require('./engine/core-model.js')?
// This file is not browserified, only concatenated with browserified engine.
var coremodel = require('./core-model.js');

// define namespace
energy2d.namespace('energy2d.modeler');

energy2d.modeler.makeModeler = function (options) {
  'use strict';
  var core_model = coremodel.makeCoreModel(options);

  return {
    nextStep: function () {
      core_model.nextStep();
    },
    getWidth: function () {
      return core_model.getModelOptions().model_width;
    },
    getHeight: function () {
      return core_model.getModelOptions().model_height;
    },
    getTime: function () {
      return core_model.getModelOptions().timestep * core_model.getIndexOfStep();
    },
    isWebGLActive: core_model.isWebGLActive,
    getWebGLError: core_model.getWebGLError,
    getIndexOfStep: core_model.getIndexOfStep,
    getGridWidth: core_model.getGridWidth,
    getGridHeight: core_model.getGridHeight,
    getTemperatureArray: core_model.getTemperatureArray,
    getTemperatureTexture: core_model.getTemperatureTexture,
    getUVelocityArray: core_model.getUVelocityArray,
    getVVelocityArray: core_model.getVVelocityArray,
    getVelocityTexture: core_model.getVelocityTexture,
    getPhotonsArray: core_model.getPhotonsArray,
    getPartsArray: core_model.getPartsArray,
    updateTemperatureArray: core_model.updateTemperatureArray,
    updateVelocityArrays: core_model.updateVelocityArrays,
    setPerformanceTools: core_model.setPerformanceTools
  };
};
/*globals energy2d: false */
/*jslint indent: 2, browser: true */
//
// lab/utils/energy2d/gpu/init.js
//

// define namespace
energy2d.namespace('energy2d.utils.gpu');


// The internal `gl` variable holds the current WebGL context.
// It's used by other energy2d.utils.gpu classes and modules.
var gl;

// WebGL Context manager.
//
// It provides access to one, global WebGL context.
// All clients interested in WebGL context should call:
// energy2d.utils.gpu.gl.getContext()
// If WebGL is not available, an appropriate error will be thrown.
energy2d.utils.gpu.init = function () {
  'use strict';
  var canvas = document.createElement('canvas');
  try {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  } catch (e) {}
  if (!gl) {
    throw new Error('GL: WebGL not supported.');
  }
  // Self-defining function.
  // During next call just return initialized context.
  energy2d.utils.gpu.init = function () {
    return gl;
  };
  // Export WebGL context.
  energy2d.utils.gpu.gl = gl;
  return gl;
};

// Helper functions which checks if WebGL Context is ready and initialized.
energy2d.utils.gpu.assertInitialized = function () {
  'use strict';
  if (!gl) {
    throw new Error("GPU: WebGL not initialized. Call energy2d.utils.gpu.init().");
  }
};/*globals energy2d: false, gl: false, Float32Array: false, Uint16Array: false */
/*jslint indent: 2, browser: true */
//
// lab/utils/energy2d/gpu/mesh.js
//

// define namespace
energy2d.namespace('energy2d.utils.gpu');


//
// Local, private classes and utilities.
//

// Provides a simple method of uploading data to a GPU buffer. Example usage:
// 
//     var vertices = new GL.Buffer(gl.ARRAY_BUFFER, Float32Array);
//     var indices = new GL.Buffer(gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
//     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
//     indices.data = [[0, 1, 2], [2, 1, 3]];
//     vertices.compile();
//     indices.compile();
// 
function Buffer(target, type) {
  'use strict';
  this.buffer = null;
  this.target = target;
  this.type = type;
  this.data = [];
}

// Upload the contents of `data` to the GPU in preparation for rendering. The
// data must be a list of lists where each inner list has the same length. For
// example, each element of data for vertex normals would be a list of length three.
// This will remember the data length and element length for later use by shaders.
// The type can be either `gl.STATIC_DRAW` or `gl.DYNAMIC_DRAW`, and defaults to
// `gl.STATIC_DRAW`.
// 
// This could have used `[].concat.apply([], this.data)` to flatten
// the array but Google Chrome has a maximum number of arguments so the
// concatenations are chunked to avoid that limit.
Buffer.prototype.compile = function (type) {
  'use strict';
  var data = [], i, chunk, spacing;
  for (i = 0, chunk = 10000; i < this.data.length; i += chunk) {
    data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));
  }
  spacing = this.data.length ? data.length / this.data.length : 0;
  if (spacing !== Math.round(spacing)) {
    throw new Error('Mesh: buffer elements not of consistent size, average size is ' + spacing);
  }
  this.buffer = this.buffer || gl.createBuffer();
  this.buffer.length = data.length;
  this.buffer.spacing = spacing;
  gl.bindBuffer(this.target, this.buffer);
  gl.bufferData(this.target, new this.type(data), type || gl.STATIC_DRAW);
};


// Represents a collection of vertex buffers and index buffers. Each vertex
// buffer maps to one attribute in GLSL and has a corresponding property set
// on the Mesh instance. There is one vertex buffer by default: `vertices`,
// which maps to `gl_Vertex`. The `coords`, `normals`, and `colors` vertex
// buffers map to `gl_TexCoord`, `gl_Normal`, and `gl_Color` respectively,
// and can be enabled by setting the corresponding options to true. There are
// two index buffers, `triangles` and `lines`, which are used for rendering
// `gl.TRIANGLES` and `gl.LINES`, respectively. Only `triangles` is enabled by
// default, although `computeWireframe()` will add a normal buffer if it wasn't
// initially enabled.
energy2d.utils.gpu.Mesh = function (options) {
  'use strict';
  options = options || {};
  this.vertexBuffers = {};
  this.indexBuffers = {};
  this.addVertexBuffer('vertices', 'gl_Vertex');
  if (options.coords) {
    this.addVertexBuffer('coords', 'gl_TexCoord');
  }
  if (options.normals) {
    this.addVertexBuffer('normals', 'gl_Normal');
  }
  if (options.colors) {
    this.addVertexBuffer('colors', 'gl_Color');
  }
  if (options.lines === undefined || options.triangles) {
    this.addIndexBuffer('triangles');
  }
  if (options.lines) {
    this.addIndexBuffer('lines');
  }
};

// Add a new vertex buffer with a list as a property called `name` on this object
// and map it to the attribute called `attribute` in all shaders that draw this mesh.
energy2d.utils.gpu.Mesh.prototype.addVertexBuffer = function (name, attribute) {
  'use strict';
  var buffer = this.vertexBuffers[attribute] = new Buffer(gl.ARRAY_BUFFER, Float32Array);
  buffer.name = name;
  this[name] = [];
};

// Add a new index buffer with a list as a property called `name` on this object.
energy2d.utils.gpu.Mesh.prototype.addIndexBuffer = function (name) {
  'use strict';
  var buffer = this.indexBuffers[name] = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
  this[name] = [];
};

// Upload all attached buffers to the GPU in preparation for rendering. This
// doesn't need to be called every frame, only needs to be done when the data
// changes.
energy2d.utils.gpu.Mesh.prototype.compile = function () {
  'use strict';
  var attribute, name, buffer;
  for (attribute in this.vertexBuffers) {
    if (this.vertexBuffers.hasOwnProperty(attribute)) {
      buffer = this.vertexBuffers[attribute];
      buffer.data = this[buffer.name];
      buffer.compile();
    }
  }

  for (name in this.indexBuffers) {
    if (this.indexBuffers.hasOwnProperty(name)) {
      buffer = this.indexBuffers[name];
      buffer.data = this[name];
      buffer.compile();
    }
  }
};

// Generates a square 2x2 mesh the xy plane centered at the origin. The
// `options` argument specifies options to pass to the mesh constructor.
// Additional options include `detailX` and `detailY`, which set the tesselation
// in x and y, and `detail`, which sets both `detailX` and `detailY` at once.
// Two triangles are generated by default.
// Example usage:
// 
//     var mesh1 = GL.Mesh.plane();
//     var mesh2 = GL.Mesh.plane({ detail: 5 });
//     var mesh3 = GL.Mesh.plane({ detailX: 20, detailY: 40 });
// 
energy2d.utils.gpu.Mesh.plane = function (options) {
  'use strict';
  var mesh, detailX, detailY, x, y, t, s, i;
  options = options || {};
  mesh = new energy2d.utils.gpu.Mesh(options);
  detailX = options.detailX || options.detail || 1;
  detailY = options.detailY || options.detail || 1;

  for (y = 0; y <= detailY; y += 1) {
    t = y / detailY;
    for (x = 0; x <= detailX; x += 1) {
      s = x / detailX;
      mesh.vertices.push([2 * s - 1, 2 * t - 1, 0]);
      if (mesh.coords) {
        mesh.coords.push([s, t]);
      }
      if (mesh.normals) {
        mesh.normals.push([0, 0, 1]);
      }
      if (x < detailX && y < detailY) {
        i = x + y * (detailX + 1);
        mesh.triangles.push([i, i + 1, i + detailX + 1]);
        mesh.triangles.push([i + detailX + 1, i + 1, i + detailX + 2]);
      }
    }
  }

  mesh.compile();
  return mesh;
};/*globals energy2d: false, gl: false */
/*jslint indent: 2, browser: true, es5: true */
//
// lab/utils/energy2d/gpu/shader.js
//

// define namespace
energy2d.namespace('energy2d.utils.gpu');

//
// Local, private functions.
//
function regexMap(regex, text, callback) {
  'use strict';
  var result;
  while ((result = regex.exec(text)) !== null) {
    callback(result);
  }
}

function isArray(obj) {
  'use strict';
  var str = Object.prototype.toString.call(obj);
  return str === '[object Array]' || str === '[object Float32Array]';
}

function isNumber(obj) {
  'use strict';
  var str = Object.prototype.toString.call(obj);
  return str === '[object Number]' || str === '[object Boolean]';
}

// Compiles a shader program using the provided vertex and fragment shaders.
energy2d.utils.gpu.Shader = function (vertexSource, fragmentSource) {
  'use strict';
  var
    // Headers are prepended to the sources to provide some automatic functionality.
    vertexHeader =
    '\
    attribute vec4 gl_Vertex;\
    attribute vec4 gl_TexCoord;\
    attribute vec3 gl_Normal;\
    attribute vec4 gl_Color;\
    ',
    fragmentHeader =
    '\
    precision highp float;\
    ',

    // The `gl_` prefix must be substituted for something else to avoid compile
    // errors, since it's a reserved prefix. This prefixes all reserved names with
    // `_`. The header is inserted after any extensions, since those must come
    // first.
    fix = function (header, source) {
      var replaced = {}, match;
      match = /^((\s*\/\/.*\n|\s*#extension.*\n)+)[^]*$/.exec(source);
      source = match ? match[1] + header + source.substr(match[1].length) : header + source;
      regexMap(/\bgl_\w+\b/g, header, function (result) {
        if (replaced[result] === undefined) {
          source = source.replace(new RegExp('\\b' + result + '\\b', 'g'), '_' + result);
          replaced[result] = true;
        }
      });
      return source;
    },

    isSampler = {};

  vertexSource = fix(vertexHeader, vertexSource);
  fragmentSource = fix(fragmentHeader, fragmentSource);

  // Compile and link errors are thrown as strings.
  function compileSource(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader: compile error.\n' + gl.getShaderInfoLog(shader) +
                      '\nSource:\n' + source);
    }
    return shader;
  }

  this.program = gl.createProgram();
  gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(this.program);
  if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
    throw new Error('Shader: link error.\n' + gl.getProgramInfoLog(this.program) +
                    '\nSource:\n' + vertexSource + '\n\n' + fragmentSource);
  }
  this.attributes = {};
  this.uniformLocations = {};

  // Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
  // To do this automatically, we detect and remember all uniform samplers in the source code.
  regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertexSource + fragmentSource, function (groups) {
    isSampler[groups[2]] = 1;
  });
  this.isSampler = isSampler;
};

// Set a uniform for each property of `uniforms`. The correct `gl.uniform*()` method is
// inferred from the value types and from the stored uniform sampler flags.
energy2d.utils.gpu.Shader.prototype.uniforms = function (uniforms) {
  'use strict';
  var name, location, value;

  gl.useProgram(this.program);

  for (name in uniforms) {
    if (uniforms.hasOwnProperty(name)) {
      if (this.uniformLocations[name] === undefined) {
        this.uniformLocations[name] = gl.getUniformLocation(this.program, name);
      }
      location = this.uniformLocations[name];
      if (location === null) {
        console.warn('Shader: name ' + name + ' does not correspond to an active uniform variable.');
        continue;
      }
      value = uniforms[name];
      if (isArray(value)) {
        switch (value.length) {
        case 1: gl.uniform1fv(location, new Float32Array(value)); break;
        case 2: gl.uniform2fv(location, new Float32Array(value)); break;
        case 3: gl.uniform3fv(location, new Float32Array(value)); break;
        case 4: gl.uniform4fv(location, new Float32Array(value)); break;
        // Matrices are automatically transposed, since WebGL uses column-major
        // indices instead of row-major indices.
        case 9: gl.uniformMatrix3fv(location, false, new Float32Array([
          value[0], value[3], value[6],
          value[1], value[4], value[7],
          value[2], value[5], value[8]
        ])); break;
        case 16: gl.uniformMatrix4fv(location, false, new Float32Array([
          value[0], value[4], value[8], value[12],
          value[1], value[5], value[9], value[13],
          value[2], value[6], value[10], value[14],
          value[3], value[7], value[11], value[15]
        ])); break;
        default: throw new Error('Shader: don\'t know how to load uniform "' + name + '" of length ' + value.length);
        }
      } else if (isNumber(value)) {
        (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
      } else {
        throw new Error('Shader: attempted to set uniform "' + name + '" to invalid value ' + value);
      }
    }
  }

  return this;
};

// Sets all uniform matrix attributes, binds all relevant buffers, and draws the
// mesh geometry as indexed triangles or indexed lines. Set `mode` to `gl.LINES`
// (and either add indices to `lines` or call `computeWireframe()`) to draw the
// mesh in wireframe.
energy2d.utils.gpu.Shader.prototype.draw = function (mesh, mode) {
  'use strict';
  gl.useProgram(this.program);

  this.drawBuffers(mesh.vertexBuffers,
    mesh.indexBuffers[mode === gl.LINES ? 'lines' : 'triangles'],
    arguments.length < 2 ? gl.TRIANGLES : mode);
};

// Sets all uniform matrix attributes, binds all relevant buffers, and draws the
// indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
// names to `Buffer` objects of type `gl.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
// object of type `gl.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
// like `gl.TRIANGLES` or `gl.LINES`. This method automatically creates and caches
// vertex attribute pointers for attributes as needed.
energy2d.utils.gpu.Shader.prototype.drawBuffers = function (vertexBuffers, indexBuffer, mode) {
  'use strict';
  // Create and enable attribute pointers as necessary.
  var length = 0, attribute, buffer, location;

  for (attribute in vertexBuffers) {
    if (vertexBuffers.hasOwnProperty(attribute)) {
      buffer = vertexBuffers[attribute];
      if (this.attributes[attribute] === undefined) {
        this.attributes[attribute] = gl.getAttribLocation(this.program, attribute.replace(/^gl_/, '_gl_'));
      }
      location = this.attributes[attribute];
      if (location === -1 || !buffer.buffer) {
        continue;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, buffer.buffer.spacing, gl.FLOAT, false, 0, 0);
      length = buffer.buffer.length / buffer.buffer.spacing;
    }
  }

  // Disable unused attribute pointers.
  for (attribute in this.attributes) {
    if (this.attributes.hasOwnProperty(attribute)) {
      if (vertexBuffers[attribute] === undefined) {
        gl.disableVertexAttribArray(this.attributes[attribute]);
      }
    }
  }

  // Draw the geometry.
  if (length && (!indexBuffer || indexBuffer.buffer)) {
    if (indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
      gl.drawElements(mode, indexBuffer.buffer.length, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(mode, 0, length);
    }
  }
};
/*globals energy2d: false, gl: false */
/*jslint indent: 2, browser: true */
//
// lab/utils/energy2d/gpu/texture.js
//

// define namespace
energy2d.namespace('energy2d.utils.gpu');

// Simple wrapper around WebGL textures that supports render-to-texture.
//
// The arguments `width` and `height` give the size of the texture in texels.
// WebGL texture dimensions must be powers of two unless `filter` is set to
// either `gl.NEAREST` or `gl.REPEAT` and `wrap` is set to `gl.CLAMP_TO_EDGE`
// (which they are by default).
//
// Texture parameters can be passed in via the `options` argument.
// Example usage:
// 
//     var t = new energy2d.utils.gpu.Texture(256, 256, {
//       // Defaults to gl.LINEAR, set both at once with "filter"
//       mag_filter: gl.NEAREST,
//       min_filter: gl.LINEAR,
// 
//       // Defaults to gl.CLAMP_TO_EDGE, set both at once with "wrap"
//       wrap_s: gl.REPEAT,
//       wrap_t: gl.REPEAT,
// 
//       format: gl.RGB, // Defaults to gl.RGBA
//       type: gl.FLOAT  // Defaults to gl.UNSIGNED_BYTE
//     });
energy2d.utils.gpu.Texture = function (width, height, options) {
  'use strict';
  energy2d.utils.gpu.assertInitialized();

  options = options || {};
  // Basic texture params.
  this.id = gl.createTexture();
  this.width = width;
  this.height = height;
  this.format = options.format || gl.RGBA;
  this.type = options.type || gl.UNSIGNED_BYTE;
  // Number of texture unit which contains this texture (if any).
  this.tex_unit = null;
  // Render target params.
  this.fbo = null;

  // Set parameters.
  gl.bindTexture(gl.TEXTURE_2D, this.id);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.mag_filter || options.filter || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.min_filter || options.filter || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrap_s || gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrap_t || gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
};

// Set texture as render target.
// After this call user can render to texture.
energy2d.utils.gpu.Texture.prototype.setAsRenderTarget = function () {
  'use strict';
  if (this.fbo === null) {
    // FBO initialization during first call.
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    gl.viewport(0, 0, this.width, this.height);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
  }
};

// Bind this texture to the given texture unit (0-7, defaults to 0).
energy2d.utils.gpu.Texture.prototype.bind = function (unit) {
  'use strict';
  this.tex_unit = unit || 0;
  gl.activeTexture(gl.TEXTURE0 + this.tex_unit);
  gl.bindTexture(gl.TEXTURE_2D, this.id);
};

// Unbind this texture.
energy2d.utils.gpu.Texture.prototype.unbind = function (unit) {
  'use strict';
  if (this.tex_unit === null) {
    return;
  }
  gl.activeTexture(gl.TEXTURE0 + this.tex_unit);
  gl.bindTexture(gl.TEXTURE_2D, null);
  this.tex_unit = null;
};

// Render all draw calls in `callback` to this texture. It also temporarily
// changes the viewport to the size of the texture.
energy2d.utils.gpu.Texture.prototype.drawTo = function (callback) {
  'use strict';
  if (this.fbo === null) {
    throw new Error("Texture: call setupAsRenderTarget() method first.");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
  gl.viewport(0, 0, this.width, this.height);

  callback();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};


// Switch this texture with 'other', useful for the ping-pong rendering
// technique used in multi-stage rendering.
// Textures should have identical dimensions, types and in general - parameters.
// Only ID, FBO and active texture unit values are swapped.
energy2d.utils.gpu.Texture.prototype.swapWith = function (other) {
  'use strict';
  var temp;
  // Swap ID.
  temp = other.id;
  other.id = this.id;
  this.id = temp;
  // Swap active texture unit.
  temp = other.tex_unit;
  other.tex_unit = this.tex_unit;
  this.tex_unit = temp;
  // Swap FBO.
  temp = other.fbo;
  other.fbo = this.fbo;
  this.fbo = temp;
};/*globals energy2d: false, Uint8Array: false, Float32Array: false */
/*jslint indent: 2, node: true, es5: true */
//
// lab/utils/energy2d/gpu/gpgpu.js
//

// define namespace
energy2d.namespace('energy2d.utils.gpu');

// GPGPU Utils (singleton, one instance in the environment).
energy2d.utils.gpu.gpgpu = (function () {
  'use strict';
  var
    gpu = energy2d.utils.gpu,
    // Enhanced WebGL context (enhanced by lightgl).
    gl,

    // GPGPU utils must know dimensions of data (grid).
    // This assumption that all the textures will have the same dimensions is 
    // caused by performance reasons (helps avoiding recreating data structures).
    // To set grid dimensions and initialize WebGL context, call init(grid_width, grid_height).
    grid_width,
    grid_height,

    // Framebuffer object.
    framebuffer,
    // Texture used as a temporary storage (Float, RGBA).
    temp_texture,
    // Texture used for Float to RGBA conversion (Unsigned Byte, RGBA).
    output_texture,
    // Array (Float32Array) used as temporal storage during writing RGBA textures.
    temp_storage,
    // Mesh used for rendering.
    plane,

    // Flag which determines if synchronization is allowed or not.
    sync_allowed = false,

    // Flag which determines if WebGL context and necessary objects are initialized.
    WebGL_initialized = false,

    // Special shader for encoding floats based on: 
    // https://github.com/cscheid/facet/blob/master/src/shade/bits/encode_float.js
    encode_program,
    copy_program,

    // GLSL sources.
    basic_vertex_shader =
    '\
    varying vec2 coord;\
    void main() {\
      coord = gl_Vertex.xy * 0.5 + 0.5;\
      gl_Position = vec4(gl_Vertex.xyz, 1.0);\
    }',

    encode_fragment_shader =
    '\
    uniform sampler2D texture;\
    uniform float channel;\
    varying vec2 coord;\
    float shift_right(float v, float amt) {\
      v = floor(v) + 0.5;\
      return floor(v / exp2(amt));\
    }\
    float shift_left(float v, float amt) {\
      return floor(v * exp2(amt) + 0.5);\
    }\
    \
    float mask_last(float v, float bits) {\
      return mod(v, shift_left(1.0, bits));\
    }\
    float extract_bits(float num, float from, float to) {\
      from = floor(from + 0.5);\
      to = floor(to + 0.5);\
      return mask_last(shift_right(num, from), to - from);\
    }\
    vec4 encode_float(float val) {\
      if (val == 0.0)\
        return vec4(0, 0, 0, 0);\
      float sign = val > 0.0 ? 0.0 : 1.0;\
      val = abs(val);\
      float exponent = floor(log2(val));\
      float biased_exponent = exponent + 127.0;\
      float fraction = ((val / exp2(exponent)) - 1.0) * 8388608.0;\
      \
      float t = biased_exponent / 2.0;\
      float last_bit_of_biased_exponent = fract(t) * 2.0;\
      float remaining_bits_of_biased_exponent = floor(t);\
      \
      float byte4 = extract_bits(fraction, 0.0, 8.0) / 255.0;\
      float byte3 = extract_bits(fraction, 8.0, 16.0) / 255.0;\
      float byte2 = (last_bit_of_biased_exponent * 128.0 + extract_bits(fraction, 16.0, 23.0)) / 255.0;\
      float byte1 = (sign * 128.0 + remaining_bits_of_biased_exponent) / 255.0;\
      return vec4(byte4, byte3, byte2, byte1);\
    }\
    void main() {\
      vec4 data = texture2D(texture, coord);\
      if (channel == 0.0)\
        gl_FragColor = encode_float(data.r);\
      else if (channel == 1.0)\
        gl_FragColor = encode_float(data.g);\
      else if (channel == 2.0)\
        gl_FragColor = encode_float(data.b);\
      else\
        gl_FragColor = encode_float(data.a);\
    }',

    copy_fragment_shader =
    '\
    uniform sampler2D texture;\
    varying vec2 coord;\
    void main() {\
      gl_FragColor = texture2D(texture, coord);\
    }',

    // Common error messages.
    INIT_ERR = 'GPGPU: call init(grid_width, grid_height) with proper dimensions first!',

    //
    // Private methods.
    //
    initWebGL = function () {
      // Setup WebGL context.
      gl = gpu.init();
      // Check if OES_texture_float is available.
      if (!gl.getExtension('OES_texture_float')) {
        throw new Error("GPGPU: OES_texture_float is not supported!");
      }
      // Check if rendering to FLOAT textures is supported.
      temp_texture = new gpu.Texture(1, 1, { type: gl.FLOAT, format: gl.RGBA, filter: gl.LINEAR });
      temp_texture.setAsRenderTarget();
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        throw new Error("GPGPU: FLOAT texture as render target is not supported!");
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // Configure WebGL context and create necessary objects and structures.
      gl.disable(gl.DEPTH_TEST);
      plane = gpu.Mesh.plane();
      encode_program = new gpu.Shader(basic_vertex_shader, encode_fragment_shader);
      copy_program = new gpu.Shader(basic_vertex_shader, copy_fragment_shader);
      // Initialization successful.
      WebGL_initialized = true;
    },

    packRGBAData = function (R, G, B, A, storage) {
      var res, i, i4, len;

      if (R.length !== G.length || R.length !== B.length || R.length !== A.length ||
          storage.length !== R.length * 4) {
        throw new Error("GPGPU: Invalid input data length.");
      }
      for (i = 0, len = R.length; i < len; i += 1) {
        i4 = i * 4;
        storage[i4]     = R[i];
        storage[i4 + 1] = G[i];
        storage[i4 + 2] = B[i];
        storage[i4 + 3] = A[i];
      }
    };

  //
  // Public API.
  //
  return {
    // Setups rendering context (only during first call) and necessary storage (texture, array).
    init: function (width, height) {
      if (!WebGL_initialized) {
        initWebGL();
      }
      // Set dimensions.
      grid_width = width;
      grid_height = height;

      // Setup storage for given dimensions.
      temp_texture   = new gpu.Texture(grid_width, grid_height, { type: gl.FLOAT, format: gl.RGBA, filter: gl.LINEAR });
      output_texture = new gpu.Texture(grid_width, grid_height, { type: gl.UNSIGNED_BYTE, format: gl.RGBA, filter: gl.LINEAR });
      temp_storage   = new Float32Array(grid_width * grid_height * 4);
    },

    getWebGLContext: function () {
      if (gl === undefined) {
        initWebGL();
      }
      return gl;
    },

    // Creates a floating point texture with proper parameters.
    createTexture: function () {
      var tex;
      if (!grid_width || !grid_height) {
        return new Error(INIT_ERR);
      }
      // Use RGBA format as this is the safest option. Single channel textures aren't well supported
      // as render targets attached to FBO.
      tex = new gpu.Texture(grid_width, grid_height, { type: gl.FLOAT, format: gl.RGBA, filter: gl.LINEAR });

      return tex;
    },

    // Convert given array to the RGBA FLoat32Array (which can be used
    // in the writeTexture function) and fill one of its channel.
    // Channel should be between 0 and 3, where 0 = R, 1 = G, 2 = B and 3 = A.
    convertToRGBA: function (data, channel, output) {
      var rgba, i, len, i4;

      if (data.length !== grid_width * grid_height) {
        throw new Error("GPGPU: Invalid input data length.");
      }

      if (output === undefined) {
        rgba = new Float32Array(data.length * 4);
      } else {
        rgba = output;
      }

      if (channel === undefined) {
        channel = 0;
      }

      // Fill RGBA array.
      for (i = 0, len = data.length; i < len; i += 1) {
        i4 = i * 4;
        rgba[i4] = rgba[i4 + 1] = rgba[i4 + 2] = rgba[i4 + 3] = 0;
        rgba[i4 + channel] = data[i];
      }

      return rgba;
    },

    // Write a texture.
    writeTexture: function (tex, input) {
      var rgba = this.convertToRGBA(input, 0, temp_storage);
      // Make sure that texture is bound.
      gl.bindTexture(gl.TEXTURE_2D, tex.id);
      gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.type, rgba);
    },

    writeRGBATexture: function (tex, R, G, B, A) {
      packRGBAData(R, G, B, A, temp_storage);
      // Make sure that texture is bound.
      gl.bindTexture(gl.TEXTURE_2D, tex.id);
      gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.type, temp_storage);
    },

    // Read a floating point texture.
    // Returns Float32Array.
    readTexture: function (tex, output, channel) {
      var output_storage, i, j;
      if (!gl || tex.width !== grid_width || tex.height !== grid_height) {
        return new Error(INIT_ERR);
      }
      if (channel === undefined) {
        channel = 0;
      }
      // Use buffer of provided ouput array. So, when result is written there,
      // output is automaticaly updated in a right way.
      output_storage = new Uint8Array(output.buffer);

      tex.bind();
      output_texture.setAsRenderTarget();
      encode_program.uniforms({ channel: channel });
      encode_program.draw(plane);
      // format: gl.RGBA, type: gl.UNSIGNED_BYTE - only this set is accepted by WebGL readPixels.
      gl.readPixels(0, 0, output_texture.width, output_texture.height, output_texture.format, output_texture.type, output_storage);
    },

    copyTexture: function (src_tex, dst_tex) {
      src_tex.bind();
      dst_tex.setAsRenderTarget();
      copy_program.draw(plane);
    },

    // Execute a GLSL program.
    // Arguments:
    // - program - GL.Shader
    // - textures - array of GL.Texture
    // - output - output texture
    executeProgram: function (program, textures, output) {
      var i, len;
      // Bind textures for reading.
      for (i = 0, len = textures.length; i < len; i += 1) {
        textures[i].bind(i);
      }
      // Use temp texture as writing and reading from the same texture is impossible.
      temp_texture.setAsRenderTarget();
      // Draw simple plane (coordinates x/y from -1 to 1 to cover whole viewport).
      program.draw(plane);
      // Unbind textures.
      for (i = 0, len = textures.length; i < len; i += 1) {
        textures[i].unbind(i);
      }
      output.swapWith(temp_texture);
    },

    // Synchronization can be useful for debugging.
    setSynchronizationAllowed: function (b) {
      sync_allowed = b;
    },

    // Block until all GL execution is complete if synchronization is allowed.
    tryFinish: function () {
      if (sync_allowed) {
        gl.finish();
      }
    }
  };

}());
/*globals energy2d: false*/
/*jslint indent: 2 */
//
// lab/utils/energy2d/performance/performance.js
//

// Simple tools for measurement of performance.
// Automatically detects nested calls of start()
// and creates appropriate tree_root.
// E.g.:
// var perf = makePerformanceTools();
// ...
// perf.start('database read');
// ...
//   perf.start('connection');
//   ...
//   perf.stop('connection');
//   ...
//   perf.start('parsing');
//   ...
//   perf.stop('parsing');
// ...
// perf.stop('database read')
// 
// wiil create a tree_root:
// database read
//  |.. connection 
//  |.. parsing

// define namespace
energy2d.namespace('energy2d.utils.performance');

energy2d.utils.performance.makePerformanceTools = function () {
  'use strict';
  var
    // Holds avg time data.
    tree_root = {
      id: undefined,
      data: undefined,
      parent: undefined,
      children: {}
    },
    act_node = tree_root,

    // Holds FPS counters.
    fps_data = {},

    goToNode = function (id_string) {
      if (!act_node.children[id_string]) {
        act_node.children[id_string] = {
          id: id_string,
          data: { sum: 0, count: 0, avg: 0 },
          parent: act_node,
          children: {}
        };
      }
      act_node = act_node.children[id_string];
      return act_node;
    };

  //
  // Public API.
  //
  return {
    // Start measurement.
    start: function (id_string) {
      goToNode(id_string);
      act_node.start_time = new Date().getTime();
    },
    // Stop measurement.
    stop: function (id_string) {
      var time = new Date().getTime();
      if (act_node.id !== id_string) {
        throw new Error("Performance: there is another active counter: " + act_node.name);
      }
      // Collect data.
      act_node.data.sum += time - act_node.start_time;
      act_node.data.count += 1;
      act_node.data.avg = act_node.data.sum / act_node.data.count;
      // Move one level up.
      act_node = act_node.parent;
    },
    // FPS counter start
    startFPS: function (id_string) {
      fps_data[id_string] = {
        start_time: new Date().getTime(),
        count: 0,
        fps: 0
      };
    },
    // FPS update.
    updateFPS: function (id_string) {
      var
        data = fps_data[id_string],
        time = new Date().getTime();

      if (!data) {
        return;
      }
      data.count += 1;
      data.fps = data.count / ((time - data.start_time) / 1000);
    },
    // FPS counter start
    stopFPS: function (id_string) {
      delete fps_data[id_string];
    },
    // Get tree with stats.
    getTree: function () {
      return tree_root;
    },
    // Get FPS data.
    getFPSData: function () {
      return fps_data;
    }
  };
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/utils-color.js
//

// define namespace
energy2d.namespace('energy2d.views.utils');

// HSV to RGB color conversion.
//
// H runs from 0 to 360 degrees,
// S and V run from 0 to 100.
// 
// Ported from the excellent java algorithm by Eugene Vishnevsky at:
// http://www.cs.rit.edu/~ncs/color/t_convert.html
// http://snipplr.com/view.php?codeview&id=14590
energy2d.views.utils.HSVToRGB = function (h, s, v) {
  'use strict';
  var
    r, g, b,
    i,
    f, p, q, t;

  // Make sure our arguments stay in-range
  h = Math.max(0, Math.min(360, h));
  s = Math.max(0, Math.min(100, s));
  v = Math.max(0, Math.min(100, v));

  // We accept saturation and value arguments from 0 to 100 because that's
  // how Photoshop represents those values. Internally, however, the
  // saturation and value are calculated from a range of 0 to 1. We make
  // That conversion here.
  s /= 100;
  v /= 100;

  if (s === 0) {
    // Achromatic (grey)
    r = g = b = v;
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  h /= 60; // sector 0 to 5
  i = Math.floor(h);
  f = h - i; // factorial part of h
  p = v * (1 - s);
  q = v * (1 - s * f);
  t = v * (1 - s * (1 - f));

  switch (i) {
  case 0:
    r = v;
    g = t;
    b = p;
    break;

  case 1:
    r = q;
    g = v;
    b = p;
    break;

  case 2:
    r = p;
    g = v;
    b = t;
    break;

  case 3:
    r = p;
    g = q;
    b = v;
    break;

  case 4:
    r = t;
    g = p;
    b = v;
    break;

  default: // case 5:
    r = v;
    g = p;
    b = q;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

energy2d.views.utils.setupRGBTemperatureColorTables = function (red, green, blue) {
  'use strict';
  var
    HSVToRGB = energy2d.views.utils.HSVToRGB,
    rgb = [],
    i;

  for (i = 0; i < 256; i += 1) {
    rgb = energy2d.views.utils.HSVToRGB(i, 100, 90);
    red[i]   = rgb[0];
    green[i] = rgb[1];
    blue[i]  = rgb[2];
  }
};/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/color-palette.js
//

// define namespace
energy2d.namespace('energy2d.views.ColorPalette');

// Object with available color palettes. It is not exported to the namespace.
var color_palette = {};
color_palette['0'] = color_palette['RAINBOW']  = [[ 0, 0, 128 ], [ 20, 50, 120 ], [ 20, 100, 200 ], [ 10, 150, 150 ], [ 120, 180, 50 ], [ 220, 200, 10 ], [ 240, 160, 36 ], [ 225, 50, 50 ], [ 230, 85, 110 ], [ 250, 250, 250 ], [ 255, 255, 255 ] ];
color_palette['1'] = color_palette['IRON']     = [ [ 40, 20, 100 ], [ 80, 20, 150 ], [ 150, 20, 150 ], [ 200, 50, 120 ], [ 220, 80, 80 ], [ 230, 120, 30 ], [ 240, 200, 20 ], [ 240, 220, 80 ], [ 255, 255, 125 ], [ 250, 250, 250 ], [ 255, 255, 255 ] ];
color_palette['2'] = color_palette['GRAY']     = [ [ 50, 50, 50 ], [ 75, 75, 75 ], [ 100, 100, 100 ], [ 125, 125, 125 ], [ 150, 150, 150 ], [ 175, 175, 175 ], [ 200, 200, 200 ], [ 225, 225, 225 ], [ 250, 250, 250 ], [ 255, 255, 255 ] ];
color_palette['3'] = color_palette['RAINBOW2'] = (function () {
  'use strict';
  var
    HSVToRGB = energy2d.views.utils.HSVToRGB,
    length = 256,
    rgb = new Array(length),
    i;

  for (i = 0; i < length; i += 1) {
    rgb[i] = energy2d.views.utils.HSVToRGB(length - 1 - i, 100, 90);
  }
  return rgb;
}());

energy2d.views.ColorPalette.getRGBArray = function (color_palette_id) {
  'use strict';
  if (color_palette_id === undefined || color_palette_id === 'DEFAULT') {
    return color_palette['RAINBOW'];
  }
  return color_palette[color_palette_id];
};/*globals energy2d, $ */
/*jslint indent: 2, browser: true */
//
// lab/views/energy2d/heatmap.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Heatmap view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap using bindHeapmap(heatmap, grid_width, grid_height).
// To render the heatmap use renderHeatmap() method. 
// Set size of the heatmap using CSS rules. The view fits canvas dimensions to the real 
// size of the HTML element to avoid low quality CSS scaling *ONLY* when HQ rendering is enabled.
// Otherwise, the canvas has the same dimensions as heatmap grid and fast CSS scaling is used.
energy2d.views.makeHeatmapView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    ColorPalette = energy2d.views.ColorPalette,
    // end.
    DEFAULT_ID = 'energy2d-heatmap-view',

    $heatmap_canvas,
    canvas_ctx,
    backing_scale,
    canvas_width,
    canvas_height,
    hq_rendering,

    rgb_array,
    max_rgb_idx,

    heatmap,
    grid_width,
    grid_height,
    min_temp = 0,
    max_temp = 50,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $heatmap_canvas = $('<canvas />');
      $heatmap_canvas.attr('id', html_id || DEFAULT_ID);
      canvas_ctx = $heatmap_canvas[0].getContext('2d');
      // If we are being rendered on a retina display with doubled pixels
      // we need to make the actual canvas half the requested size;
      // Google: window.devicePixelRatio webkitBackingStorePixelRatio
      // See: https://www.khronos.org/webgl/public-mailing-list/archives/1206/msg00193.html
      if (window.devicePixelRatio > 1 &&
          (canvas_ctx.webkitBackingStorePixelRatio > 1 || (typeof canvas_ctx.webkitBackingStorePixelRatio === "undefined"))) {
        backing_scale = window.devicePixelRatio;
      } else {
        backing_scale = 1;
      }
    },

    //
    // Public API.
    //
    heatmap_view = {
      // Render heat map on the canvas.
      renderHeatmap: function () {
        var
          scale, rgb_idx, val, color1, color2,
          image_data, data,
          i, j, iny, pix_index, pix_stride;

        if (!heatmap) {
          throw new Error("Heatmap: bind heatmap before rendering.");
        }

        canvas_ctx.clearRect(0, 0, grid_width, grid_height);
        // TODO: is it really necessary?
        canvas_ctx.fillStyle = "rgb(0,0,0)";

        scale = max_rgb_idx / (max_temp - min_temp);
        image_data = canvas_ctx.getImageData(0, 0, grid_width / backing_scale, grid_height / backing_scale);
        data = image_data.data;

        pix_index = 0;
        pix_stride = 4 * grid_width;
        for (i = 0; i < grid_width; i += 1) {
          iny = i * grid_height;
          pix_index = 4 * i;
          for (j = 0; j < grid_height; j += 1) {
            val = scale * (heatmap[iny + j] - min_temp);
            rgb_idx = Math.floor(val);
            // Get fractional part of val.
            val -= rgb_idx;
            if (rgb_idx < 0) {
              rgb_idx = 0;
              val = 0;
            } else if (rgb_idx > max_rgb_idx - 1) {
              rgb_idx = max_rgb_idx - 1;
              val = 1;
            }
            color1 = rgb_array[rgb_idx];
            color2 = rgb_array[rgb_idx + 1];
            data[pix_index]     = color1[0] * (1 - val) + color2[0] * val;
            data[pix_index + 1] = color1[1] * (1 - val) + color2[1] * val;
            data[pix_index + 2] = color1[2] * (1 - val) + color2[2] * val;
            data[pix_index + 3] = 255;
            pix_index += pix_stride;
          }
        }
        canvas_ctx.putImageData(image_data, 0, 0);
      },

      // Bind heatmap to the view.
      bindHeatmap: function (new_heatmap, new_grid_width, new_grid_height) {
        if (new_grid_width * new_grid_height !== new_heatmap.length) {
          throw new Error("Heatmap: provided heatmap has wrong dimensions.");
        }
        heatmap = new_heatmap;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        this.setCanvasSize(grid_width, grid_height);
      },

      getHTMLElement: function () {
        return $heatmap_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $heatmap_canvas.width();
        canvas_height = $heatmap_canvas.height();
        if (hq_rendering) {
          $heatmap_canvas.attr('width', canvas_width);
          $heatmap_canvas.attr('height', canvas_height);
        } else {
          this.setCanvasSize(grid_width, grid_height);
        }
      },

      setCanvasSize: function (w, h) {
        $heatmap_canvas.attr('width',  w / backing_scale);
        $heatmap_canvas.attr('height', h / backing_scale);
      },

      setHQRenderingEnabled: function (v) {
        hq_rendering = v;
        this.updateCanvasSize();
      },

      setMinTemperature: function (v) {
        min_temp = v;
      },
      setMaxTemperature: function (v) {
        max_temp = v;
      },
      setColorPalette: function (id) {
        rgb_array = ColorPalette.getRGBArray(id);
        max_rgb_idx = rgb_array.length - 1;
      }
    };
  // One-off initialization.
  // Set the default color palette.
  heatmap_view.setColorPalette('DEFAULT');

  initHTMLelement();

  return heatmap_view;
};
/*globals lab: false, energy2d: false, $: false, Uint8Array: false */
/*jslint indent: 2, browser: true, es5: true */
//
// lab/views/energy2d/heatmap-webgl.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Heatmap WebGL view.
//
// It uses HTML5 Canvas and WebGL for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap texture using bindHeapmapTexture(heatmap_tex).
// To render the heatmap use renderHeatmapTexture() method. 
// Set size of the heatmap using CSS rules.
energy2d.views.makeHeatmapWebGLView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    // Color palette utils class.
    ColorPalette = energy2d.views.ColorPalette,
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to the JavaScript file.
    GLSL_PREFIX      = 'src/lab/views/energy2d/heatmap-webgl-glsl/',
    basic_vs         = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    temp_renderer_fs = glsl[GLSL_PREFIX + 'temp-renderer.fs.glsl'],

    // Get WebGL context.
    gl = gpu.init(),
    // GLSL Render program.
    render_program = new gpu.Shader(basic_vs, temp_renderer_fs),
    // Plane used for rendering.
    plane = gpu.Mesh.plane({ coords: true }),
    // Color palette texture (init later).
    palette_tex,

    DEFAULT_ID = 'energy2d-heatmap-webgl-view',

    $heatmap_canvas,
    canvas_width,
    canvas_height,

    heatmap_tex,
    min_temp = 0,
    max_temp = 50,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $heatmap_canvas = $(gl.canvas);
      $heatmap_canvas.attr('id', html_id || DEFAULT_ID);
    },

    // Make sure that no FBO is bound and viewport has proper dimensions
    // (it's not obvious as this context is also used for GPGPU calculations).
    setupRenderTarget = function () {
      // Ensure that FBO is null, as GPGPU operations which use FBOs also take place.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // This is necessary, as GPGPU operations can modify viewport size.
      gl.viewport(0, 0, canvas_width, canvas_height);
    },

    //
    // Public API.
    //
    heatmap_view = {
      // Render heat map on the canvas.
      renderHeatmap: function () {

        if (!heatmap_tex) {
          throw new Error("Heatmap: bind heatmap texture before rendering.");
        }
        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $heatmap_canvas.width() || canvas_height !== $heatmap_canvas.height()) {
          this.updateCanvasSize();
        }

        setupRenderTarget();

        gl.clear(gl.COLOR_BUFFER_BIT);
        heatmap_tex.bind(0);
        palette_tex.bind(1);
        render_program.draw(plane);
        palette_tex.unbind(1);
        heatmap_tex.unbind(0);
      },

      updateCanvasSize: function () {
        canvas_width = $heatmap_canvas.width();
        canvas_height = $heatmap_canvas.height();
        $heatmap_canvas.attr('width', canvas_width);
        $heatmap_canvas.attr('height', canvas_height);
      },

      // Bind heatmap to the view.
      bindHeatmapTexture: function (new_heatmap_tex) {
        heatmap_tex = new_heatmap_tex;
      },

      getHTMLElement: function () {
        return $heatmap_canvas;
      },

      setMinTemperature: function (v) {
        min_temp = v;
        render_program.uniforms({
          min_temp: min_temp
        });
      },
      setMaxTemperature: function (v) {
        max_temp = v;
        render_program.uniforms({
          max_temp: max_temp
        });
      },
      setColorPalette: function (id) {
        var rgb_array, len, tex_data, i, i4;
        rgb_array = ColorPalette.getRGBArray(id);
        len = rgb_array.length;
        tex_data = new Uint8Array(len * 4);
        for (i = 0; i < len; i += 1) {
          i4 = i * 4;
          tex_data[i4]     = rgb_array[i][0];
          tex_data[i4 + 1] = rgb_array[i][1];
          tex_data[i4 + 2] = rgb_array[i][2];
          tex_data[i4 + 3] = 255;
        }
        palette_tex = new gpu.Texture(len, 1, { type: gl.UNSIGNED_BYTE, format: gl.RGBA, filter: gl.LINEAR });
        gl.bindTexture(gl.TEXTURE_2D, palette_tex.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, palette_tex.format, len, 1, 0, palette_tex.format, palette_tex.type, tex_data);
      }
    };

  // One-off initialization.
  // Set the default color palette.
  heatmap_view.setColorPalette('DEFAULT');
  // Set render program uniforms.
  render_program.uniforms({
    // Texture units.
    heatmap_tex: 0,
    palette_tex: 1,
    // Uniforms.
    min_temp: min_temp,
    max_temp: max_temp
  });
  // Setup texture coordinates.
  plane.coords = [[1, 0], [1, 1], [0, 0], [0, 1]];
  // Update buffers.
  plane.compile();

  initHTMLelement();

  return heatmap_view;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/vectormap.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Vector map view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the vector map using bindVectormap(vectormap_u, vectormap_v, width, height, spacing).
// To render vector map use renderVectormap() method.
// Set size of the vectormap using CSS rules. The view fits canvas dimensions to the real 
// size of the HTML element to avoid low quality CSS scaling.
energy2d.views.makeVectormapView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-vectormap-view',
    VECTOR_SCALE = 100,
    VECTOR_BASE_LEN = 8,
    WING_COS = Math.cos(0.523598776),
    WING_SIN = Math.sin(0.523598776),
    WING_LEN = 4,
    ARROW_COLOR = "rgb(175,175,175)",

    $vectormap_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    vectormap_u,
    vectormap_v,
    grid_width,
    grid_height,
    spacing,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $vectormap_canvas = $('<canvas />');
      $vectormap_canvas.attr('id', html_id || DEFAULT_ID);
      canvas_ctx = $vectormap_canvas[0].getContext('2d');
    },

    // Helper method for drawing a single vector.
    drawVector = function (x, y, vx, vy) {
      var
        r = 1.0 / Math.sqrt(vx * vx + vy * vy),
        arrowx = vx * r,
        arrowy = vy * r,
        x1 = x + arrowx * VECTOR_BASE_LEN + vx * VECTOR_SCALE,
        y1 = y + arrowy * VECTOR_BASE_LEN + vy * VECTOR_SCALE,
        wingx = WING_LEN * (arrowx * WING_COS + arrowy * WING_SIN),
        wingy = WING_LEN * (arrowy * WING_COS - arrowx * WING_SIN);

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(x, y);
      canvas_ctx.lineTo(x1, y1);

      canvas_ctx.lineTo(x1 - wingx, y1 - wingy);
      canvas_ctx.moveTo(x1, y1);

      wingx = WING_LEN * (arrowx * WING_COS - arrowy * WING_SIN);
      wingy = WING_LEN * (arrowy * WING_COS + arrowx * WING_SIN);
      canvas_ctx.lineTo(x1 - wingx, y1 - wingy);

      canvas_ctx.stroke();
    },

    //
    // Public API.
    //
    vectormap_view = {
      // Render vectormap on the canvas.
      renderVectormap: function () {
        var
          dx, dy, x0, y0, uij, vij,
          i, j, iny, ijny;

        if (!vectormap_u || !vectormap_v) {
          throw new Error("Vectormap: bind vectormap before rendering.");
        }

        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $vectormap_canvas.width() || canvas_height !== $vectormap_canvas.height()) {
          this.updateCanvasSize();
        }

        dx = canvas_width / grid_width;
        dy = canvas_height / grid_height;

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        canvas_ctx.strokeStyle = ARROW_COLOR;
        canvas_ctx.lineWidth = 1;

        for (i = 1; i < grid_width - 1; i += spacing) {
          iny = i * grid_height;
          x0 = (i + 0.5) * dx; // + 0.5 to move arrow into field center
          for (j = 1; j < grid_height - 1; j += spacing) {
            ijny = iny + j;
            y0 = (j + 0.5) * dy; // + 0.5 to move arrow into field center
            uij = vectormap_u[ijny];
            vij = vectormap_v[ijny];
            if (uij * uij + vij * vij > 1e-15) {
              drawVector(x0, y0, uij, vij);
            }
          }
        }
      },

      // Bind vector map to the view.
      bindVectormap: function (new_vectormap_u, new_vectormap_v, new_grid_width, new_grid_height, arrows_per_row) {
        if (new_grid_width * new_grid_height !== new_vectormap_u.length) {
          throw new Error("Heatmap: provided U component of vectormap has wrong dimensions.");
        }
        if (new_grid_width * new_grid_height !== new_vectormap_v.length) {
          throw new Error("Heatmap: provided V component of vectormap has wrong dimensions.");
        }
        vectormap_u = new_vectormap_u;
        vectormap_v = new_vectormap_v;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        spacing = Math.round(new_grid_width / arrows_per_row);
      },

      getHTMLElement: function () {
        return $vectormap_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $vectormap_canvas.width();
        canvas_height = $vectormap_canvas.height();
        $vectormap_canvas.attr('width', canvas_width);
        $vectormap_canvas.attr('height', canvas_height);
      }
    };

  // One-off initialization.
  initHTMLelement();

  return vectormap_view;
};
/*globals lab: false, energy2d: false, $: false, Uint8Array: false */
/*jslint indent: 2, browser: true, es5: true */
//
// lab/views/energy2d/heatmap-webgl.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Vectormap WebGL view.
//
// It uses HTML5 Canvas and WebGL for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap texture using bindHeapmapTexture(vectormap_tex).
// To render the heatmap use renderVectormapTexture() method. 
// Set size of the heatmap using CSS rules.
energy2d.views.makeVectormapWebGLView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to the JavaScript file.
    GLSL_PREFIX  = 'src/lab/views/energy2d/vectormap-webgl-glsl/',
    vectormap_vs = glsl[GLSL_PREFIX + 'vectormap.vs.glsl'],
    vectormap_fs = glsl[GLSL_PREFIX + 'vectormap.fs.glsl'],

    // Get WebGL context.
    gl = gpu.init(),
    // GLSL Render program.
    render_program = new gpu.Shader(vectormap_vs, vectormap_fs),
    // Plane used for rendering.
    arrows = new gpu.Mesh({ coords: true, lines: true }),

    DEFAULT_ID = 'energy2d-vectormap-webgl-view',
    VECTOR_SCALE = 100,
    VECTOR_BASE_LEN = 8,
    ARROW_COLOR = [0.7, 0.7, 0.7, 1.0],

    $vectormap_canvas,
    canvas_width,
    canvas_height,

    vectormap_tex,
    grid_width,
    grid_height,
    spacing,

    // 
    // Private methods.
    //
    initGeometry = function () {
      var i, j, h, idx, origin, coord,
        gdx = 2.0 / grid_width,
        gdy = 2.0 / grid_height,
        tdx = 1.0 / grid_width,
        tdy = 1.0 / grid_height;

      arrows.addVertexBuffer('origins', 'origin');
      arrows.vertices = [];
      arrows.origins = [];
      arrows.coords = [];
      arrows.lines = [];

      idx = 0;
      for (i = 1; i < grid_width - 1; i += spacing) {
        for (j = 1; j < grid_height - 1; j += spacing) {
          // Base arrows vertices. Origin, front and two wings. The unit is pixel.
          // Base length is 0.01 px - just for convenience (it distinguish front of the arrows from the origin).
          arrows.vertices.push([0, 0, 0], [0.01, 0, 0], [-3, 2, 0], [-3, -2, 0]);
          // All of these vertices have to know which vector they are representing.
          origin = [-1.0 + (i + 0.5) * gdx, 1.0 - (j + 0.5) * gdy, 0];
          arrows.origins.push(origin, origin, origin, origin);
          // Texture coordinates.
          coord = [(j + 0.5) * tdy, (i + 0.5) * tdx];
          arrows.coords.push(coord, coord, coord, coord);
          // Draw three lines. From origin to the fron of the arrows + two wings.
          arrows.lines.push([idx, idx + 1], [idx + 1, idx + 2], [idx + 1, idx + 3]);
          idx += 4;
        }
      }
      // Update buffers.
      arrows.compile();
    },

    initHTMLelement = function () {
      $vectormap_canvas = $(gl.canvas);
      $vectormap_canvas.attr('id', html_id || DEFAULT_ID);
    },

    // Make sure that no FBO is bound and viewport has proper dimensions
    // (it's not obvious as this context is also used for GPGPU calculations).
    setupRenderTarget = function () {
      // Ensure that FBO is null, as GPGPU operations which use FBOs also take place.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // This is necessary, as GPGPU operations can modify viewport size.
      gl.viewport(0, 0, canvas_width, canvas_height);
    },

    //
    // Public API.
    //
    vectormap_view = {
      // Render heat map on the canvas.
      renderVectormap: function () {

        if (!vectormap_tex) {
          throw new Error("Vectormap: bind heatmap texture before rendering.");
        }
        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $vectormap_canvas.width() || canvas_height !== $vectormap_canvas.height()) {
          this.updateCanvasSize();
        }

        setupRenderTarget();

        vectormap_tex.bind(0);
        render_program.draw(arrows, gl.LINES);
        vectormap_tex.unbind(0);
      },

      updateCanvasSize: function () {
        canvas_width = $vectormap_canvas.width();
        canvas_height = $vectormap_canvas.height();
        $vectormap_canvas.attr('width', canvas_width);
        $vectormap_canvas.attr('height', canvas_height);
        // Render ara has dimensions from -1.0 to 1.0, so its width/height is 2.0.
        render_program.uniforms({
          scale: [2.0 / canvas_width, 2.0 / canvas_height]
        });
      },

      // Bind vectormap to the view.
      bindVectormapTexture: function (new_vectormap_tex, new_grid_width, new_grid_height, arrows_per_row) {
        vectormap_tex = new_vectormap_tex;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        spacing = Math.round(grid_width / arrows_per_row);

        initGeometry();
      },

      getHTMLElement: function () {
        return $vectormap_canvas;
      },
    };

  // One-off initialization.
  // Set render program uniforms.
  render_program.uniforms({
    // Texture units.
    vectormap_tex: 0,
    // Uniforms.
    base_length: VECTOR_BASE_LEN,
    vector_scale: VECTOR_SCALE,
    color: ARROW_COLOR
  });

  initHTMLelement();

  return vectormap_view;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/description.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Description.
//
// getHTMLElement() method returns JQuery object with DIV that contains description.
// If you want to style its components:
// Default div id = "energy2d-description",
// Title class: "energy2d-description-title", Content class: "energy2d-description-content".
energy2d.views.makeSimulationDescription = function (description) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-description',
    DEFAULT_CLASS = 'energy2d-description',

    simulation_controller,
    $description_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      var $title, $tagline, $content, $footnote;

      $description_div = $('<div />');
      $description_div.attr('id', description.id || DEFAULT_ID);
      $description_div.addClass(description.class || DEFAULT_CLASS);
      // title
      $title = $('<div>' + description.title + '</div>');
      $title.attr('class', DEFAULT_ID + '-title');
      $description_div.append($title);
      // tagline
      $tagline = $('<div>' + description.tagline + '</div>');
      $tagline.attr('class', DEFAULT_ID + '-tagline');
      $description_div.append($tagline);
      // content
      $content = $('<div>' + description.content + '</div>');
      $content.attr('class', DEFAULT_ID + '-content');
      $description_div.append($content);
      // footnote
      $footnote = $('<div>' + description.footnote + '</div>');
      $footnote.attr('class', DEFAULT_ID + '-footnote');
      $description_div.append($footnote);
    },

    //
    // Public API.
    //
    simulation_description = {
      bindSimulationController: function (controller) {
        simulation_controller = controller;
      },

      getHTMLElement: function () {
        return $description_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_description;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/perofrmance.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Description.
//
// getHTMLElement() method returns JQuery object with DIV that contains description.
// If you want to style its components:
// Default div id = "energy2d-description",
// Title class: "energy2d-description-title", Content class: "energy2d-description-content".
energy2d.views.makePerformanceView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-performance',
    DEFAULT_CLASS = 'energy2d-performance',

    $performance_div,
    $stats,
    $fps,

    performance_model,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $performance_div = $('<div />');
      $fps = $('<pre />');
      $stats = $('<pre />');

      $performance_div.append('<h2>FPS Counters:</h2>');
      $performance_div.append($fps);
      $performance_div.append('<h2>Stats (average time):</h2>');
      $performance_div.append($stats);
    },

    addChildren = function (children, level) {
      var name, child, i;

      for (name in children) {
        if (children.hasOwnProperty(name)) {
          child = children[name];
          for (i = 0; i < level; i += 1) {
            $stats.append('  ');
          }
          $stats.append(child.id + ': ' + child.data.avg.toFixed(2) + 'ms\n');
          addChildren(child.children, level + 1);
        }
      }
    },

    renderTime = function (tree) {
      // Reset view.
      $stats.html('');
      addChildren(tree.children, 0);
    },

    renderFPS = function (fps_data) {
      var name;
      $fps.html('');
      for (name in fps_data) {
        if (fps_data.hasOwnProperty(name)) {
          $fps.append(name + ': ' + fps_data[name].fps.toFixed(2) + ' fps');
        }
      }
    },

    //
    // Public API.
    //
    performance_view = {
      bindModel: function (model) {
        performance_model = model;
      },

      update: function () {
        // Update stats.
        renderFPS(performance_model.getFPSData())
        renderTime(performance_model.getTree());
      },

      getHTMLElement: function () {
        return $performance_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return performance_view;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/perofrmance.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Description.
//
// getHTMLElement() method returns JQuery object with DIV that contains description.
// If you want to style its components:
// Default div id = "energy2d-description",
// Title class: "energy2d-description-title", Content class: "energy2d-description-content".
energy2d.views.makeWebGLStatusView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,

    DEFAULT_ID = 'energy2d-webgl-status',

    $WebGL_status_div,
    $solvers_p,
    $error_p,
    $features_ul,

    // Energy2D modeler.
    energy2d_modeler,
    // List of WebGL features.
    features,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $WebGL_status_div = $('<div />');
      $WebGL_status_div.attr('id', html_id || DEFAULT_ID);
      $WebGL_status_div.append('<h2>WebGL status</h2>');
      $solvers_p = $('<p />');
      $WebGL_status_div.append($solvers_p);
      $features_ul = $('<ul />');
      $WebGL_status_div.append($features_ul);
      $error_p = $('<p />');
      $error_p.css('color', 'orange');
      $WebGL_status_div.append($error_p);
    },

    testFeatures = function () {
      var gl, temp_texture;
      // Clear features lists.
      features = {};
      // 1. WebGL main tests.
      try {
        gl = gpu.init();
        features['WebGL context'] = true;
      } catch (e) {
        features['WebGL context'] = false;
        // WebGL is not available, so don't test other features.
        return;
      }

      // 2. OES_texture_float.
      if (gl.getExtension('OES_texture_float')) {
        features['OES_texture_float extension'] = true;
      } else {
        features['OES_texture_float extension'] = false;
      }

      // 3. Float texture as render target.
      //    Test it only if float textures are available.
      if (features['OES_texture_float extension']) {
        temp_texture = new gpu.Texture(1, 1, { type: gl.FLOAT, format: gl.RGBA, filter: gl.LINEAR });
        temp_texture.setAsRenderTarget();
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
          features['FLOAT texture as render target'] = true;
        } else {
          features['FLOAT texture as render target'] = false;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    },

    render = function () {
      var name, $val, $line, error;
      // Render status of GPU solvers.
      $solvers_p.html('Energy2D GPU solvers: ');
      if (energy2d_modeler.isWebGLActive()) {
        $val = $('<span>active</span>');
        $val.css('color', 'green');
      } else {
        $val = $('<span>inactive</span>');
        $val.css('color', 'orange');
      }
      $solvers_p.append($val);

      // Render WebGL features lists.
      $features_ul.html('');
      for (name in features) {
        if (features.hasOwnProperty(name)) {
          if (features[name]) {
            $val = $('<span>available</span>');
            $val.css('color', 'green');
          } else {
            $val = $('<span>not available</span>');
            $val.css('color', 'red');
          }
          $line = $('<li>' + name + ': </li>');
          $line.append($val);
          $features_ul.append($line);
        }
      }

      // Render errors.
      $error_p.html('');
      error = energy2d_modeler.getWebGLError();
      if (error !== undefined) {
        $error_p.append(error);
      }
    },

    //
    // Public API.
    //
    WebGL_status_view = {
      bindModel: function (model) {
        energy2d_modeler = model;
      },

      updateAndRender: function () {
        // Test and update WebGL features.
        testFeatures();
        // Render status.
        render();
      },

      getHTMLElement: function () {
        return $WebGL_status_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return WebGL_status_view;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/views.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Main Energy2D scene.
//
// It combines three views and arranges them into layers:
// - HeatmapView
// - VelocityView
// - PartsView
//
// getHTMLElement() method returns JQuery object with DIV that contains these views.
// Constructor sets only necessary style options.
// If you want to resize Energy2D scene view use CSS rule for wrapping DIV.
// Do not resize manually internal views (heatmap, velocity or parts)!
energy2d.views.makeEnergy2DScene = function (html_id, use_WebGL) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-scene-view',
    DEFAULT_CLASS = 'energy2d-scene-view',

    DEFAULT_VISUALIZATION_OPTIONS = {
      "color_palette_type": 0,
      "minimum_temperature": 0.0,
      "maximum_temperature": 40.0
    },

    heatmap_view,
    velocity_view,
    parts_view,
    photons_view,
    time_view,

    $scene_view_div,

    layers_count = 0,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $scene_view_div = $('<div />');
      $scene_view_div.attr('id', html_id || DEFAULT_ID);
      $scene_view_div.addClass(DEFAULT_CLASS);

      $scene_view_div.css('position', 'relative');

      $scene_view_div.append(heatmap_view.getHTMLElement());
      $scene_view_div.append(velocity_view.getHTMLElement());
      $scene_view_div.append(photons_view.getHTMLElement());
      $scene_view_div.append(parts_view.getHTMLElement());
      $scene_view_div.append(time_view.getHTMLElement());
    },

    setAsNextLayer = function (view) {
      var $layer = view.getHTMLElement();

      $layer.css('width', '100%');
      $layer.css('height', '100%');
      $layer.css('position', 'absolute');
      $layer.css('left', '0');
      $layer.css('top', '0');
      $layer.css('z-index', layers_count);
      layers_count += 1;
    },

    setAsTimeLayer = function (view) {
      var $layer = view.getHTMLElement();

      // Style time view to make it visible and sharp 
      // as it is displayed on the heatmap (often dark blue color).
      $layer.css('color', 'white');
      $layer.css('font-weight', 'bold');
      // Keep constant width of time display to avoid
      // oscillation of its position.
      $layer.css('font-family', 'Monospace');
      $layer.css('position', 'absolute');
      $layer.css('right', '0');
      $layer.css('top', '0');
      $layer.css('z-index', layers_count);
      layers_count += 1;
    },

    energy2d_scene_view = {
      getHeatmapView: function () {
        return heatmap_view;
      },

      getVelocityView: function () {
        return velocity_view;
      },

      getPartsView: function () {
        return parts_view;
      },

      getPhotonsView: function () {
        return photons_view;
      },

      getTimeView: function () {
        return time_view;
      },

      getHTMLElement: function () {
        return $scene_view_div;
      },

      setVisualizationOptions: function (options) {
        var name;
        // Fill options with default values if there is such need.
        for (name in DEFAULT_VISUALIZATION_OPTIONS) {
          if (DEFAULT_VISUALIZATION_OPTIONS.hasOwnProperty(name) && options[name] === undefined) {
            options[name] = DEFAULT_VISUALIZATION_OPTIONS[name];
          }
        }
        // Configure "subviews".
        heatmap_view.setMinTemperature(options.minimum_temperature);
        heatmap_view.setMaxTemperature(options.maximum_temperature);
        heatmap_view.setColorPalette(options.color_palette_type);
      }
    };

  // One-off initialization.
  if (use_WebGL) {
    heatmap_view = energy2d.views.makeHeatmapWebGLView();
    velocity_view = energy2d.views.makeVectormapWebGLView();

    // Both VectormapWebGL and HeatmapWebGL use common canvas,
    // so it's enough to set it only once as the next layer.
    setAsNextLayer(velocity_view);
  } else {
    heatmap_view = energy2d.views.makeHeatmapView();
    velocity_view = energy2d.views.makeVectormapView();

    setAsNextLayer(heatmap_view);
    setAsNextLayer(velocity_view);
  }

  photons_view = energy2d.views.makePhotonsView();
  setAsNextLayer(photons_view);

  parts_view = energy2d.views.makePartsView();
  setAsNextLayer(parts_view);

  time_view = energy2d.views.makeTimeView();
  setAsTimeLayer(time_view);

  // Append all views to the scene view DIV.
  initHTMLelement();

  return energy2d_scene_view;
};

// Energy2D parts view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the parts array using bindPartsArray(parts).
// To render parts use renderParts() method.
// Set size of the parts view using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality scaling.
energy2d.views.makePartsView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-parts-view',
    DEFAULT_CLASS = 'energy2d-parts-view',

    $parts_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    parts,
    scale_x,
    scale_y,
    scene_width,
    scene_height,

    textures = [],

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $parts_canvas = $('<canvas />');
      $parts_canvas.attr('id', html_id || DEFAULT_ID);
      $parts_canvas.addClass(DEFAULT_CLASS);

      canvas_ctx = $parts_canvas[0].getContext('2d');
    },

    setCanvasStyle = function () {
      canvas_ctx.strokeStyle = "black";
      canvas_ctx.lineCap = "round";
      canvas_ctx.lineJoin = "round";
      canvas_ctx.lineWidth = 1;
      canvas_ctx.font = "12px sans-serif";
      canvas_ctx.textBaseline = "middle";
    },

    // TODO: add more textures, move it another module?
    initTextures = function () {
      var
        WIDTH  = 8,
        HEIGHT = 8,
        $texture_canvas,
        ctx;

      // Create canvas element.
      $texture_canvas = $('<canvas />');
      $texture_canvas.attr('width', WIDTH);
      $texture_canvas.attr('height', HEIGHT);
      ctx = $texture_canvas[0].getContext("2d");

      // Generate simple pattern.
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(HEIGHT, HEIGHT);
      ctx.stroke();

      textures.push($texture_canvas[0]);
    },

    drawRectangle = function (rectangle) {
      var
        px = rectangle.x * scale_x - 1,        // "- 1 / + 2" too keep positions
        py = rectangle.y * scale_y - 1,        // consistent with Energy2d
        pw = rectangle.width * scale_x + 2,
        ph = rectangle.height * scale_y + 2,
        label_x = px + 0.5 * pw,
        label_y = py + 0.5 * ph;

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(px, py);
      canvas_ctx.lineTo(px + pw, py);
      canvas_ctx.lineTo(px + pw, py + ph);
      canvas_ctx.lineTo(px, py + ph);
      canvas_ctx.lineTo(px, py);
      canvas_ctx.closePath();
    },

    drawPolygon = function (polygon) {
      var
        x_coords = polygon.x_coords,
        y_coords = polygon.y_coords,
        label_x = 0,
        label_y = 0,
        i, len;

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(x_coords[0] * scale_x, y_coords[0] * scale_y);
      for (i = 1, len = polygon.count; i < len; i += 1) {
        canvas_ctx.lineTo(x_coords[i] * scale_x, y_coords[i] * scale_y);
      }
      canvas_ctx.closePath();
    },

    drawLabel = function (part) {
      var
        label, label_x, label_y, label_width,
        verts, i, len;

      if (part.rectangle) {
        label_x = part.rectangle.x + 0.5 * part.rectangle.width;
        label_y = part.rectangle.y + 0.5 * part.rectangle.height;
      } else if (part.ellipse) {
        label_x = part.ellipse.x;
        label_y = part.ellipse.y;
      } else if (part.ring) {
        label_x = part.ring.x;
        label_y = part.ring.y;
      } else if (part.polygon) {
        verts = part.polygon.vertices;
        label_x = label_y = 0;
        for (i = 0, len = part.polygon.count; i < len; i += 1) {
          label_x += verts[i * 2];
          label_y += verts[i * 2 + 1];
        }
        label_x /= len;
        label_y /= len;
      }
      label_x *= scale_x;
      label_y *= scale_y;

      canvas_ctx.fillStyle = "white";
      label = part.getLabel();
      label_width = canvas_ctx.measureText(label).width;
      canvas_ctx.fillText(label, label_x - 0.5 * label_width, label_y);
    },

    getPartColor = function (part) {
      var
        default_fill_color = "gray",
        color;

      if (part.color) {
        if (typeof part.color === 'string') {
          color = part.color;
        } else {
          color = part.color.toString();
          while (color.length < 6) {
            color = '0' + color;
          }
        }
      } else if (part.power > 0) {
        color = 'FFFF00';
      } else if (part.power < 0) {
        color = 'B0C4DE';
      } else if (part.constant_temperature) {
        // Transparent color.
        // Part will have color of underlying background.
        color = 'rgba(0, 0, 0, 0.0)';
      } else {
        color = default_fill_color;
      }
      return color;
    },

    //
    // Public API.
    //
    parts_view = {
      // Render vectormap on the canvas.
      renderParts: function () {
        var
          part,
          last_composite_op,
          i, len;

        if (!parts) {
          throw new Error("Parts view: bind parts array before rendering.");
        }

        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $parts_canvas.width() || canvas_height !== $parts_canvas.height()) {
          this.updateCanvasSize();
        }

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        for (i = 0, len = parts.length; i < len; i += 1) {
          part = parts[i];
          if (!part.visible) {
            continue;
          }
          // Step 1. Draw path on the canvas.
          drawPolygon(part.shape.polygonize());
          if (part.rectangle) {
            // Special case for rectangle to draw in the same manner
            // as original Energy2D.
            drawRectangle(part.shape);
          } else {
            // Polygonize ellipses, rings and... polygons
            // (which returns itself when polygonize() is called).
            // Polygonize for rings returns OUTER circle.
            drawPolygon(part.shape.polygonize());
          }
          // Step 2. Fill.
          if (part.filled) {
            canvas_ctx.fillStyle = getPartColor(part);
            canvas_ctx.fill();
          }
          // Step 3. Cover with texture.
          if (part.texture) {
            // TODO: Add support of different patterns.
            canvas_ctx.fillStyle = canvas_ctx.createPattern(textures[0], "repeat");
            canvas_ctx.fill();
          }
          canvas_ctx.stroke();

          // Step 4. Special case for rings, remove inner circle.
          if (part.ring) {
            drawPolygon(part.shape.polygonizeInner());
            last_composite_op = canvas_ctx.globalCompositeOperation;
            canvas_ctx.globalCompositeOperation = 'destination-out';
            canvas_ctx.fill();
            canvas_ctx.globalCompositeOperation = last_composite_op;
            canvas_ctx.stroke();
          }

          // Step 5. Draw label.
          if (part.label) {
            drawLabel(part);
          }

        }
      },

      // Bind vector map to the view.
      bindPartsArray: function (new_parts, new_scene_width, new_scene_height) {
        parts = new_parts;
        scene_width = new_scene_width;
        scene_height = new_scene_height;
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
      },

      getHTMLElement: function () {
        return $parts_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $parts_canvas.width();
        canvas_height = $parts_canvas.height();
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
        $parts_canvas.attr('width', canvas_width);
        $parts_canvas.attr('height', canvas_height);
        // Need to do it after canvas size change.
        setCanvasStyle();
      }
    };

  // One-off initialization.
  initHTMLelement();
  setCanvasStyle();
  initTextures();

  return parts_view;
};

// Energy2D photons view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the parts array using bindPhotonsArray(photons).
// To render parts use renderPhotons() method.
// Set size of the parts view using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality scaling.
energy2d.views.makePhotonsView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-photons-view',
    DEFAULT_CLASS = 'energy2d-photons-view',

    PHOTON_LENGTH = 10,

    $photons_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    photons,
    scale_x,
    scale_y,
    scene_width,
    scene_height,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $photons_canvas = $('<canvas />');
      $photons_canvas.attr('id', html_id || DEFAULT_ID);
      $photons_canvas.addClass(DEFAULT_CLASS);

      canvas_ctx = $photons_canvas[0].getContext('2d');
    },

    setCanvasStyle = function () {
      canvas_ctx.strokeStyle = "rgba(255,255,255,128)";
      canvas_ctx.lineWidth = 0.5;
    },

    //
    // Public API.
    //
    photons_view = {
      // Render vectormap on the canvas.
      renderPhotons: function () {
        var
          photon, sx, sy, r,
          i, len;

        if (!photons) {
          throw new Error("Photons view: bind parts array before rendering.");
        }

        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $photons_canvas.width() || canvas_height !== $photons_canvas.height()) {
          this.updateCanvasSize();
        }

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        for (i = 0, len = photons.length; i < len; i += 1) {
          photon = photons[i];

          sx = photon.x * scale_x;
          sy = photon.y * scale_y;
          r = 1 / Math.sqrt(photon.vx * photon.vx + photon.vy * photon.vy);

          canvas_ctx.beginPath();
          canvas_ctx.moveTo(sx, sy);
          canvas_ctx.lineTo(sx + PHOTON_LENGTH * photon.vx * r, sy + PHOTON_LENGTH * photon.vy * r);
          canvas_ctx.stroke();
        }
      },

      // Bind vector map to the view.
      bindPhotonsArray: function (new_photons, new_scene_width, new_scene_height) {
        photons = new_photons;
        scene_width = new_scene_width;
        scene_height = new_scene_height;
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
      },

      getHTMLElement: function () {
        return $photons_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $photons_canvas.width();
        canvas_height = $photons_canvas.height();
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
        $photons_canvas.attr('width', canvas_width);
        $photons_canvas.attr('height', canvas_height);

        setCanvasStyle();
      }
    };

  // One-off initialization.
  initHTMLelement();
  setCanvasStyle();

  return photons_view;
};

// Simple player.
//
// Should be bound with simulation controller, which has to implement following methods:
// - simulationPlay()
// - simulationStep()
// - simulationStop()
// - simulationReset()
//
// getHTMLElement() method returns JQuery object with DIV that contains all buttons.
// If you want to style its components:
// Default div id = "energy2d-simulation-player",
// Buttons ids: "sim-play", "sim-step", "sim-stop", "sim-reset".
energy2d.views.makeSimulationPlayerView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-simulation-player',
    DEFAULT_CLASS = 'energy2d-simulation-player',

    simulation_controller,
    $player_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      var $button;

      $player_div = $('<div />');
      $player_div.attr('id', html_id || DEFAULT_ID);
      $player_div.addClass(DEFAULT_CLASS);
      // Stop button.
      $button = $('<button type="button" id="sim-stop">Stop</button>');
      $button.click(function () {
        simulation_controller.simulationStop();
      });
      $player_div.append($button);
      // One step button.
      $button = $('<button type="button" id="sim-step">Step</button>');
      $button.click(function () {
        simulation_controller.simulationStep();
      });
      $player_div.append($button);
      // Play button.
      $button = $('<button type="button" id="sim-play">Play</button>');
      $button.click(function () {
        simulation_controller.simulationPlay();
      });
      $player_div.append($button);
      // Reset button.
      $button = $('<button type="button" id="sim-reset">Reset</button>');
      $button.click(function () {
        simulation_controller.simulationReset();
      });
      $player_div.append($button);
    },

    //
    // Public API.
    //
    simulation_player = {
      bindSimulationController: function (controller) {
        simulation_controller = controller;
      },

      getHTMLElement: function () {
        return $player_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_player;
};

// Simulation time.
//
// getHTMLElement() method returns JQuery object with DIV that contains time.
// If you want to style its components:
// Default div id = "energy2d-time"
energy2d.views.makeTimeView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-time',
    DEFAULT_CLASS = 'energy2d-time',

    $time_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $time_div = $('<div />');
      $time_div.attr('id', html_id || DEFAULT_ID);
      $time_div.addClass(DEFAULT_CLASS);
      $time_div.html('0:00:00:00');
    },

    pad = function (num, size) {
      var s = num.toString();
      while (s.length < size) {
        s = "0" + s;
      }
      return s;
    },

    //
    // Public API.
    //
    simulation_time = {
      renderTime: function (time) {
        var seconds, minutes, hours, days;
        time = Math.floor(time);
        seconds = time % 60;
        time = Math.floor(time / 60);
        minutes = time % 60;
        time = Math.floor(time / 60);
        hours = time % 24;
        time = Math.floor(time / 24);
        days = time;
        $time_div.html(days + ':' + pad(hours, 2) + ':' + pad(minutes, 2)  + ':' + pad(seconds, 2));
      },

      getHTMLElement: function () {
        return $time_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_time;
};

/*globals energy2d, $, ACTUAL_ROOT */
/*jslint indent: 2, browser: true */
//
// lab/controllers/energy2d/controllers.js
//

// define namespace
energy2d.namespace('energy2d.controllers');

// Basic Energy2D controller.
//
// Call this constructor function with interactive definition and the ID of the DOM container for an application.
// This HTML element is used as a default container for all interactive components that don't define their own containers.
energy2d.controllers.makeInteractiveController = function (interactive, interactive_container_id, description_container_id) {
  'use strict';
  var
    // Dependencies:
    modeler_ns = energy2d.modeler,
    views_ns = energy2d.views,
    performance_ns = energy2d.utils.performance,
    // end.

    // Object with public API.
    controller,
    // Energy2D model.
    modeler,
    model_options,
    // Parameters.
    use_WebGL,
    steps_per_frame = 4,

    // TODO: refactor views support, probably using events and more general approach.
    // Required views.
    energy2d_scene,
    heatmap_view,
    velocity_view,
    parts_view,
    photons_view,
    time_view,
    simulation_player_view,
    simulation_description_view,

    // Performance tools and view.
    // By default mock tools.
    performance_tools = {
      start: function () {},
      stop: function () {},
      startFPS: function () {},
      updateFPS: function () {},
      stopFPS: function () {}
    },
    performance_view,

    // WebGL status view.
    WebGL_status_view,

    // All attached HTML elements.
    $html_elements,

    interval_id,

    //
    // Private methods.
    //
    actualRootPath = function (url) {
      if (typeof ACTUAL_ROOT === "undefined" || url.charAt(0) !== "/") {
        return url;
      }
      return ACTUAL_ROOT + url;
    },

    createEnergy2DScene = function (component_def) {
      energy2d_scene = views_ns.makeEnergy2DScene(component_def.id, use_WebGL);
      heatmap_view = energy2d_scene.getHeatmapView();
      velocity_view = energy2d_scene.getVelocityView();
      parts_view = energy2d_scene.getPartsView();
      photons_view = energy2d_scene.getPhotonsView();
      time_view = energy2d_scene.getTimeView();

      return energy2d_scene;
    },

    createSimulationPlayer = function (component_def) {
      simulation_player_view = views_ns.makeSimulationPlayerView(component_def.id);
      // Bind itself (public API).
      simulation_player_view.bindSimulationController(controller);

      return simulation_player_view;
    },

    createPerformanceView = function (component_def) {
      performance_view = views_ns.makePerformanceView(component_def.id);

      return performance_view;
    },

    createWebGLStatusView = function (component_def) {
      WebGL_status_view = views_ns.makeWebGLStatusView(component_def.id);

      return WebGL_status_view;
    },

    createSimulationDescription = function (component_def) {
      simulation_description_view = views_ns.makeSimulationDescription(component_def);
      // Bind itself (public API).
      simulation_description_view.bindSimulationController(controller);

      return simulation_description_view;
    },

    createComponent = function (component_def) {
      if (!component_def.type) {
        throw new Error('Interactive controller: missing component "type" property.');
      }
      switch (component_def.type) {
      case 'energy2d-scene-view':
        return createEnergy2DScene(component_def);
      case 'energy2d-simulation-player':
        return createSimulationPlayer(component_def);
      case 'energy2d-performance-view':
        return createPerformanceView(component_def);
      case 'energy2d-webgl-status-view':
        return createWebGLStatusView(component_def);
      default:
        throw new Error('Interactive controller: unknow type of component.');
      }
    },

    updateDynamicViews = function () {
      heatmap_view.renderHeatmap();
      velocity_view.renderVectormap();
      photons_view.renderPhotons();
      time_view.renderTime(modeler.getTime());

      if (performance_view) {
        performance_view.update();
      }
    },

    nextStep = function () {
      var i, len;
      performance_tools.stop('Gap between frames');
      performance_tools.start('Frame (inc. ' + steps_per_frame + ' model steps)');
      for (i = 0, len = steps_per_frame; i < len; i += 1) {
        modeler.nextStep();
      }
      // Uncomment to enable velocity visualization:
      // modeler.updateVelocityArrays();

      performance_tools.start('Views update');
      // Update views (only part view is not updated, as it's static).
      updateDynamicViews();
      performance_tools.stop('Views update');

      performance_tools.stop('Frame (inc. ' + steps_per_frame + ' model steps)');
      performance_tools.start('Gap between frames');

      performance_tools.updateFPS('Model update and rendering');
    },

    createModeler = function () {
      modeler = modeler_ns.makeModeler(model_options.model);
      use_WebGL = modeler.isWebGLActive();
    },

    createViewComponents = function () {
      var
        components = interactive.components || [],
        description = interactive.description || {},
        layout = interactive.layout || {},
        component, component_layout, $html_element,
        i, len;

      $html_elements = [];
      // Load standard view components.
      for (i = 0, len = components.length; i < len; i += 1) {
        component = createComponent(components[i]);

        // Get jQuery object with DOM element.
        $html_element = component.getHTMLElement();
        // Apply style if layout contains CSS definition.
        component_layout = layout[components[i].id] || {};
        if (component_layout.css) {
          $html_element.css(component_layout.css);
        }
        if (component_layout.class) {
          $html_element.addClass(component_layout.class);
        }
        // Append to container (interactive container is a default choice).
        if (component_layout.container) {
          $html_element.appendTo(component_layout.container);
        } else {
          $html_element.appendTo(interactive_container_id);
        }
        // Add HTML element to the list.
        $html_elements.push($html_element);
      }
      // Add description.
      if (description) {
        component = createSimulationDescription(description);
        $html_element = component.getHTMLElement();
        $html_element.appendTo(description_container_id);
        // Add HTML element to the list.
        $html_elements.push($html_element);
      }
    },

    removeViewComponents = function () {
      var i, len;
      // Remove components.
      for (i = 0, len = $html_elements.length; i < len; i += 1) {
        $html_elements[i].remove();
      }
      // Reset list.
      $html_elements = [];
    },

    setupViewComponents = function () {
      var grid_x, grid_y;

      energy2d_scene.setVisualizationOptions(model_options.view);
      // TODO: move following configuration to energy2d scene.
      grid_x = modeler.getGridWidth();
      grid_y = modeler.getGridHeight();
      parts_view.bindPartsArray(modeler.getPartsArray(), modeler.getWidth(), modeler.getHeight());
      photons_view.bindPhotonsArray(modeler.getPhotonsArray(), modeler.getWidth(), modeler.getHeight());

      if (use_WebGL) {
        heatmap_view.bindHeatmapTexture(modeler.getTemperatureTexture());
        velocity_view.bindVectormapTexture(modeler.getVelocityTexture(), grid_x, grid_y, 25);
      } else {
        heatmap_view.bindHeatmap(modeler.getTemperatureArray(), grid_x, grid_y);
        velocity_view.bindVectormap(modeler.getUVelocityArray(), modeler.getVVelocityArray(), grid_x, grid_y, 25);
      }

      // Bind performance tools model.
      if (performance_view) {
        performance_tools = performance_ns.makePerformanceTools();
        performance_view.bindModel(performance_tools);
        modeler.setPerformanceTools(performance_tools);
      }

      if (WebGL_status_view) {
        WebGL_status_view.bindModel(modeler);
        WebGL_status_view.updateAndRender();
      }

      updateDynamicViews();
      parts_view.renderParts();
    },

    loadInteractive = function () {
      // Download model options (located at interactive.model attribute).
      $.get(actualRootPath(interactive.model))
        .success(function (data) {
          // When they are ready, save them, create modeler, load components and setup them.
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          model_options = data;

          createModeler();
          createViewComponents();
          setupViewComponents();
        })
        .error(function (jqXHR, textStatus, errorThrown) {
          throw new Error("Interactive controller: loading scene options failed - " + textStatus);
        });
    };

  //
  // Public API
  //
  controller = {
    // Overwrite WebGL optimization option.
    setWebGLEnabled: function (b) {
      controller.simulationStop();
      model_options.model.use_WebGL = b;
      createModeler();
      removeViewComponents();
      createViewComponents();
      setupViewComponents();
    },

    //
    // Simulation controller methods implementation.
    //
    simulationPlay: function () {
      if (!interval_id) {
        interval_id = setInterval(nextStep, 0);
        performance_tools.start('Gap between frames');
        performance_tools.startFPS('Model update and rendering');
      }
    },

    simulationStep: function () {
      if (!interval_id) {
        performance_tools.start('Gap between frames');
        nextStep();
        performance_tools.stop('Gap between frames');
      }
    },

    simulationStop: function () {
      if (interval_id !== undefined) {
        performance_tools.stop('Gap between frames');
        performance_tools.stopFPS('Model update and rendering');
        clearInterval(interval_id);
        interval_id = undefined;
      }
    },

    simulationReset: function () {
      controller.simulationStop();
      // TODO: use modeler.reset()
      createModeler();
      setupViewComponents();
    }
  };

  // One-off initialization.
  loadInteractive();

  return controller;
};
})();
