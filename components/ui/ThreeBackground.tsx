"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

const UNIT = 500; // world units per key
const GAP = 110.75; // visual gap between blocks
const KEY_H = UNIT - GAP; // cube: thickness matches width/depth
const LIFT = 1200.5; // max hover elevation
const BASE_SPREAD = 1.2; // random height spread in base state
const BORDER_THICKNESS = 2.6; // 1.5x outline thickness

const NEON = 0x37ff00;
const GAP_NEON = 0x37ff00;

// Ripple table - index = rounded Euclidean distance from hovered key
const RIPPLE_LIFT = [LIFT * 0.6, LIFT * 0.4];
const RIPPLE_OPACITY = [0.55 / 2, 1.0 / 2];
const MAX_RIPPLE = RIPPLE_LIFT.length - 1;

interface Key {
  group: THREE.Group;
  edgeMat: LineMaterial;
  haloMat: LineMaterial;
  row: number;
  col: number;
  y: number;
  baseY: number;
  targetY: number;
  opacity: number;
  targetOpacity: number;
}

export default function ThreeBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const rect0 = container.getBoundingClientRect();
    const W0 = rect0.width || window.innerWidth;
    const H0 = rect0.height || window.innerHeight;
    const asp = W0 / H0;

    // Frustum - fixed reference so changing UNIT makes blocks appear larger/smaller on screen
    const REF_UNIT = 200.4;
    const REF_GAP = 25.75;
    const REF_KEY_H = REF_UNIT - REF_GAP;
    const REF_LIFT = 180.5;
    const REF_KBW = 22 * REF_UNIT;
    const REF_KBD = 8 * REF_UNIT;

    const computeFrustum = (a: number) => {
      const hw = (REF_KBW + REF_KBD) / (2 * Math.SQRT2);
      const hh =
        (REF_KBW + REF_KBD) / (2 * Math.sqrt(6)) +
        (REF_LIFT + REF_KEY_H) * (2 / Math.sqrt(6)) +
        1.0;
      const viewH = Math.max(hw / a, hh) * 1.12;
      return { viewH, viewW: viewH * a };
    };

    const { viewH, viewW } = computeFrustum(asp);

    const maxExtent = (viewW * Math.SQRT2 + viewH * Math.sqrt(6)) / 2;
    const COLS = Math.ceil((maxExtent * 2) / UNIT) + 2;
    const ROWS = COLS;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const KBW = COLS * UNIT;
    const KBD = ROWS * UNIT;
    const keys: Key[] = [];

    const solidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const frameMat = new THREE.MeshBasicMaterial({
      color: GAP_NEON,
      side: THREE.DoubleSide,
    });

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const kw = UNIT - GAP;
        const kd = UNIT - GAP;
        const geo = new THREE.BoxGeometry(kw, KEY_H, kd);

        const mesh = new THREE.Mesh(geo, solidMat);

        // NEON hover outline — invisible until hovered
        const edgeMat = new LineMaterial({
          color: NEON,
          transparent: true,
          opacity: 0,
          linewidth: BORDER_THICKNESS,
        });
        edgeMat.resolution.set(W0, H0);
        const edgeGeometry = new THREE.EdgesGeometry(geo);
        const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(
          edgeGeometry,
        );
        edgeGeometry.dispose();
        const edges = new LineSegments2(lineGeometry, edgeMat);

        // Soft glow halo on the directly hovered key
        const haloGeo = new THREE.BoxGeometry(
          kw + 0.08 * BORDER_THICKNESS,
          KEY_H + 0.08 * BORDER_THICKNESS,
          kd + 0.08 * BORDER_THICKNESS,
        );
        const haloMat = new LineMaterial({
          color: NEON,
          transparent: true,
          opacity: 0,
          linewidth: BORDER_THICKNESS,
        });
        haloMat.resolution.set(W0, H0);
        const haloEdgeGeometry = new THREE.EdgesGeometry(haloGeo);
        const haloLineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(
          haloEdgeGeometry,
        );
        haloEdgeGeometry.dispose();
        haloGeo.dispose();
        const halo = new LineSegments2(haloLineGeometry, haloMat);

        const group = new THREE.Group();
        group.add(mesh, edges, halo);

        const px = -KBW / 2 + (c + 0.5) * UNIT;
        const pz = -KBD / 2 + (r + 0.5) * UNIT;
        const baseY = KEY_H / 2 + Math.random() * BASE_SPREAD;
        group.position.set(px, baseY, pz);
        scene.add(group);

        // Cross-shaped gap fill: 4 arms only, no corner squares — no overlap between adjacent cells
        const halfU = UNIT / 2;
        const hw = kw / 2;
        const hd = kd / 2;
        const gapShape = new THREE.Shape();
        gapShape.moveTo(-hw, -halfU);
        gapShape.lineTo(hw, -halfU);
        gapShape.lineTo(hw, -hd);
        gapShape.lineTo(halfU, -hd);
        gapShape.lineTo(halfU, hd);
        gapShape.lineTo(hw, hd);
        gapShape.lineTo(hw, halfU);
        gapShape.lineTo(-hw, halfU);
        gapShape.lineTo(-hw, hd);
        gapShape.lineTo(-halfU, hd);
        gapShape.lineTo(-halfU, -hd);
        gapShape.lineTo(-hw, -hd);
        gapShape.closePath();
        const gapHole = new THREE.Path();
        gapHole.moveTo(-hw, -hd);
        gapHole.lineTo(hw, -hd);
        gapHole.lineTo(hw, hd);
        gapHole.lineTo(-hw, hd);
        gapHole.closePath();
        gapShape.holes.push(gapHole);
        const frameGeo = new THREE.ShapeGeometry(gapShape);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.rotation.x = -Math.PI / 2;
        frame.position.set(px, 1, pz);
        scene.add(frame);

        keys.push({
          group,
          edgeMat,
          haloMat,
          row: r,
          col: c,
          y: baseY,
          baseY,
          targetY: baseY,
          opacity: 0,
          targetOpacity: 0,
        });
      }
    }

    // Single flat hit-plane covering the whole grid
    const hitPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(KBW + UNIT * 2, KBD + UNIT * 2),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    hitPlane.rotation.x = -Math.PI / 2;
    hitPlane.position.y = KEY_H + RIPPLE_LIFT[0];
    scene.add(hitPlane);

    // Isometric orthographic camera
    const camDist = maxExtent * Math.sqrt(3) * 1.5;
    const camera = new THREE.OrthographicCamera(
      -viewW,
      viewW,
      viewH,
      -viewH,
      1,
      camDist * 4,
    );
    camera.position.set(1, 1, 1);
    camera.position.normalize();
    camera.position.multiplyScalar(camDist);
    camera.lookAt(0, 0, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (err) {
      // No WebGL2 (blocklisted GPU, acceleration off): keep the plain black background instead of crashing the page
      console.warn("ThreeBackground disabled:", err);
      return;
    }
    renderer.setSize(W0, H0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const el = renderer.domElement;
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    container.appendChild(el);

    // Raycasting helpers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9, -9);

    const screenToNDC = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const hitPointToKey = (point: THREE.Vector3): Key | null => {
      const col = Math.floor((point.x + KBW / 2) / UNIT);
      const row = Math.floor((point.z + KBD / 2) / UNIT);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
      return keys[row * COLS + col];
    };

    let hovKey: Key | null = null;

    const onMove = (e: MouseEvent) => screenToNDC(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove);

    // Resize via ResizeObserver
    const resizeObs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;
      const a = width / height;
      const { viewH: vh, viewW: vw } = computeFrustum(a);
      const cam = camera as THREE.OrthographicCamera;
      cam.left = -vw;
      cam.right = vw;
      cam.top = vh;
      cam.bottom = -vh;
      cam.updateProjectionMatrix();
      renderer.setSize(width, height);
      keys.forEach((k) => {
        k.edgeMat.resolution.set(width, height);
        k.haloMat.resolution.set(width, height);
      });
    });
    resizeObs.observe(container);

    // Target updater
    const setTargets = (hov: Key | null) => {
      keys.forEach((k) => {
        if (!hov) {
          k.targetY = k.baseY;
          k.targetOpacity = 0;
          k.haloMat.opacity = 0;
          return;
        }
        const dist = Math.round(
          Math.sqrt((k.row - hov.row) ** 2 + (k.col - hov.col) ** 2),
        );
        if (dist <= MAX_RIPPLE) {
          k.targetY = k.baseY + RIPPLE_LIFT[dist];
          k.targetOpacity = RIPPLE_OPACITY[dist];
          k.haloMat.opacity = dist === 0 ? 0.4 : 0;
        } else {
          k.targetY = k.baseY;
          k.targetOpacity = 0;
          k.haloMat.opacity = 0;
        }
      });
    };

    // Animation loop
    let raf: number;

    const animate = () => {
      raf = requestAnimationFrame(animate);

      if (!isVisible) return;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(hitPlane, false);
      const newHov = hits.length ? hitPointToKey(hits[0].point) : null;

      if (newHov !== hovKey) {
        hovKey = newHov;
        setTargets(hovKey);
      }

      keys.forEach((k) => {
        const yDelta = k.targetY - k.y;
        const opDelta = k.targetOpacity - k.opacity;

        if (Math.abs(yDelta) > 0.1 || Math.abs(opDelta) > 0.001) {
          const ps = k.targetY > k.y ? 0.14 : 0.09;
          k.y += yDelta * ps;
          k.group.position.y = k.y;

          k.opacity += opDelta * 0.11;
          k.edgeMat.opacity = k.opacity;
        }
      });

      renderer.render(scene, camera);
    };

    // Visibility tracking — pause when off-screen
    let isVisible = true;
    const visObs = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    visObs.observe(container);

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      resizeObs.disconnect();
      visObs.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();

        const { material } = mesh;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else {
          material?.dispose();
        }
      });
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={ref} className="absolute inset-0 -z-50  bg-black" />;
}
