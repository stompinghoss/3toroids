/*
Rotating three.js shapes and some soft body physics shapes colliding.

Notes:
Soft body physics in Ammo is too slow to be useful?Then again, the three demo is ok.
Things to remember to document:
  Had to re think whole solution to work with async loading of textures. Didn't get that from cgpt.
  Load of texture might work, but wouldn't apply and no error to help.
  There comes a point where you've hacked it tooo much and cgpt doesn't know what to do.
  Seems to be prone to version/dependency issues.
  Kept having issues getting compatible versions of three and Ammo.
  And sometimes it would generate the same code with the same error. Maybe a version/training issue.
  Going back to a simple request in order get phsysics, seemed to work better.
  It went for Ammo to begin, but the documentation was terrible and then end
  up in debug which switches mind out of creative mode.
    Introducing physics with Ammo became mainly about hacking it out of three/Ammo examples.
TODOs:
    Tidy
        'unused' scene variable
    Polyfills for older browsers? Detect which version it can work with.
    Convert to type script
    bundle
    Speed up load
    Fully remove stats
    Further refactor: Get rid of all globals
    Why is there faint blue light on the yz plane?

Larger todos:
    Consider moving the whole thing to enable 3d or oimo which seems much faster.
*/

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

class Scene {
  constructor() {
    // needed to ensure animate is able to be called as a method and not a free function
    this.animate = this.animate.bind(this);

    // Control what's rendered
    this.renderControls = {
      toroidsOn: true,
      axesOn: true,
      antiAliasing: false,
      shadowPass: false,
      shadowsOn: true,
      texturesOn: true,
      toneMapping: true,
      bloom: false,
      diagOn: false,
    };

    this.cameraPos = new THREE.Vector3(50, 100, 600);
    this.cameraLookAt = new THREE.Vector3(0, 0, 0);

    this.scene = new THREE.Scene();
    this.toroidMeshes = [];
    this.camera = Scene.createAndSetupCamera(this.cameraPos, this.cameraLookAt);
    this.renderer = this.createAndSetupRenderer();
    this.composer = this.createAndSetupComposer(this.camera, this.renderer);
    this.textureLoader = new THREE.TextureLoader();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.update();

    if (this.renderControls.texturesOn) {
      this.texturedRender();
    } else {
      const mat = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
        shininess: 50,
        specular: 50,
        wireframe: false,
        transparent: false,
        opacity: 1.0,
      });
      this.createScene(mat);
    }
  }

  loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error),
      );
    });
  }

  texturedRender() {
    Promise.all([
      this.loadTexture('/assets/Metal044A_1K-JPG/Metal044A_1K_Color.jpg'),
      this.loadTexture('/assets/Metal044A_1K-JPG/Metal044A_1K_Roughness.jpg'), // from https://ambientcg.com/
      this.loadTexture('/assets/Metal044A_1K-JPG/Metal044A_1K_Metalness.jpg'), // from https://ambientcg.com/
      this.loadTexture('/assets/OutdoorHDRI026_2K-TONEMAPPED.jpg'),
      this.loadTexture('/assets/Metal044A_1K-JPG/Metal044A_1K_Displacement.jpg'),
      this.loadTexture('/assets/Metal044A_1K-JPG/Metal044A_1K_NormalGL.jpg'),
    ]).then(([color, roughnessMap, metalnessMap, envMap, displacement, normalOpenGL]) => {
      const mat = new THREE.MeshPhysicalMaterial({
        map: color,
        metalnessMap,
        roughnessMap,
        envMap,
        displacementMap: displacement,
        normalMap: normalOpenGL,
        normalScale: new THREE.Vector2(10, 10),
      });

      this.createScene(mat);
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('An error occurred while loading the textures.', error);
    });
  }

  createScene(toroidMat) {
    this.createAxes();
    this.createToroids(toroidMat);
    this.createPlanes();
    this.createToroidLights(500);
    this.animate();
  }

  static createAndSetupCamera(pos, look) {
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.copy(pos);
    camera.lookAt(look);
    return camera;
  }

  createAndSetupRenderer() {
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    if (this.renderControls.toneMapping) {
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 2.0; // Adjust this value to control the overall brightness
    }

    renderer.sortObjects = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Enable shadows in the renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow mapping

    return renderer;
  }

  createAndSetupComposer(camera, renderer) {
    // Create the post-processing composer
    const composer = new EffectComposer(renderer);

    // Create the render pass
    const renderPass = new RenderPass(this.scene, camera);
    composer.addPass(renderPass);

    if (this.renderControls.antiAliasing) {
      // Create the anti-aliasing pass
      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
      composer.addPass(fxaaPass);
    }

    if (this.renderControls.bloom) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
      bloomPass.threshold = 0.1;
      bloomPass.strength = 0.5;
      bloomPass.radius = 0;

      composer.addPass(bloomPass);
    }

    if (this.renderControls.shadowPass) {
      // NOTE: This isn't working. When switched on it's created
      // zig zag aretfaces in adjoining edges like adjacent plane edges
      // Create the shadow pass
      const shadowPass = new ShaderPass(CopyShader);
      shadowPass.uniforms.opacity.value = 1.0;
      shadowPass.renderToScreen = true; // Render the final result to the screen
      this.composer.addPass(shadowPass);
    }

    return composer;
  }

  createToroids(material) {
    if (this.renderControls.toroidsOn) {
      // Create geometry
      const toroidRadius = 100;
      const tubeRadius = 10;
      const radialSegments = 64;
      const toroidSegments = 64;
      const offset = 0;
      const toroidGeometry1 = new THREE.TorusGeometry(
        toroidRadius,
        tubeRadius,
        radialSegments,
        toroidSegments,
      );
      const toroidGeometry2 = new THREE.TorusGeometry(
        toroidRadius + tubeRadius * 2 + offset,
        tubeRadius,
        radialSegments,
        toroidSegments,
      );
      const toroidGeometry3 = new THREE.TorusGeometry(
        toroidRadius + tubeRadius * 4 + offset * 2,
        tubeRadius,
        radialSegments,
        toroidSegments,
      );
      const toroidsXoffset = 0;
      const toroidsYoffset = 200; // Height above origin
      const toroidsZoffset = 0; // Distance from camera

      this.toroidMeshes[0] = new THREE.Mesh(toroidGeometry1, material);
      this.toroidMeshes[0].position.set(toroidsXoffset, toroidsYoffset, toroidsZoffset);
      this.toroidMeshes[0].castShadow = true;
      this.scene.add(this.toroidMeshes[0]);

      this.toroidMeshes[1] = new THREE.Mesh(toroidGeometry2, material);
      this.toroidMeshes[1].rotation.x = Math.PI / 2;
      this.toroidMeshes[1].position.set(toroidsXoffset, toroidsYoffset, toroidsZoffset);
      this.toroidMeshes[1].castShadow = true;
      this.scene.add(this.toroidMeshes[1]);

      // Create mesh 3
      this.toroidMeshes[2] = new THREE.Mesh(toroidGeometry3, material);
      this.toroidMeshes[2].rotation.x = Math.PI / 3;
      this.toroidMeshes[2].position.set(toroidsXoffset, toroidsYoffset, toroidsZoffset);
      this.toroidMeshes[2].castShadow = true;
      this.scene.add(this.toroidMeshes[2]);
    }
  }

  createPlanes() {
    this.createPlane('xz');
    this.createPlane('xy');
    this.createPlane('yz');
  }

  createPlane(
    orientation,
    planeSize = 550,
    planeWidthSegments = 10,
    planeHeightSegments = 10,
    wframe = false,
    offset = 0,
    transparent = false,
    opacity = 1.0,
    color1 = 0xffffff,
    color2 = 0x000000,
  ) {
    if (typeof orientation === 'undefined') {
      throw new Error('Unspecified plane. Cannot setup a plane without details, e.g. xz, xy or yz.');
    }

    const geo = new THREE.PlaneGeometry(
      planeSize,
      planeSize,
      planeWidthSegments,
      planeHeightSegments,
    );
    geo.setAttribute('color', new THREE.Float32BufferAttribute(Scene.createPlaneShading(color1, color2, geo), 3));

    const mat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 50,
      specular: 50,
      wireframe: wframe,
      transparent,
      opacity,
    });

    const mesh = new THREE.Mesh(geo, mat);

    switch (orientation) {
      case 'xz':
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(offset, 0, offset);
        break;
      case 'xy':
        mesh.position.set(offset, offset + planeSize / 2, -planeSize / 2);
        break;
      case 'yz':
        mesh.rotation.y = -Math.PI / 2;
        mesh.position.set(-planeSize / 2, offset + planeSize / 2, offset);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log('Fatal error, should have thrown if no plane details.');
    }

    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  static createPlaneShading(viewerCol, horizonCol, geometry) {
    // Calculate colors for the xz plane vertices
    const planeColors = [];
    const viewerColor = new THREE.Color(viewerCol); // White color at the viewer
    const horizonColor = new THREE.Color(horizonCol); // Black color at the horizon
    for (let i = 0; i < geometry.attributes.position.count; i += 1) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(geometry.attributes.position, i);
      // Map the y-coordinate of the vertex to a value between 0 and 1
      const t = (vertex.y + 50) / 2000;
      // Linearly interpolate between viewerColor and horizonColor based on t
      const color = new THREE.Color().lerpColors(viewerColor, horizonColor, t);
      planeColors.push(color.r, color.g, color.b);
    }

    return planeColors;
  }

  createLight(planeSize, pos) {
    const light = new THREE.PointLight(0xdddddd, 4, planeSize + 100);

    light.position.copy(pos);
    light.castShadow = true;
    this.scene.add(light);

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 20;
    light.shadow.camera.far = 1000;
  }

  createToroidLights(planeSize) {
    this.createLight(planeSize, new THREE.Vector3(0, planeSize, 0));
    this.createLight(planeSize, new THREE.Vector3(0, planeSize / 2, planeSize / 2));
    this.createLight(planeSize, new THREE.Vector3(planeSize / 2, planeSize / 2, 0));
    const ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft white light
    ambientLight.position.set(0, 100, 200);
    this.scene.add(ambientLight);
  }

  createAxes() {
    if (this.renderControls.axesOn) {
      const axes = [
        { direction: new THREE.Vector3(100, 0, 0), color: 0xff0000 }, // x-axis
        { direction: new THREE.Vector3(0, 100, 0), color: 0x00ff00 }, // y-axis
        { direction: new THREE.Vector3(0, 0, 100), color: 0x0000ff }, // z-axis
      ];

      axes.forEach((axis) => {
        this.createAndAddLine(axis.direction, axis.color);
      });
    }
  }

  createAndAddLine(direction, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), // start point
      direction, // end point
    ]);

    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geometry, material);

    // add the line to the scene
    this.scene.add(line);
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.render();
  }

  render() {
    if (this.renderControls.toroidsOn) {
      // Apply rotation
      /* eslint-disable no-param-reassign */
      this.toroidMeshes.forEach((item) => {
        item.rotation.x += 0.01;
        item.rotation.y += 0.01;
        item.rotation.z += 0.01;
      });
    }

    this.controls.update();

    this.composer.render();
  }
}

const scene = new Scene();
