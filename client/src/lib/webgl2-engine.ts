/**
 * WebGL2 3D Room Simulator Engine
 * Handles rendering, materials, lighting, and object management
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Mat4 {
  data: Float32Array;
}

export interface Material {
  id: string;
  ambient: [number, number, number];
  diffuse: [number, number, number];
  specular: [number, number, number];
  shininess: number;
  metallic: number;
  roughness: number;
  emissive: [number, number, number];
}

export interface Light {
  type: "directional" | "point" | "ambient";
  position?: Vec3;
  direction?: Vec3;
  color: [number, number, number];
  intensity: number;
}

export interface RenderObject {
  id: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material: Material;
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  vao: WebGLVertexArrayObject | null;
  vertexCount: number;
}

// Math utilities
export class Mat4Utils {
  static identity(): Mat4 {
    const data = new Float32Array(16);
    data[0] = data[5] = data[10] = data[15] = 1;
    return { data };
  }

  static multiply(a: Mat4, b: Mat4): Mat4 {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += a.data[i * 4 + k] * b.data[k * 4 + j];
        }
      }
    }
    return { data: result };
  }

  static translate(v: Vec3): Mat4 {
    const m = this.identity();
    m.data[12] = v.x;
    m.data[13] = v.y;
    m.data[14] = v.z;
    return m;
  }

  static rotateX(angle: number): Mat4 {
    const m = this.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[5] = c;
    m.data[6] = s;
    m.data[9] = -s;
    m.data[10] = c;
    return m;
  }

  static rotateY(angle: number): Mat4 {
    const m = this.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[0] = c;
    m.data[2] = -s;
    m.data[8] = s;
    m.data[10] = c;
    return m;
  }

  static rotateZ(angle: number): Mat4 {
    const m = this.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[0] = c;
    m.data[1] = s;
    m.data[4] = -s;
    m.data[5] = c;
    return m;
  }

  static scale(v: Vec3): Mat4 {
    const m = this.identity();
    m.data[0] = v.x;
    m.data[5] = v.y;
    m.data[10] = v.z;
    return m;
  }

  static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf;
    return { data: m };
  }

  static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const fx = center.x - eye.x;
    const fy = center.y - eye.y;
    const fz = center.z - eye.z;
    let len = Math.sqrt(fx * fx + fy * fy + fz * fz);
    let f = { x: fx / len, y: fy / len, z: fz / len };

    let sx = f.y * up.z - f.z * up.y;
    let sy = f.z * up.x - f.x * up.z;
    let sz = f.x * up.y - f.y * up.x;
    len = Math.sqrt(sx * sx + sy * sy + sz * sz);
    let s = { x: sx / len, y: sy / len, z: sz / len };

    let ux = s.y * f.z - s.z * f.y;
    let uy = s.z * f.x - s.x * f.z;
    let uz = s.x * f.y - s.y * f.x;

    const m = new Float32Array(16);
    m[0] = s.x;
    m[1] = ux;
    m[2] = -f.x;
    m[4] = s.y;
    m[5] = uy;
    m[6] = -f.y;
    m[8] = s.z;
    m[9] = uz;
    m[10] = -f.z;
    m[15] = 1;
    m[12] = -s.x * eye.x - s.y * eye.y - s.z * eye.z;
    m[13] = -ux * eye.x - uy * eye.y - uz * eye.z;
    m[14] = f.x * eye.x + f.y * eye.y + f.z * eye.z;
    return { data: m };
  }
}

// WebGL2 Engine
export class WebGL2Engine {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private objects: Map<string, RenderObject> = new Map();
  private lights: Light[] = [];
  private camera = {
    position: { x: 0, y: 2, z: 5 },
    rotation: { x: 0, y: 0, z: 0 },
  };
  private viewMatrix: Mat4 = Mat4Utils.identity();
  private projectionMatrix: Mat4 = Mat4Utils.identity();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.setupGL();
    this.createShaderProgram();
    this.setupDefaultLights();
  }

  private setupGL() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0.05, 0.05, 0.08, 1);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
  }

  private createShaderProgram() {
    const vertexShader = this.compileShader(
      this.getVertexShaderSource(),
      this.gl.VERTEX_SHADER
    );
    const fragmentShader = this.compileShader(
      this.getFragmentShaderSource(),
      this.gl.FRAGMENT_SHADER
    );

    const program = this.gl.createProgram();
    if (!program) throw new Error("Failed to create program");

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) || "Link failed");
    }

    this.program = program;
  }

  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) || "Compile failed");
    }

    return shader;
  }

  private getVertexShaderSource(): string {
    return `#version 300 es
      precision highp float;

      in vec3 aPosition;
      in vec3 aNormal;

      uniform mat4 uModel;
      uniform mat4 uView;
      uniform mat4 uProjection;

      out vec3 vPosition;
      out vec3 vNormal;
      out vec3 vWorldPos;

      void main() {
        vWorldPos = (uModel * vec4(aPosition, 1.0)).xyz;
        vPosition = aPosition;
        vNormal = normalize(mat3(uModel) * aNormal);
        gl_Position = uProjection * uView * vec4(vWorldPos, 1.0);
      }
    `;
  }

  private getFragmentShaderSource(): string {
    return `#version 300 es
      precision highp float;

      in vec3 vPosition;
      in vec3 vNormal;
      in vec3 vWorldPos;

      uniform vec3 uAmbient;
      uniform vec3 uDiffuse;
      uniform vec3 uSpecular;
      uniform float uShininess;
      uniform float uMetallic;
      uniform float uRoughness;
      uniform vec3 uEmissive;
      uniform vec3 uCameraPos;

      // Lights
      uniform int uLightCount;
      uniform vec3 uLightPositions[16];
      uniform vec3 uLightDirections[16];
      uniform vec3 uLightColors[16];
      uniform float uLightIntensities[16];
      uniform int uLightTypes[16]; // 0=directional, 1=point, 2=ambient

      out vec4 outColor;

      vec3 calculateLight(int idx, vec3 normal, vec3 viewDir) {
        vec3 lightColor = uLightColors[idx] * uLightIntensities[idx];
        
        if (uLightTypes[idx] == 2) { // Ambient
          return uAmbient * lightColor;
        }

        vec3 lightDir;
        float distance = 1.0;
        
        if (uLightTypes[idx] == 0) { // Directional
          lightDir = normalize(-uLightDirections[idx]);
        } else { // Point
          vec3 toLight = uLightPositions[idx] - vWorldPos;
          distance = length(toLight);
          lightDir = normalize(toLight);
          lightColor *= 1.0 / (1.0 + distance * distance * 0.1);
        }

        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuse * diff * lightColor;

        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
        vec3 specular = uSpecular * spec * lightColor;

        return diffuse + specular;
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(uCameraPos - vWorldPos);
        
        vec3 result = vec3(0.0);
        for (int i = 0; i < 16; i++) {
          if (i >= uLightCount) break;
          result += calculateLight(i, normal, viewDir);
        }

        result += uEmissive;
        outColor = vec4(result, 1.0);
      }
    `;
  }

  private setupDefaultLights() {
    this.addLight({
      type: "ambient",
      color: [0.3, 0.3, 0.35],
      intensity: 1.0,
    });

    this.addLight({
      type: "directional",
      direction: { x: -1, y: -1, z: -1 },
      color: [1, 1, 0.95],
      intensity: 0.8,
    });

    this.addLight({
      type: "point",
      position: { x: 3, y: 3, z: 3 },
      color: [1, 0.8, 0.6],
      intensity: 0.6,
    });

    this.addLight({
      type: "point",
      position: { x: -3, y: 2, z: -3 },
      color: [0.6, 0.8, 1],
      intensity: 0.5,
    });
  }

  addLight(light: Light) {
    this.lights.push(light);
  }

  addObject(obj: RenderObject) {
    this.objects.set(obj.id, obj);
    this.setupObjectVAO(obj);
  }

  private setupObjectVAO(obj: RenderObject) {
    const vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(vao);

    // Position buffer
    const posBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.vertices, this.gl.STATIC_DRAW);

    const posLoc = this.gl.getAttribLocation(this.program as WebGLProgram, "aPosition");
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);

    // Normal buffer
    const normBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.normals, this.gl.STATIC_DRAW);

    const normLoc = this.gl.getAttribLocation(this.program as WebGLProgram, "aNormal");
    this.gl.enableVertexAttribArray(normLoc);
    this.gl.vertexAttribPointer(normLoc, 3, this.gl.FLOAT, false, 0, 0);

    // Index buffer
    const idxBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, obj.indices, this.gl.STATIC_DRAW);

    this.gl.bindVertexArray(null);
    obj.vao = vao;
  }

  updateCameraPosition(pos: Vec3) {
    this.camera.position = pos;
  }

  updateCameraRotation(rot: Vec3) {
    this.camera.rotation = rot;
  }

  updateObjectPosition(id: string, pos: Vec3) {
    const obj = this.objects.get(id);
    if (obj) obj.position = pos;
  }

  updateObjectMaterial(id: string, material: Partial<Material>) {
    const obj = this.objects.get(id);
    if (obj) {
      obj.material = { ...obj.material, ...material };
    }
  }

  render() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    if (!this.program) return;
    this.gl.useProgram(this.program);

    // Update matrices
    const center = {
      x: this.camera.position.x + Math.cos(this.camera.rotation.y),
      y: this.camera.position.y + Math.sin(this.camera.rotation.x),
      z: this.camera.position.z + Math.sin(this.camera.rotation.y),
    };
    this.viewMatrix = Mat4Utils.lookAt(
      this.camera.position,
      center,
      { x: 0, y: 1, z: 0 }
    );
    this.projectionMatrix = Mat4Utils.perspective(
      Math.PI / 4,
      this.canvas.width / this.canvas.height,
      0.1,
      100
    );

    // Set light uniforms
    const lightCount = Math.min(this.lights.length, 16);
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.program as WebGLProgram, "uLightCount"),
      lightCount
    );

    for (let i = 0; i < lightCount; i++) {
      const light = this.lights[i];
      const posLoc = this.gl.getUniformLocation(this.program as WebGLProgram, `uLightPositions[${i}]`);
      const dirLoc = this.gl.getUniformLocation(this.program as WebGLProgram, `uLightDirections[${i}]`);
      const colLoc = this.gl.getUniformLocation(this.program as WebGLProgram, `uLightColors[${i}]`);
      const intLoc = this.gl.getUniformLocation(this.program as WebGLProgram, `uLightIntensities[${i}]`);
      const typLoc = this.gl.getUniformLocation(this.program as WebGLProgram, `uLightTypes[${i}]`);

      if (light.position) {
        this.gl.uniform3f(posLoc, light.position.x, light.position.y, light.position.z);
      }
      if (light.direction) {
        this.gl.uniform3f(dirLoc, light.direction.x, light.direction.y, light.direction.z);
      }
      this.gl.uniform3f(colLoc, light.color[0], light.color[1], light.color[2]);
      this.gl.uniform1f(intLoc, light.intensity);

      const typeValue = light.type === "directional" ? 0 : light.type === "point" ? 1 : 2;
      this.gl.uniform1i(typLoc, typeValue);
    }

    const camPosLoc = this.gl.getUniformLocation(this.program as WebGLProgram, "uCameraPos");
    this.gl.uniform3f(camPosLoc, this.camera.position.x, this.camera.position.y, this.camera.position.z);

    // Render objects
    this.objects.forEach((obj) => {
      let modelMatrix = Mat4Utils.identity();
      modelMatrix = Mat4Utils.multiply(modelMatrix, Mat4Utils.translate(obj.position));
      modelMatrix = Mat4Utils.multiply(modelMatrix, Mat4Utils.rotateX(obj.rotation.x));
      modelMatrix = Mat4Utils.multiply(modelMatrix, Mat4Utils.rotateY(obj.rotation.y));
      modelMatrix = Mat4Utils.multiply(modelMatrix, Mat4Utils.rotateZ(obj.rotation.z));
      modelMatrix = Mat4Utils.multiply(modelMatrix, Mat4Utils.scale(obj.scale));

      this.gl.uniformMatrix4fv(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uModel"),
        false,
        modelMatrix.data
      );
      this.gl.uniformMatrix4fv(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uView"),
        false,
        this.viewMatrix.data
      );
      this.gl.uniformMatrix4fv(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uProjection"),
        false,
        this.projectionMatrix.data
      );

      // Material uniforms
      this.gl.uniform3f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uAmbient"),
        obj.material.ambient[0],
        obj.material.ambient[1],
        obj.material.ambient[2]
      );
      this.gl.uniform3f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uDiffuse"),
        obj.material.diffuse[0],
        obj.material.diffuse[1],
        obj.material.diffuse[2]
      );
      this.gl.uniform3f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uSpecular"),
        obj.material.specular[0],
        obj.material.specular[1],
        obj.material.specular[2]
      );
      this.gl.uniform1f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uShininess"),
        obj.material.shininess
      );
      this.gl.uniform1f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uMetallic"),
        obj.material.metallic
      );
      this.gl.uniform1f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uRoughness"),
        obj.material.roughness
      );
      this.gl.uniform3f(
        this.gl.getUniformLocation(this.program as WebGLProgram, "uEmissive"),
        obj.material.emissive[0],
        obj.material.emissive[1],
        obj.material.emissive[2]
      );

      this.gl.bindVertexArray(obj.vao);
      this.gl.drawElements(
        this.gl.TRIANGLES,
        obj.vertexCount,
        this.gl.UNSIGNED_INT,
        0
      );
    });

    this.gl.bindVertexArray(null);
  }

  getObject(id: string): RenderObject | undefined {
    return this.objects.get(id);
  }

  getAllObjects(): RenderObject[] {
    return Array.from(this.objects.values());
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }
}
