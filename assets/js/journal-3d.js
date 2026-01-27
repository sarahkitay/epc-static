// 3D Journal with scroll-based rotation and view switching
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
      1000
    );
    camera.position.set(0, 50, 400);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(200, 200, 200);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xC9B27F, 0.4);
    fillLight.position.set(-150, 50, -100);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xC9B27F, 0.3);
    backLight.position.set(0, -100, -200);
    scene.add(backLight);

    // Figure container
    const figureGroup = new THREE.Group();
    scene.add(figureGroup);

    // Load GLB
    const loader = new GLTFLoader();
    let figureModel = null;
    let views = {
      front: null,
      right: null,
      back: null,
      left: null
    };

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

      loader.load(
        glbPaths[pathIndex],
        (gltf) => {
          figureModel = gltf.scene;
          
          // Try to find views by name (adjust names based on your GLB)
          views.front = figureModel.getObjectByName('frontt') || figureModel.getObjectByName('front') || figureModel.children[0];
          views.right = figureModel.getObjectByName('sider') || figureModel.getObjectByName('right') || figureModel.children[1];
          views.back = figureModel.getObjectByName('back1') || figureModel.getObjectByName('back') || figureModel.children[2];
          views.left = figureModel.getObjectByName('sidel') || figureModel.getObjectByName('left') || figureModel.children[3];
          
          // If no named objects, just use the model as-is
          if (!views.front && figureModel.children.length > 0) {
            views.front = figureModel;
            views.right = figureModel;
            views.back = figureModel;
            views.left = figureModel;
          }
          
          // Hide all except front initially
          if (views.front && views.front !== figureModel) views.front.visible = true;
          if (views.right && views.right !== figureModel) views.right.visible = false;
          if (views.back && views.back !== figureModel) views.back.visible = false;
          if (views.left && views.left !== figureModel) views.left.visible = false;
          
          figureGroup.add(figureModel);
          figureGroup.position.set(0, -50, 0);
          
          console.log('GLB loaded from:', glbPaths[pathIndex]);
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

    // Scroll-based animation
    let scrollPercent = 0;
    let targetRotation = 0;
    let currentRotation = 0;

    window.addEventListener('scroll', () => {
      scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      targetRotation = scrollPercent * Math.PI * 2;
    }, { passive: true });

    // View switching function
    function updateVisibleView(rotation) {
      if (!views.front) return;
      
      const normalizedRotation = rotation % (Math.PI * 2);
      
      // Only switch views if we have separate view objects
      if (views.front !== figureModel && views.right !== figureModel) {
        // Hide all
        if (views.front) views.front.visible = false;
        if (views.right) views.right.visible = false;
        if (views.back) views.back.visible = false;
        if (views.left) views.left.visible = false;
        
        // Show correct view based on angle
        if (normalizedRotation < Math.PI / 4 || normalizedRotation > (7 * Math.PI / 4)) {
          if (views.front) views.front.visible = true;
        } else if (normalizedRotation < (3 * Math.PI / 4)) {
          if (views.right) views.right.visible = true;
        } else if (normalizedRotation < (5 * Math.PI / 4)) {
          if (views.back) views.back.visible = true;
        } else {
          if (views.left) views.left.visible = true;
        }
      }
    }

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Smooth rotation
      currentRotation += (targetRotation - currentRotation) * 0.05;
      figureGroup.rotation.y = currentRotation;
      
      // Update visible view
      updateVisibleView(currentRotation);

      // Gentle floating animation
      figureGroup.position.y = -50 + Math.sin(Date.now() * 0.0005) * 10;

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  `;
  document.head.appendChild(moduleScript);
})();
