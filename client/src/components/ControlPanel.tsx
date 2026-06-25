import React, { useState } from "react";
import { Material, Vec3 } from "@/lib/webgl2-engine";

interface ControlPanelProps {
  fleshObjects: Array<{
    id: string;
    position: Vec3;
    scale: number;
    material: string;
  }>;
  selectedFlesh: string;
  onFleshSelect: (id: string) => void;
  onPositionChange: (axis: "x" | "y" | "z", value: number) => void;
  onMaterialChange: (material: string) => void;
  wallMaterial: string;
  onWallMaterialChange: (material: string) => void;
  floorMaterial: string;
  onFloorMaterialChange: (material: string) => void;
  ceilingMaterial: string;
  onCeilingMaterialChange: (material: string) => void;
  materials: Record<string, Material>;
}

export default function ControlPanel({
  fleshObjects,
  selectedFlesh,
  onFleshSelect,
  onPositionChange,
  onMaterialChange,
  wallMaterial,
  onWallMaterialChange,
  floorMaterial,
  onFloorMaterialChange,
  ceilingMaterial,
  onCeilingMaterialChange,
  materials,
}: ControlPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    flesh: true,
    position: true,
    material: true,
    room: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const currentFlesh = fleshObjects.find((f) => f.id === selectedFlesh);

  return (
    <div className="absolute top-4 right-4 w-96 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 max-h-[90vh] overflow-y-auto shadow-2xl font-mono text-xs">
      <h2 className="text-lg font-bold text-lime-400 mb-4">データ's Room</h2>

      {/* Flesh Selection */}
      <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-700">
        <button
          onClick={() => toggleSection("flesh")}
          className="w-full text-left font-semibold text-gray-300 hover:text-white transition-colors"
        >
          {expandedSections.flesh ? "▼" : "▶"} Flesh Objects
        </button>
        {expandedSections.flesh && (
          <div className="mt-2">
            <select
              value={selectedFlesh}
              onChange={(e) => onFleshSelect(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            >
              {fleshObjects.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Position Controls */}
      {expandedSections.position && currentFlesh && (
        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-700">
          <button
            onClick={() => toggleSection("position")}
            className="w-full text-left font-semibold text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            ▼ Position
          </button>
          {["x", "y", "z"].map((axis) => {
            const value = currentFlesh.position[axis as keyof Vec3];
            return (
              <div key={axis} className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-gray-400">{axis.toUpperCase()}</label>
                  <span className="text-lime-400">{value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.05"
                  value={value}
                  onChange={(e) =>
                    onPositionChange(axis as "x" | "y" | "z", parseFloat(e.target.value))
                  }
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={value.toFixed(2)}
                  onChange={(e) =>
                    onPositionChange(axis as "x" | "y" | "z", parseFloat(e.target.value))
                  }
                  className="w-full mt-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Flesh Material */}
      {expandedSections.material && (
        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-700">
          <button
            onClick={() => toggleSection("material")}
            className="w-full text-left font-semibold text-pink-400 hover:text-pink-300 transition-colors mb-2"
          >
            ▼ Flesh Material
          </button>
          <select
            value={currentFlesh?.material || "lime_glossy"}
            onChange={(e) => onMaterialChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs mb-2"
          >
            {Object.keys(materials).map((mat) => (
              <option key={mat} value={mat}>
                {mat.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Material Properties Display */}
          {currentFlesh && materials[currentFlesh.material] && (
            <div className="text-xs text-gray-400 space-y-1 mt-2 p-2 bg-gray-900/50 rounded">
              <div>
                Diffuse:{" "}
                <span className="text-gray-300">
                  ({materials[currentFlesh.material].diffuse.map((v) => v.toFixed(2)).join(", ")})
                </span>
              </div>
              <div>
                Specular:{" "}
                <span className="text-gray-300">
                  ({materials[currentFlesh.material].specular.map((v) => v.toFixed(2)).join(", ")})
                </span>
              </div>
              <div>
                Shininess:{" "}
                <span className="text-gray-300">
                  {materials[currentFlesh.material].shininess.toFixed(0)}
                </span>
              </div>
              <div>
                Metallic:{" "}
                <span className="text-gray-300">
                  {materials[currentFlesh.material].metallic.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Materials */}
      {expandedSections.room && (
        <div className="mb-3 p-3 bg-gray-800/50 rounded border border-gray-700">
          <button
            onClick={() => toggleSection("room")}
            className="w-full text-left font-semibold text-purple-400 hover:text-purple-300 transition-colors mb-2"
          >
            ▼ Room Materials
          </button>

          <div className="space-y-2">
            <div>
              <label className="text-gray-400 block mb-1">Walls</label>
              <select
                value={wallMaterial}
                onChange={(e) => onWallMaterialChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              >
                {Object.keys(materials).map((mat) => (
                  <option key={mat} value={mat}>
                    {mat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Floor</label>
              <select
                value={floorMaterial}
                onChange={(e) => onFloorMaterialChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              >
                {Object.keys(materials).map((mat) => (
                  <option key={mat} value={mat}>
                    {mat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Ceiling</label>
              <select
                value={ceilingMaterial}
                onChange={(e) => onCeilingMaterialChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              >
                {Object.keys(materials).map((mat) => (
                  <option key={mat} value={mat}>
                    {mat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="text-xs text-gray-500 p-2 bg-gray-800/30 rounded border border-gray-700 mt-3">
        <p className="mb-1">• Mouse: Look around</p>
        <p className="mb-1">• Drag sliders: Adjust position</p>
        <p>• Select materials: Customize look</p>
      </div>
    </div>
  );
}
