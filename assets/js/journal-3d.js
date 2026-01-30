// 3D Journal Figure - Single renderer (no occlusion layer)
(function() {
  'use strict';

  if (window.innerWidth <= 768) return;

  const backContainer = document.getElementById('journal-3d-back');
  if (!backContainer) return;

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

  const moduleScript = document.createElement('script');
  moduleScript.type = 'module';
  moduleScript.textContent = `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

    // Wrap in async IIFE since modules can't use top-level return
    (async function initJournal3D() {
      const backContainer = document.getElementById('journal-3d-back');
      if (!backContainer) {
        console.error('❌ Journal 3D - Container not found');
        return;
      }

    // Single renderer (figure only; no occlusion layer)
    const backRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    backRenderer.setClearAlpha(0);
    backRenderer.setSize(window.innerWidth, window.innerHeight);
    backRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    backRenderer.outputColorSpace = THREE.SRGBColorSpace;
    backRenderer.toneMapping = THREE.NoToneMapping;
    backRenderer.toneMappingExposure = 2.0;
    backRenderer.physicallyCorrectLights = false;
    backRenderer.shadowMap.enabled = false;
    backContainer.appendChild(backRenderer.domElement);

    const backScene = new THREE.Scene();

    // Camera setup - closer for better depth perception
    const camera = new THREE.PerspectiveCamera(
      45, // Smaller FOV for more depth perception
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    camera.position.set(0, 0, 400);

    // Lighting - extremely bright, flat lighting for light/bright appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5); // Extremely bright ambient
    backScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.5); // Very bright directional
    keyLight.position.set(100, 100, 100);
    keyLight.castShadow = false; // Disable shadows for lighter look
    backScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 3.0); // Very bright white fill
    fillLight.position.set(-100, 50, -50);
    backScene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 3.0); // Very bright white back
    backLight.position.set(0, -50, -100);
    backScene.add(backLight);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 2.5); // Bright top light
    topLight.position.set(0, 200, 0);
    backScene.add(topLight);
    
    const sideLight = new THREE.DirectionalLight(0xffffff, 2.0); // Additional side light
    sideLight.position.set(-150, 0, 0);
    backScene.add(sideLight);

    const backFigureGroup = new THREE.Group();
    backScene.add(backFigureGroup);

    // Load GLB
    const loader = new GLTFLoader();
    let figureModel = null;

    // Path relative to blog.html (which is in root)
    // blog.html is at root, GLB is at assets/svg/journal.glb
    // Use simple relative path - works from root HTML file
    const glbUrl = 'assets/svg/journal.glb';

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
                // Extremely light, bright material
                o.material.metalness = 0.0; // No metalness for lighter look
                o.material.roughness = 0.9; // More matte = lighter
                o.material.emissive = new THREE.Color(0x999999); // Very bright emissive
                o.material.emissiveIntensity = 0.6; // Higher emissive intensity
                o.material.color.multiplyScalar(2.0); // Double the base color brightness
              }
            }
          });
          backFigureGroup.add(backClone);
          backFigureGroup.position.set(0, 0, 0);
          
          // Adjust camera to ensure full figure is visible
          const newBox = new THREE.Box3().setFromObject(backFigureGroup);
          const newSize = newBox.getSize(new THREE.Vector3());
          const maxSize = Math.max(newSize.x, newSize.y, newSize.z);
          const distance = maxSize * 3;
          camera.position.z = Math.max(400, distance);
          camera.updateProjectionMatrix();
          requestAnimationFrame(function() {
            backContainer.classList.add('journal-3d-ready');
          });
        },
        undefined,
        (error) => {
          console.warn('GLB load failed, using placeholder:', error?.message || error);
          const geometry = new THREE.BoxGeometry(50, 150, 50);
          const material = new THREE.MeshStandardMaterial({ color: 0xC9B27F });
          const placeholder = new THREE.Mesh(geometry, material);
          backFigureGroup.add(placeholder);
          backFigureGroup.scale.set(2, 2, 2);
          requestAnimationFrame(function() {
            backContainer.classList.add('journal-3d-ready');
          });
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

    // Animation loop - smooth and consistent
    function animate() {
      requestAnimationFrame(animate);

      currentRotation += (targetRotation - currentRotation) * 0.03;
      backFigureGroup.rotation.y = currentRotation;

      const floatY = Math.sin(Date.now() * 0.0003) * 3;
      backFigureGroup.position.y = floatY;

      backRenderer.render(backScene, camera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      backRenderer.setSize(window.innerWidth, window.innerHeight);
      
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
