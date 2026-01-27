# 3D Model Assets

Place your `journal.glb` file in this directory.

The 3D journal figure loader expects the file to be at:
`/assets/svg/journal.glb`

## GLB Requirements

GLB is a binary 3D model format (glTF 2.0) that works perfectly with Three.js:
- Can include textures, materials, and animations
- Much more efficient than SVG for 3D models
- Supports PBR materials, lighting, and more
- Industry standard format for web 3D

The loader will:
1. Load the GLB model using GLTFLoader
2. Center it automatically
3. Scale it to fit the container
4. Rotate it based on scroll position
5. Add orbiting journal blocks around it

## Model Tips

- Keep file size reasonable (< 5MB recommended)
- Use compressed textures if possible
- The model will be scaled to 0.5x by default (adjust in code if needed)
- Materials and lighting from the GLB will be preserved
