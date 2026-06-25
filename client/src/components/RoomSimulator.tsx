import React, { useEffect, useRef, useState } from "react";
import {
  WebGL2Engine,
  Mat4Utils,
  Material,
  RenderObject,
  Vec3,
} from "@/lib/webgl2-engine";
import * as GeometryUtils from "@/lib/geometry-utils";
import ControlPanel from "./ControlPanel";

// Material presets - EXCESSIVE collection
const MATERIALS = {
  lime_glossy: {
    ambient: [0.3, 0.8, 0.2],
    diffuse: [0.5, 1, 0.3],
    specular: [1, 1, 0.8],
    shininess: 128,
    metallic: 0.2,
    roughness: 0.1,
    emissive: [0.1, 0.3, 0],
  } as Material,
  lime_matte: {
    ambient: [0.2, 0.6, 0.15],
    diffuse: [0.4, 0.9, 0.25],
    specular: [0.3, 0.3, 0.2],
    shininess: 8,
    metallic: 0,
    roughness: 0.9,
    emissive: [0, 0, 0],
  } as Material,
  metal_chrome: {
    ambient: [0.5, 0.5, 0.5],
    diffuse: [0.7, 0.7, 0.7],
    specular: [1, 1, 1],
    shininess: 256,
    metallic: 1,
    roughness: 0.05,
    emissive: [0.1, 0.1, 0.1],
  } as Material,
  metal_gold: {
    ambient: [0.5, 0.35, 0.1],
    diffuse: [0.8, 0.6, 0.2],
    specular: [1, 0.9, 0.4],
    shininess: 200,
    metallic: 0.9,
    roughness: 0.1,
    emissive: [0.2, 0.15, 0.05],
  } as Material,
  metal_copper: {
    ambient: [0.4, 0.2, 0.1],
    diffuse: [0.7, 0.4, 0.2],
    specular: [1, 0.6, 0.3],
    shininess: 150,
    metallic: 0.85,
    roughness: 0.15,
    emissive: [0.15, 0.08, 0.04],
  } as Material,
  neon_pink: {
    ambient: [0.6, 0.1, 0.3],
    diffuse: [1, 0.2, 0.6],
    specular: [1, 0.5, 0.8],
    shininess: 64,
    metallic: 0.3,
    roughness: 0.3,
    emissive: [0.5, 0, 0.2],
  } as Material,
  neon_cyan: {
    ambient: [0.1, 0.6, 0.6],
    diffuse: [0.2, 1, 1],
    specular: [0.8, 1, 1],
    shininess: 64,
    metallic: 0.3,
    roughness: 0.3,
    emissive: [0, 0.3, 0.3],
  } as Material,
  neon_purple: {
    ambient: [0.4, 0.1, 0.6],
    diffuse: [0.8, 0.2, 1],
    specular: [1, 0.5, 1],
    shininess: 64,
    metallic: 0.3,
    roughness: 0.3,
    emissive: [0.3, 0, 0.4],
  } as Material,
  neon_yellow: {
    ambient: [0.6, 0.6, 0.1],
    diffuse: [1, 1, 0.2],
    specular: [1, 1, 0.5],
    shininess: 64,
    metallic: 0.3,
    roughness: 0.3,
    emissive: [0.4, 0.4, 0],
  } as Material,
  neon_orange: {
    ambient: [0.6, 0.3, 0.1],
    diffuse: [1, 0.6, 0.2],
    specular: [1, 0.7, 0.4],
    shininess: 64,
    metallic: 0.3,
    roughness: 0.3,
    emissive: [0.5, 0.25, 0],
  } as Material,
  dark_matte: {
    ambient: [0.1, 0.1, 0.12],
    diffuse: [0.15, 0.15, 0.18],
    specular: [0.1, 0.1, 0.1],
    shininess: 4,
    metallic: 0,
    roughness: 1,
    emissive: [0, 0, 0],
  } as Material,
  noise_texture: {
    ambient: [0.25, 0.25, 0.3],
    diffuse: [0.4, 0.4, 0.45],
    specular: [0.5, 0.5, 0.5],
    shininess: 32,
    metallic: 0.1,
    roughness: 0.5,
    emissive: [0.05, 0.05, 0.08],
  } as Material,
  glitch_red: {
    ambient: [0.5, 0.1, 0.1],
    diffuse: [0.9, 0.2, 0.2],
    specular: [1, 0.4, 0.4],
    shininess: 48,
    metallic: 0.2,
    roughness: 0.4,
    emissive: [0.3, 0.05, 0.05],
  } as Material,
  glitch_green: {
    ambient: [0.1, 0.5, 0.1],
    diffuse: [0.2, 0.9, 0.2],
    specular: [0.4, 1, 0.4],
    shininess: 48,
    metallic: 0.2,
    roughness: 0.4,
    emissive: [0.05, 0.3, 0.05],
  } as Material,
  glitch_blue: {
    ambient: [0.1, 0.1, 0.5],
    diffuse: [0.2, 0.2, 0.9],
    specular: [0.4, 0.4, 1],
    shininess: 48,
    metallic: 0.2,
    roughness: 0.4,
    emissive: [0.05, 0.05, 0.3],
  } as Material,
  pearl_white: {
    ambient: [0.4, 0.4, 0.42],
    diffuse: [0.7, 0.7, 0.75],
    specular: [1, 1, 1],
    shininess: 180,
    metallic: 0.4,
    roughness: 0.08,
    emissive: [0.08, 0.08, 0.1],
  } as Material,
  rubber_black: {
    ambient: [0.05, 0.05, 0.05],
    diffuse: [0.1, 0.1, 0.1],
    specular: [0.2, 0.2, 0.2],
    shininess: 12,
    metallic: 0,
    roughness: 0.95,
    emissive: [0, 0, 0],
  } as Material,
};

