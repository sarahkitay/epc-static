// 3D Journal Figure - Three.js integration for spiral journal
// Uses ES modules for Three.js
(function() {
  'use strict';

  // Check if we're on desktop (mobile won't run 3D)
  if (window.innerWidth <= 768) {
    return; // Skip 3D on mobile
  }

  const container = document.getElementById('epc-3d-figure-container');
  if (!container) return;

  // Use ES module import for Three.js
  // Add importmap to head if not present
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
      ${container.clientWidth} / ${container.clientHeight},
      0.1,
      1000
    );
    camera.position.z = 600;
    camera.position.y = 0;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(${container.clientWidth}, ${container.clientHeight});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const containerEl = document.getElementById('epc-3d-figure-container');
    containerEl.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(200, 200, 200);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xC9B991, 0.4);
    backLight.position.set(-200, -200, -200);
    scene.add(backLight);

    // Container for the figure
    const figureGroup = new THREE.Group();
    scene.add(figureGroup);

    // Load GLB model
    const loader = new GLTFLoader();
    // Try multiple path variations
    const glbPaths = [
      '/assets/svg/journal.glb',
      './assets/svg/journal.glb',
      'assets/svg/journal.glb'
    ];
    
    let pathIndex = 0;
    function tryLoadGLB() {
      if (pathIndex >= glbPaths.length) {
        console.warn('GLB not found, using placeholder');
        const geometry = new THREE.BoxGeometry(100, 100, 10);
        const material = new THREE.MeshStandardMaterial({ color: 0xC9B991 });
        const placeholder = new THREE.Mesh(geometry, material);
        figureGroup.add(placeholder);
        return;
      }
      
      loader.load(glbPaths[pathIndex], (gltf) => {
      const model = gltf.scene;
      
      // Scale and position the model
      model.scale.set(0.5, 0.5, 0.5);
      model.position.set(0, 0, 0);
      
      // Center the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      
      figureGroup.add(model);
      
        console.log('GLB model loaded successfully from:', glbPaths[pathIndex]);
      }, undefined, (error) => {
        console.warn('GLB load error for', glbPaths[pathIndex], ':', error);
        pathIndex++;
        tryLoadGLB(); // Try next path
      });
    }
    
    tryLoadGLB();

    // Create journal blocks orbiting around figure
    const blocks = [];
    const blockData = [
      { text: 'TRAINING', color: 0xC9B27F },
      { text: 'NUTRITION', color: 0x8B7355 },
      { text: 'RECOVERY', color: 0xA0826D },
      { text: 'MINDSET', color: 0xC9B27F },
      { text: 'SLEEP', color: 0x8B7355 },
      { text: 'ENERGY', color: 0xA0826D }
    ];

    blockData.forEach((data, i) => {
      const geometry = new THREE.BoxGeometry(80, 80, 10);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        metalness: 0.3,
        roughness: 0.4
      });
      const block = new THREE.Mesh(geometry, material);

      const angle = (i / blockData.length) * Math.PI * 2;
      const radius = 200;
      block.userData = {
        angle: angle,
        radius: radius,
        speed: 0.3 + (i * 0.1),
        originalY: Math.sin(i * 1.5) * 50
      };

      blocks.push(block);
      scene.add(block);
    });

    // Scroll-based animation
    let scrollPercent = 0;
    let rafId = null;

    function updateScroll() {
      const containerRect = containerEl.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const containerTop = scrollTop + containerRect.top;
      const viewportHeight = window.innerHeight;
      const scrollPosition = Math.max(0, scrollTop - containerTop + viewportHeight * 0.5);
      scrollPercent = Math.min(1, scrollPosition / 3000);
    }

    function animate() {
      rafId = requestAnimationFrame(animate);

      updateScroll();

      // Rotate figure based on scroll
      figureGroup.rotation.y = scrollPercent * Math.PI * 2;

      // Animate blocks orbiting around figure
      blocks.forEach((block, i) => {
        const userData = block.userData;
        const currentAngle = userData.angle + (scrollPercent * userData.speed * Math.PI * 4);
        
        block.position.x = Math.cos(currentAngle) * userData.radius;
        block.position.z = Math.sin(currentAngle) * userData.radius;
        block.position.y = userData.originalY + (Math.sin(scrollPercent * Math.PI * 2 + i) * 30);

        block.rotation.x = scrollPercent * Math.PI * 2 + i;
        block.rotation.y = currentAngle;
      });

      // Camera slight movement
      camera.position.y = Math.sin(scrollPercent * Math.PI) * 50;

      renderer.render(scene, camera);
    }

    animate();

    function handleResize() {
      const container = document.getElementById('epc-3d-figure-container');
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }

    window.addEventListener('resize', handleResize);
  `;
  document.head.appendChild(moduleScript);
})();
