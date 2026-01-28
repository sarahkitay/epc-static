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

    // Create TWO renderers (back + front for occlusion)
    const backContainer = document.getElementById('journal-3d-back');
    const frontContainer = document.getElementById('journal-3d-front');
    if (!backContainer || !frontContainer) return;

    // Back renderer (figure)
    const backRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    backRenderer.setClearAlpha(0);
    backRenderer.setSize(window.innerWidth, window.innerHeight);
    backRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    backRenderer.outputColorSpace = THREE.SRGBColorSpace;
    backRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    backRenderer.toneMappingExposure = 1.1;
    backRenderer.physicallyCorrectLights = true;
    backRenderer.shadowMap.enabled = true;
    backRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // Lighting - improved for depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25); // Reduced ambient
    backScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2); // Increased intensity
    keyLight.position.set(100, 100, 100);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    backScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xC9B27F, 0.5);
    fillLight.position.set(-100, 50, -50);
    backScene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xC9B27F, 0.9); // Increased for depth
    backLight.position.set(0, -50, -100);
    backScene.add(backLight);

    // Figure containers
    const backFigureGroup = new THREE.Group();
    const frontFigureGroup = new THREE.Group();
    backScene.add(backFigureGroup);
    frontScene.add(frontFigureGroup);

    // Load GLB
    const loader = new GLTFLoader();
    let figureModel = null;

    const glbPaths = [
      (typeof location !== 'undefined' && location.origin ? location.origin + '/assets/svg/journal.glb' : '/assets/svg/journal.glb'),
      '/assets/svg/journal.glb',
      './assets/svg/journal.glb',
      'assets/svg/journal.glb'
    ];

    let pathIndex = 0;
    function tryLoadGLB() {
      if (pathIndex >= glbPaths.length) {
        console.warn('GLB not found, using placeholder');
        const geometry = new THREE.BoxGeometry(50, 150, 50);
        const material = new THREE.MeshStandardMaterial({ color: 0xC9B27F });
        const placeholder = new THREE.Mesh(geometry, material);
        backFigureGroup.add(placeholder);
        backFigureGroup.scale.set(2, 2, 2);
        return;
      }

      loader.load(
        glbPaths[pathIndex],
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
          
          // BACK SCENE: Normal materials with improved depth
          const backClone = figureModel.clone(true);
          backClone.traverse((o) => {
            if (o.isMesh && o.material) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.material.isMeshStandardMaterial) {
                o.material.metalness = 0.15;
                o.material.roughness = 0.55;
              }
            }
          });
          backFigureGroup.add(backClone);
          backFigureGroup.position.set(0, 0, 0);
          
          // FRONT SCENE: Alpha-only occlusion mask
          const frontClone = figureModel.clone(true);
          frontClone.traverse((o) => {
            if (o.isMesh) {
              o.material = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.95 // Slight transparency for subtle occlusion
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
          
          console.log('GLB loaded from:', glbPaths[pathIndex], 'Scale:', scale, 'Camera Z:', camera.position.z);
        },
        undefined,
        (error) => {
          console.warn('GLB load error for', glbPaths[pathIndex], ':', error);
          pathIndex++;
          tryLoadGLB();
        }
      );
    }

    tryLoadGLB();

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
  `;
  document.head.appendChild(moduleScript);
})();