interface FleshObject {
  id: string;
  position: Vec3;
  scale: number;
  material: keyof typeof MATERIALS;
}

interface DecorObject {
  id: string;
  type: "cube" | "sphere" | "cylinder" | "torus" | "pyramid" | "organic";
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material: keyof typeof MATERIALS;
}

export default function RoomSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGL2Engine | null>(null);
  const [fleshObjects, setFleshObjects] = useState<FleshObject[]>([
    {
      id: "flesh1",
      position: { x: 0, y: 1.5, z: 0 },
      scale: 0.8,
      material: "lime_glossy",
    },
    {
      id: "flesh2",
      position: { x: 2, y: 1, z: -2 },
      scale: 0.5,
      material: "lime_matte",
    },
    {
      id: "flesh3",
      position: { x: -2, y: 1.2, z: 1 },
      scale: 0.6,
      material: "neon_pink",
    },
    {
      id: "flesh4",
      position: { x: 1.5, y: 0.8, z: 2.5 },
      scale: 0.4,
      material: "neon_cyan",
    },
    {
      id: "flesh5",
      position: { x: -1.5, y: 1.8, z: -1.5 },
      scale: 0.7,
      material: "neon_purple",
    },
  ]);

  const [selectedFlesh, setSelectedFlesh] = useState<string>("flesh1");
  const [wallMaterial, setWallMaterial] = useState<keyof typeof MATERIALS>("dark_matte");
  const [floorMaterial, setFloorMaterial] = useState<keyof typeof MATERIALS>("noise_texture");
  const [ceilingMaterial, setCeilingMaterial] = useState<keyof typeof MATERIALS>("dark_matte");
  const [decorObjects] = useState<DecorObject[]>([
    {
      id: "decor_cube_1",
      type: "cube",
      position: { x: 3, y: 1, z: 2 },
      rotation: { x: 0.3, y: 0.5, z: 0.2 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
      material: "metal_chrome",
    },
    {
      id: "decor_sphere_1",
      type: "sphere",
      position: { x: -3, y: 1.5, z: -2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      material: "neon_cyan",
    },
    {
      id: "decor_torus_1",
      type: "torus",
      position: { x: 2, y: 2.5, z: -3 },
      rotation: { x: 0.5, y: 0.3, z: 0.1 },
      scale: { x: 0.7, y: 0.7, z: 0.7 },
      material: "neon_pink",
    },
    {
      id: "decor_cylinder_1",
      type: "cylinder",
      position: { x: -2, y: 1, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0.4, y: 1, z: 0.4 },
      material: "metal_gold",
    },
    {
      id: "decor_pyramid_1",
      type: "pyramid",
      position: { x: 0, y: 1, z: -3.5 },
      rotation: { x: 0.2, y: 0.4, z: 0.1 },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      material: "glitch_red",
    },
    {
      id: "decor_cube_2",
      type: "cube",
      position: { x: -3.5, y: 2, z: 1 },
      rotation: { x: 0.1, y: 0.7, z: 0.3 },
      scale: { x: 0.4, y: 0.4, z: 0.4 },
      material: "metal_copper",
    },
    {
      id: "decor_sphere_2",
      type: "sphere",
      position: { x: 3.5, y: 1.2, z: -1 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0.6, y: 0.6, z: 0.6 },
      material: "neon_yellow",
    },
    {
      id: "decor_organic_1",
      type: "organic",
      position: { x: 0, y: 3, z: 0 },
      rotation: { x: 0.2, y: 0.3, z: 0.1 },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      material: "glitch_green",
    },
  ]);

  // Initialize engine and scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new WebGL2Engine(canvas);
    engineRef.current = engine;

    // Create room
    const floorGeo = GeometryUtils.createCube(10);
    const floor: RenderObject = {
      id: "floor",
      position: { x: 0, y: -0.1, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 0.1, z: 1 },
      material: { ...MATERIALS[floorMaterial], id: "floor_mat" },
      vertices: floorGeo.vertices,
      indices: floorGeo.indices,
      normals: floorGeo.normals,
      vao: null,
      vertexCount: floorGeo.indices.length,
    };
    engine.addObject(floor);

    // Walls
    const wallGeo = GeometryUtils.createCube(10);
    const walls = [
      { x: 0, z: -5, name: "back" },
      { x: 0, z: 5, name: "front" },
      { x: -5, z: 0, name: "left" },
      { x: 5, z: 0, name: "right" },
    ];

    walls.forEach((wall) => {
      const w: RenderObject = {
        id: `wall_${wall.name}`,
        position: { x: wall.x, y: 2.5, z: wall.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: wall.x === 0 ? 1 : 0.1, y: 1, z: wall.z === 0 ? 0.1 : 1 },
        material: { ...MATERIALS[wallMaterial], id: `wall_${wall.name}_mat` },
        vertices: wallGeo.vertices,
        indices: wallGeo.indices,
        normals: wallGeo.normals,
        vao: null,
        vertexCount: wallGeo.indices.length,
      };
      engine.addObject(w);
    });

    // Ceiling
    const ceilingGeo = GeometryUtils.createCube(10);
    const ceiling: RenderObject = {
      id: "ceiling",
      position: { x: 0, y: 5.1, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 0.1, z: 1 },
      material: { ...MATERIALS[ceilingMaterial], id: "ceiling_mat" },
      vertices: ceilingGeo.vertices,
      indices: ceilingGeo.indices,
      normals: ceilingGeo.normals,
      vao: null,
      vertexCount: ceilingGeo.indices.length,
    };
    engine.addObject(ceiling);

    // Add flesh objects
    fleshObjects.forEach((flesh) => {
      const geo = GeometryUtils.createOrganic(flesh.scale, 1.5);
      const obj: RenderObject = {
        id: flesh.id,
        position: flesh.position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        material: { ...MATERIALS[flesh.material], id: `${flesh.id}_mat` },
        vertices: geo.vertices,
        indices: geo.indices,
        normals: geo.normals,
        vao: null,
        vertexCount: geo.indices.length,
      };
      engine.addObject(obj);
    });

    // Add decoration objects
    decorObjects.forEach((decor) => {
      let geo: GeometryUtils.Geometry;
      switch (decor.type) {
        case "cube":
          geo = GeometryUtils.createCube(1);
          break;
        case "sphere":
          geo = GeometryUtils.createSphere(0.5, 24, 16);
          break;
        case "cylinder":
          geo = GeometryUtils.createCylinder(0.5, 1, 24);
          break;
        case "torus":
          geo = GeometryUtils.createTorus(0.5, 0.2, 24, 16);
          break;
        case "pyramid":
          geo = GeometryUtils.createPyramid(1);
          break;
        case "organic":
          geo = GeometryUtils.createOrganic(0.5, 2);
          break;
      }

      const obj: RenderObject = {
        id: decor.id,
        position: decor.position,
        rotation: decor.rotation,
        scale: decor.scale,
        material: { ...MATERIALS[decor.material], id: `${decor.id}_mat` },
        vertices: geo.vertices,
        indices: geo.indices,
        normals: geo.normals,
        vao: null,
        vertexCount: geo.indices.length,
      };
      engine.addObject(obj);
    });

    // Animation loop
    let animationId: number;
    const animate = () => {
      engine.render();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (canvas.parentElement) {
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        engine.resize(width, height);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update flesh object positions
  useEffect(() => {
    if (!engineRef.current) return;

    fleshObjects.forEach((flesh) => {
      engineRef.current!.updateObjectPosition(flesh.id, flesh.position);
    });
  }, [fleshObjects]);

  // Update materials
  useEffect(() => {
    if (!engineRef.current) return;

    const wallMat = MATERIALS[wallMaterial];
    ["wall_back", "wall_front", "wall_left", "wall_right"].forEach((id) => {
      engineRef.current!.updateObjectMaterial(id, wallMat);
    });
  }, [wallMaterial]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateObjectMaterial("floor", MATERIALS[floorMaterial]);
  }, [floorMaterial]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateObjectMaterial("ceiling", MATERIALS[ceilingMaterial]);
  }, [ceilingMaterial]);

  const updateFleshPosition = (axis: "x" | "y" | "z", value: number) => {
    setFleshObjects((prev) =>
      prev.map((f) =>
        f.id === selectedFlesh
          ? { ...f, position: { ...f.position, [axis]: value } }
          : f
      )
    );
  };

  const updateFleshMaterial = (material: keyof typeof MATERIALS) => {
    setFleshObjects((prev) =>
      prev.map((f) =>
        f.id === selectedFlesh ? { ...f, material } : f
      )
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      <canvas
        ref={canvasRef}
        className="flex-1 w-full"
        style={{ display: "block" }}
      />

      <ControlPanel
        fleshObjects={fleshObjects}
        selectedFlesh={selectedFlesh}
        onFleshSelect={setSelectedFlesh}
        onPositionChange={updateFleshPosition}
        onMaterialChange={(mat) => updateFleshMaterial(mat as keyof typeof MATERIALS)}
        wallMaterial={wallMaterial}
        onWallMaterialChange={(mat) => setWallMaterial(mat as keyof typeof MATERIALS)}
        floorMaterial={floorMaterial}
        onFloorMaterialChange={(mat) => setFloorMaterial(mat as keyof typeof MATERIALS)}
        ceilingMaterial={ceilingMaterial}
        onCeilingMaterialChange={(mat) => setCeilingMaterial(mat as keyof typeof MATERIALS)}
        materials={MATERIALS}
      />
    </div>
  );
}
