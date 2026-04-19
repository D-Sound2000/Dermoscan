"use client";

import React, { useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import * as THREE from 'three';

// ── Main Hero ──────────────────────────────────────────────────────────────────
export const WovenLightHero = ({ onExplore }) => {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    textControls.start(i => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08 + 1.2,
        duration: 1.2,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    }));
    buttonControls.start({
      opacity: 1,
      transition: { delay: 2.4, duration: 1 },
    });
  }, [textControls, buttonControls]);

  const headline = "DermoScan";

  return (
    <div
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(155deg, oklch(92% 0.028 282) 0%, oklch(96% 0.015 282) 45%, oklch(98% 0.006 282) 100%)' }}
    >
      <WovenCanvas />

      <div className="relative z-10 text-center px-6">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 1, duration: 1 } }}
          className="mb-4 text-xs tracking-[0.25em] uppercase"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'oklch(50% 0.245 292 / 0.65)' }}
        >
          Clinical Research Instrument · DenseNet-121 · Val AUC&nbsp;0.9869
        </motion.p>

        {/* Animated headline */}
        <h1
          className="text-7xl md:text-9xl font-bold leading-none"
          style={{
            fontFamily: 'var(--font-display), system-ui, sans-serif',
            letterSpacing: '0.04em',
            color: 'oklch(18% 0.04 285)',
          }}
        >
          {headline.split('').map((char, j) => (
            <motion.span
              key={j}
              custom={j}
              initial={{ opacity: 0, y: 50 }}
              animate={textControls}
              style={{ display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ))}
        </h1>

        {/* Sub-headline */}
        <motion.p
          custom={headline.length + 2}
          initial={{ opacity: 0, y: 24 }}
          animate={textControls}
          className="mx-auto mt-6 max-w-lg text-sm leading-relaxed"
          style={{ fontFamily: 'var(--font-sans), sans-serif', color: 'oklch(50% 0.075 285)' }}
        >
          Dermoscopic binary classification with quantified confidence.
          Upload a lesion image — the model returns a malignancy probability
          with Grad-CAM attribution highlighting regions that drove the decision.
        </motion.p>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={buttonControls} className="mt-10">
          <button
            onClick={onExplore}
            className="rounded-full px-9 py-3 text-sm font-semibold transition-all duration-200"
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              letterSpacing: '0.05em',
              background: 'oklch(50% 0.245 292)',
              color: '#fff',
              boxShadow: '0 4px 24px oklch(50% 0.245 292 / 35%)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'oklch(44% 0.245 292)'; e.currentTarget.style.boxShadow = '0 6px 32px oklch(50% 0.245 292 / 45%)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'oklch(50% 0.245 292)'; e.currentTarget.style.boxShadow = '0 4px 24px oklch(50% 0.245 292 / 35%)'; }}
          >
            Open Workstation
          </button>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 3.2, duration: 1 } }}
          className="mt-16 flex flex-col items-center gap-2"
        >
          <span
            className="text-[10px] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-mono), monospace', color: 'oklch(50% 0.245 292 / 0.35)' }}
          >
            scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-px h-8"
            style={{ background: 'linear-gradient(to bottom, rgba(124,58,237,0.3), transparent)' }}
          />
        </motion.div>
      </div>
    </div>
  );
};

// ── Three.js particle canvas ───────────────────────────────────────────────────
const WovenCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    const clock  = new THREE.Clock();

    // ── Particle geometry seeded on a torus knot ──
    const particleCount = 50000;
    const positions          = new Float32Array(particleCount * 3);
    const originalPositions  = new Float32Array(particleCount * 3);
    const colors             = new Float32Array(particleCount * 3);
    const velocities         = new Float32Array(particleCount * 3);

    const geometry   = new THREE.BufferGeometry();
    const torusKnot  = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 32);

    for (let i = 0; i < particleCount; i++) {
      const vi = i % torusKnot.attributes.position.count;
      const x  = torusKnot.attributes.position.getX(vi);
      const y  = torusKnot.attributes.position.getY(vi);
      const z  = torusKnot.attributes.position.getZ(vi);

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      originalPositions[i * 3]     = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      // Deep purples/violets visible on white — 260°–305° hue, mid-low lightness
      const color = new THREE.Color();
      color.setHSL(0.72 + Math.random() * 0.12, 0.88, 0.38 + Math.random() * 0.20);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      velocities[i * 3] = velocities[i * 3 + 1] = velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    const material = new THREE.PointsMaterial({
      size:         0.016,
      vertexColors: true,
      transparent:  true,
      opacity:      0.7,
      depthWrite:   false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Mouse interaction ──
    const handleMouseMove = (e) => {
      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ── Animation loop ──
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const mouseWorld  = new THREE.Vector3(mouse.x * 3, mouse.y * 3, 0);

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

        const cur  = new THREE.Vector3(positions[ix], positions[iy], positions[iz]);
        const orig = new THREE.Vector3(originalPositions[ix], originalPositions[iy], originalPositions[iz]);
        const vel  = new THREE.Vector3(velocities[ix], velocities[iy], velocities[iz]);

        const dist = cur.distanceTo(mouseWorld);
        if (dist < 1.5) {
          const force = (1.5 - dist) * 0.01;
          vel.add(new THREE.Vector3().subVectors(cur, mouseWorld).normalize().multiplyScalar(force));
        }

        vel.add(new THREE.Vector3().subVectors(orig, cur).multiplyScalar(0.001));
        vel.multiplyScalar(0.95);

        positions[ix] += vel.x;
        positions[iy] += vel.y;
        positions[iz] += vel.z;
        velocities[ix] = vel.x;
        velocities[iy] = vel.y;
        velocities[iz] = vel.z;
      }

      geometry.attributes.position.needsUpdate = true;
      points.rotation.y = elapsedTime * 0.05;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
};
