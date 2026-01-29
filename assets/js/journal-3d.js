// 3D Journal Figure - Dual renderer for occlusion (back + front)
(function() {
  'use strict';

  // Check if we're on mobile (skip 3D on mobile)
  if (window.innerWidth <= 768) {
    return;
  }

  // Add importmap if not present
  if (!document.querySelector('script[type="importmap"]')) {
    const importMap = document.createElement('script');
    importMap.type = 'importmap';
    importMap.textContent = JSON.stringify({
      imports: {
        "three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/"
      }
    });
    document.head.appendChild(importMap);
  }

  // Load as ES module
  const moduleScript = document.createElement('script');
  moduleScript.type = 'module';
  moduleScript.textContent = `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    // Wrap in async IIFE since modules can't use top-level return
    (async function initJournal3D() {
      // Create TWO renderers (back + front for occlusion)
      const backContainer = document.getElementById('journal-3d-back');
      const frontContainer = document.getElementById('journal-3d-front');
      if (!backContainer || !frontContainer) {
        console.error('❌ Journal 3D - Containers not found!', {
          backContainer: !!backContainer,
          frontContainer: !!frontContainer
        });
        return; // Exit early if containers don't exist
      }

    // Back renderer (figure)
    const backRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    backRenderer.setClearAlpha(0);
    backRenderer.setSize(window.innerWidth, window.innerHeight);
    backRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    backRenderer.outputColorSpace = THREE.SRGBColorSpace;
    backRenderer.toneMapping = THREE.NoToneMapping; // Brighter, no tone mapping
    backRenderer.toneMappingExposure = 1.5; // Increased exposure
    backRenderer.physicallyCorrectLights = false; // Simpler, brighter lighting
    backRenderer.shadowMap.enabled = false; // No shadows for lighter look
    backContainer.appendChild(backRenderer.domElement);

    // Front renderer (occlusion mask)
    const frontRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    frontRenderer.setClearAlpha(0);
    frontRenderer.setSize(window.innerWidth, window.innerHeight);
    frontRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    frontContainer.appendChild(frontRenderer.domElement);

    // Shared scene setup
    const backScene = new THREE.Scene();
    const frontScene = new THREE.Scene();

    // Camera setup - closer for better depth perception
    const camera = new THREE.PerspectiveCamera(
      45, // Smaller FOV for more depth perception
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    camera.position.set(0, 0, 400);

    // Lighting - very bright, flat lighting for light/bright appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8); // Very bright ambient
    backScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5); // Bright directional
    keyLight.position.set(100, 100, 100);
    keyLight.castShadow = false; // Disable shadows for lighter look
    backScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 2.0); // Bright white fill
    fillLight.position.set(-100, 50, -50);
    backScene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 2.0); // Bright white back
    backLight.position.set(0, -50, -100);
    backScene.add(backLight);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 1.5); // Additional top light
    topLight.position.set(0, 200, 0);
    backScene.add(topLight);

    // Figure containers
    const backFigureGroup = new THREE.Group();
    const frontFigureGroup = new THREE.Group();
    backScene.add(backFigureGroup);
    frontScene.add(frontFigureGroup);

    // Load GLB
    const loader = new GLTFLoader();
    let figureModel = null;

    // Path relative to blog.html (which is in root)
    // blog.html is at root, GLB is at assets/svg/journal.glb
    // Use simple relative path - works from root HTML file
    const glbUrl = 'assets/svg/journal.glb';
    
    console.log('🔵 Journal 3D - Containers found:', {
      backContainer: !!backContainer,
      frontContainer: !!frontContainer,
      backContainerId: backContainer?.id,
      frontContainerId: frontContainer?.id
    });
    console.log('🔵 Journal 3D - GLB URL:', glbUrl);
    console.log('🔵 Journal 3D - Full URL will be:', new URL(glbUrl, window.location.href).href);

    loader.load(
      glbUrl,
      (gltf) => {
          figureModel = gltf.scene;
          
          // Center the model
          const box = new THREE.Box3().setFromObject(figureModel);
          const center = box.getCenter(new THREE.Vector3());
          figureModel.position.sub(center);
          
          // Scale to fit viewport
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const viewportHeight = window.innerHeight;
          const targetHeight = viewportHeight * 0.7;
          const scale = targetHeight / maxDim;
          figureModel.scale.multiplyScalar(scale);
          
          // BACK SCENE: Bright, light materials
          const backClone = figureModel.clone(true);
          backClone.traverse((o) => {
            if (o.isMesh && o.material) {
              o.castShadow = false; // No shadows for lighter look
              o.receiveShadow = false;
              if (o.material.isMeshStandardMaterial) {
                // Very light, bright material
                o.material.metalness = 0.05;
                o.material.roughness = 0.8;
                o.material.emissive = new THREE.Color(0x666666); // Much brighter emissive
                o.material.emissiveIntensity = 0.4;
                o.material.color.multiplyScalar(1.5); // Brighten base color
              }
            }
          });
          backFigureGroup.add(backClone);
          backFigureGroup.position.set(0, 0, 0);
          
          // FRONT SCENE: Solid black occlusion mask (to make cards appear behind figure)
          const frontClone = figureModel.clone(true);
          frontClone.traverse((o) => {
            if (o.isMesh) {
              o.material = new THREE.MeshBasicMaterial({
                color: 0x070707, // Match background
                transparent: false,
                opacity: 1.0,
                depthWrite: true,
                depthTest: false // Always on top
              });
            }
          });
          frontFigureGroup.add(frontClone);
          frontFigureGroup.position.set(0, 0, 0);
          
          // Adjust camera to ensure full figure is visible
          const newBox = new THREE.Box3().setFromObject(backFigureGroup);
          const newSize = newBox.getSize(new THREE.Vector3());
          const maxSize = Math.max(newSize.x, newSize.y, newSize.z);
          const distance = maxSize * 3;
          camera.position.z = Math.max(400, distance);
          camera.updateProjectionMatrix();
          
          console.log('✅ GLB loaded successfully! Scale:', scale, 'Camera Z:', camera.position.z);
        },
        undefined,
        (error) => {
          console.error('❌ GLB load failed:', error);
          console.warn('Using placeholder cube instead');
          // Fallback placeholder
          const geometry = new THREE.BoxGeometry(50, 150, 50);
          const material = new THREE.MeshStandardMaterial({ color: 0xC9B27F });
          const placeholder = new THREE.Mesh(geometry, material);
          backFigureGroup.add(placeholder);
          backFigureGroup.scale.set(2, 2, 2);
          
          // Also add to front for occlusion
          const frontPlaceholder = placeholder.clone();
          frontPlaceholder.traverse((o) => {
            if (o.isMesh) {
              o.material = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.95
              });
            }
          });
          frontFigureGroup.add(frontPlaceholder);
        }
      );

    // Scroll-based rotation
    let scrollPercent = 0;
    let targetRotation = 0;
    let currentRotation = 0;

    window.addEventListener('scroll', () => {
      scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      targetRotation = scrollPercent * Math.PI * 2;
    }, { passive: true });

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Smooth rotation
      currentRotation += (targetRotation - currentRotation) * 0.05;
      backFigureGroup.rotation.y = currentRotation;
      frontFigureGroup.rotation.y = currentRotation;

      // Gentle floating animation
      const floatY = Math.sin(Date.now() * 0.0005) * 5;
      backFigureGroup.position.y = floatY;
      frontFigureGroup.position.y = floatY;

      // Render both scenes
      backRenderer.render(backScene, camera);
      frontRenderer.render(frontScene, camera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      backRenderer.setSize(window.innerWidth, window.innerHeight);
      frontRenderer.setSize(window.innerWidth, window.innerHeight);
      
      // Recalculate camera distance if model is loaded
      if (figureModel) {
        const box = new THREE.Box3().setFromObject(backFigureGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const distance = maxSize * 3;
        camera.position.z = Math.max(400, distance);
        camera.updateProjectionMatrix();
      }
    });
    })(); // End of async IIFE
  `;
  document.head.appendChild(moduleScript);
})();
