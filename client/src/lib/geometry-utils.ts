/**
 * Extended geometry generation utilities for 3D objects
 */

export interface Geometry {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
}

export function createCube(size: number = 1): Geometry {
  const s = size / 2;
  const vertices = new Float32Array([
    -s, -s, s, s, -s, s, s, s, s, -s, s, s, -s, -s, -s, -s, s, -s, s, s, -s,
    s, -s, -s, -s, -s, -s, -s, s, s, s, s, s, s, s, -s, -s, -s, -s, s, -s, s,
    s, s, s, s, -s, s, -s, -s, -s, s, -s, -s, s, -s, s, -s, s, s, -s, s, -s,
  ]);

  const indices = new Uint32Array([
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 8, 9, 10, 8, 10, 11, 12, 14, 13,
    12, 15, 14, 16, 17, 18, 16, 18, 19, 20, 22, 21, 20, 23, 22,
  ]);

  const normals = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    -1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    -1, 0,
  ]);

  return { vertices, indices, normals };
}

export function createSphere(
  radius: number = 1,
  segments: number = 32,
  rings: number = 16
): Geometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let ring = 0; ring <= rings; ring++) {
    const theta = (ring * Math.PI) / rings;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let seg = 0; seg <= segments; seg++) {
      const phi = (seg * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      vertices.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const a = ring * (segments + 1) + seg;
      const b = a + segments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    normals: new Float32Array(normals),
  };
}

export function createCylinder(
  radius: number = 1,
  height: number = 2,
  segments: number = 32
): Geometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const h = height / 2;

  // Top circle
  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, h, z);
    normals.push(0, 1, 0);
  }

  // Bottom circle
  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, -h, z);
    normals.push(0, -1, 0);
  }

  // Side normals
  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);

    vertices.push(nx * radius, h, nz * radius);
    normals.push(nx, 0, nz);

    vertices.push(nx * radius, -h, nz * radius);
    normals.push(nx, 0, nz);
  }

  // Top cap
  for (let i = 0; i < segments; i++) {
    indices.push(i, i + 1, segments + 1);
  }

  // Bottom cap
  const offset = segments + 2;
  for (let i = 0; i < segments; i++) {
    indices.push(offset + i + 1, offset + i, offset + segments + 1);
  }

  // Sides
  const sideOffset = offset + segments + 2;
  for (let i = 0; i < segments; i++) {
    const a = sideOffset + i * 2;
    const b = a + 1;
    const c = sideOffset + ((i + 1) * 2) % (segments * 2);
    const d = c + 1;

    indices.push(a, c, b);
    indices.push(c, d, b);
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    normals: new Float32Array(normals),
  };
}

export function createTorus(
  majorRadius: number = 1,
  minorRadius: number = 0.3,
  majorSegments: number = 32,
  minorSegments: number = 16
): Geometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i <= majorSegments; i++) {
    const theta = (i * 2 * Math.PI) / majorSegments;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    for (let j = 0; j <= minorSegments; j++) {
      const phi = (j * 2 * Math.PI) / minorSegments;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
      const y = minorRadius * sinPhi;
      const z = (majorRadius + minorRadius * cosPhi) * sinTheta;

      vertices.push(x, y, z);

      const nx = cosPhi * cosTheta;
      const ny = sinPhi;
      const nz = cosPhi * sinTheta;
      normals.push(nx, ny, nz);
    }
  }

  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * (minorSegments + 1) + j;
      const b = a + minorSegments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    normals: new Float32Array(normals),
  };
}

export function createOrganic(scale: number = 1, complexity: number = 1): Geometry {
  const base = createSphere(scale, Math.max(16, 32 * complexity), Math.max(12, 24 * complexity));
  const vertices = new Float32Array(base.vertices);

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);

    const noise1 = Math.sin(x * 5) * Math.cos(y * 5) * Math.sin(z * 5);
    const noise2 = Math.cos(x * 3) * Math.sin(y * 7) * Math.cos(z * 4);
    const noise3 = Math.sin((x + y + z) * 2) * Math.cos((x - y) * 3);

    const totalNoise = (noise1 * 0.4 + noise2 * 0.35 + noise3 * 0.25) * 0.4 * complexity;
    const factor = 1 + totalNoise;

    if (dist > 0.001) {
      vertices[i] = (x / dist) * dist * factor;
      vertices[i + 1] = (y / dist) * dist * factor;
      vertices[i + 2] = (z / dist) * dist * factor;
    }
  }

  return {
    vertices,
    indices: base.indices,
    normals: base.normals,
  };
}

export function createPyramid(size: number = 1): Geometry {
  const s = size / 2;
  const h = size;

  const vertices = new Float32Array([
    // Base
    -s, 0, -s, s, 0, -s, s, 0, s, -s, 0, s,
    // Apex
    0, h, 0, 0, h, 0, 0, h, 0, 0, h, 0,
  ]);

  const indices = new Uint32Array([
    // Base
    0, 2, 1, 0, 3, 2,
    // Sides
    0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0,
  ]);

  const normals = new Float32Array([
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0,
  ]);

  return { vertices, indices, normals };
}

export function createOctahedron(size: number = 1): Geometry {
  const s = size / Math.sqrt(2);

  const vertices = new Float32Array([
    s, 0, 0, -s, 0, 0, 0, s, 0, 0, -s, 0, 0, 0, s, 0, 0, -s,
  ]);

  const indices = new Uint32Array([
    0, 4, 2, 0, 2, 5, 0, 5, 3, 0, 3, 4, 1, 2, 4, 1, 5, 2, 1, 3, 5, 1, 4, 3,
  ]);

  const normals = new Float32Array([
    1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 1, 0, 0, -1, 0,
    0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0,
    -1, 0,
  ]);

  return { vertices, indices, normals };
}

export function createIcosahedron(size: number = 1): Geometry {
  const phi = (1 + Math.sqrt(5)) / 2;
  const s = size / Math.sqrt(phi + 2);

  const vertices = new Float32Array([
    -1, phi, 0, 1, phi, 0, -1, -phi, 0, 1, -phi, 0, 0, -1, phi, 0, 1, phi, 0,
    -1, -phi, 0, 1, -phi, phi, 0, -1, phi, 0, 1, -phi, 0, -1, -phi, 0, 1,
  ].map((v) => v * s));

  const indices = new Uint32Array([
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11,
    10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4,
    9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ]);

  const normals = new Float32Array(vertices.length);
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(
      vertices[i] * vertices[i] +
        vertices[i + 1] * vertices[i + 1] +
        vertices[i + 2] * vertices[i + 2]
    );
    normals[i] = vertices[i] / len;
    normals[i + 1] = vertices[i + 1] / len;
    normals[i + 2] = vertices[i + 2] / len;
  }

  return { vertices, indices, normals };
}

export function createNoisyPlane(
  width: number = 1,
  depth: number = 1,
  segments: number = 16
): Geometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const xStep = width / segments;
  const zStep = depth / segments;

  for (let z = 0; z <= segments; z++) {
    for (let x = 0; x <= segments; x++) {
      const px = (x - segments / 2) * xStep;
      const pz = (z - segments / 2) * zStep;
      const noise =
        Math.sin(px * 3) * Math.cos(pz * 3) * 0.1 +
        Math.sin((px + pz) * 5) * 0.05;
      const py = noise;

      vertices.push(px, py, pz);
      normals.push(0, 1, 0);
    }
  }

  for (let z = 0; z < segments; z++) {
    for (let x = 0; x < segments; x++) {
      const a = z * (segments + 1) + x;
      const b = a + segments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    normals: new Float32Array(normals),
  };
}
