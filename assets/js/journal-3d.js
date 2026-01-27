// 3D Journal Figure - Centered and larger, full length visible
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

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    // Position camera much further back to see full figure
    camera.position.set(0, 0, 500);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(renderer.domElement);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(100, 100, 100);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xC9B27F, 0.5);
    fillLight.position.set(-100, 50, -50);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xC9B27F, 0.4);
    backLight.position.set(0, -50, -100);
    scene.add(backLight);

    // Figure container - centered
    const figureGroup = new THREE.Group();
    scene.add(figureGroup);

    // Load GLB
    const loader = new GLTFLoader();
    let figureModel = null;

    const glbPaths = [
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
        figureGroup.add(placeholder);
        figureGroup.scale.set(2, 2, 2); // Make placeholder larger
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
          
          // Scale up the model to fit viewport height while maintaining aspect ratio
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          // Scale to fit ~70% of viewport height, ensuring full figure is visible with margin
          const viewportHeight = window.innerHeight;
          const targetHeight = viewportHeight * 0.7; // Smaller scale to ensure nothing is cut off
          const scale = targetHeight / maxDim;
          figureModel.scale.multiplyScalar(scale);
          
          figureGroup.add(figureModel);
          figureGroup.position.set(0, 0, 0); // Centered at origin
          
          // Adjust camera to ensure full figure is visible with plenty of margin
          const newBox = new THREE.Box3().setFromObject(figureGroup);
          const newSize = newBox.getSize(new THREE.Vector3());
          const maxSize = Math.max(newSize.x, newSize.y, newSize.z);
          // Set camera distance to see full figure with generous margin (3x the size)
          const distance = maxSize * 3;
          camera.position.z = Math.max(500, distance);
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
      targetRotation = scrollPercent * Math.PI * 2; // Full rotation as you scroll
    }, { passive: true });

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Smooth rotation
      currentRotation += (targetRotation - currentRotation) * 0.05;
      figureGroup.rotation.y = currentRotation;

      // Gentle floating animation
      figureGroup.position.y = Math.sin(Date.now() * 0.0005) * 5;

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Recalculate camera distance if model is loaded
      if (figureModel) {
        const box = new THREE.Box3().setFromObject(figureGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        // Use 3x the size for generous margin to ensure nothing is cut off
        const distance = maxSize * 3;
        camera.position.z = Math.max(500, distance);
        camera.updateProjectionMatrix();
      }
    });
  `;
  document.head.appendChild(moduleScript);
})();
