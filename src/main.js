import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ES6: import * as Bluebird from 'bluebird';
var Bluebird = require('bluebird');
// If you're running this in a browser, you may need to attach Bluebird to the window object
if (typeof window !== 'undefined') {
    window.Promise = Bluebird;
}
class Scene {
  constructor() {
    
    // needed to ensure animate is able to be called as a method and not a free function
    this.animate = this.animate.bind(this);

    /* Control what's rendered
       Left in some options that enable code that produces issues
       because thought it was helpful to be able to see the differences.
    */

    this.renderControls = {
      toroidsOn: true,
      axesOn: false,
      antiAliasing: false, // FXAA pass - Doesn't do what was intended but left in to show it
      shadowPass: false, // Doesn't do what was intended but left in to show it
      shadowsOn: true,
      texturesOn: true,
      toneMapping: true,
      bloom: false,
      diagOn: false,
      planeXoffset: 0,
      planeYoffset: -100,
      planeZoffset: 0,
      toroidXoffset: 0,
      toroidYoffset: 50,
      toroidZoffset: 0,
      toroidMetalness: 0.8,
      toroidRoughness: 0.5,
      toroidLightIntensity: 0.8,
      cameraAngleAroundOrigin: 0.0,
      cameraRotationRadius: 600,
      cameraAngleAroundY: 0,
      rotationDirection: 1, // 1 means increasing angle, -1 means decreasing angle
      rotationSpeed: 0.01,
    };

    // Uncomment to record and save a video
    /*
    this.mediaRecorderControls = {
      fps: 60,
      durationInMs: 10000,
      options: { mimeType: 'video/webm;codecs=vp9' }, // adjust format as needed
    };
    */

    this.planeSize = 450;
    this.shadowMapFactorOfPlaneSize = 8;
    this.videoLength = 10000; // ms
    this.cameraPos = new THREE.Vector3(100, 100, 700); // Tweak as appropriate for the scene
    this.cameraLookAt = new THREE.Vector3(0, 0, 0); // Look at the origin
    this.scene = new THREE.Scene();
    this.toroidMeshes = [];
    this.camera = Scene.createAndSetupCamera(this.cameraPos, this.cameraLookAt);
    this.renderer = this.createAndSetupRenderer();
    this.composer = this.createAndSetupComposer(this.camera, this.renderer);
    this.textureLoader = new THREE.TextureLoader();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.rotationIncrement = 0.01;
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
        this.loadTexture('https://imagedelivery.net/thLe7qDiXvQeQgxH4hBUmg/f89e24d7-86e4-4fb7-611b-370f2a7b8700/public'),
        this.loadTexture('https://imagedelivery.net/thLe7qDiXvQeQgxH4hBUmg/2e667327-bb52-45d0-ea32-80d120202b00/public'),
        this.loadTexture('https://imagedelivery.net/thLe7qDiXvQeQgxH4hBUmg/ee7b788b-6f78-4139-d0f9-b0537ed9b800/public'),
        this.loadTexture('https://imagedelivery.net/thLe7qDiXvQeQgxH4hBUmg/af26e13b-572a-4d01-54db-73ab65b2ab00/public'),
        this.loadTexture('https://imagedelivery.net/thLe7qDiXvQeQgxH4hBUmg/925e87b8-9072-4a01-90b6-5c1f5743e600/public'),
        this.loadTexture('https://imagedelivery.net/thLe7qDiXvQeQgxH4hBUmg/95a34c81-49bc-4f47-d161-1febcba07300/public'),
      ]).then(([map, roughnessMap, metalnessMap, envMap, displacementMap, normalMap]) => {
        const mat = new THREE.MeshStandardMaterial({
          map,
          roughnessMap,
          metalnessMap,
          envMap,
          displacementMap,
          normalMap,
          normalScale: new THREE.Vector2(1, 1),
        });

        //  Tweak according to how you want the material to look
        mat.metalness = this.renderControls.toroidMetalness;
        mat.roughness = this.renderControls.toroidRoughness;

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
    this.createToroidLights(this.planeSize, 600, 0xdddddd);
    this.createAmbientLight(0x888888, 1);

    // Uncomment the block below to record and save a video
    // Assuming your Three.js animation is set up and rendering to a canvas
    /*
    const canvas = document.querySelector('canvas');
    const stream = canvas.captureStream(this.mediaRecorderControls.fps); // fps, adjust as needed
    const mediaRecorder = new MediaRecorder(stream, this.mediaRecorderControls.options);
    const chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      // Automatically download the video
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'animation.webm';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    };

    function startRecording(durationInMs) {
      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
      }, durationInMs); // stop recording after this many milli seconds
    }
    startRecording(this.mediaRecorderControls.durationInMs);
    */

    this.animate();
  }

  static createAndSetupCamera(pos, look) {
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1, // front of frustum
      1200, // back
    );
    camera.position.copy(pos);
    camera.lookAt(look);
    return camera;
  }

  createAndSetupRenderer() {
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const width = 1920; // e.g., Full HD width
    const height = 1080; // e.g., Full HD height
    renderer.setSize(width, height);

    if (this.renderControls.toneMapping) {
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 2.0; // Adjust this value to control the overall brightness
    }

    renderer.sortObjects = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    if (this.renderControls.shadowsOn) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow mapping
    }

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

    if (this.renderControls.shadowPass) {
      // NOTE: This isn't working. When switched on it's created
      // zig zag aretfaces in adjoining edges like adjacent plane edges
      // Create the shadow pass
      const shadowPass = new ShaderPass(CopyShader);
      shadowPass.uniforms.opacity.value = 1.0;
      shadowPass.renderToScreen = true; // Render the final result to the screen
      composer.addPass(shadowPass);
    }

    if (this.renderControls.bloom) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Numbers all experimental
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
      bloomPass.threshold = 0.1;
      bloomPass.strength = 0.5;
      bloomPass.radius = 0;

      composer.addPass(bloomPass);
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

      this.toroidMeshes[0] = new THREE.Mesh(toroidGeometry1, material);
      this.toroidMeshes[0].position.set(
        this.renderControls.toroidXoffset,
        this.renderControls.toroidYoffset,
        this.renderControls.toroidZoffset,
      );
      this.toroidMeshes[0].castShadow = true;
      this.scene.add(this.toroidMeshes[0]);

      this.toroidMeshes[1] = new THREE.Mesh(toroidGeometry2, material);
      this.toroidMeshes[1].rotation.x = Math.PI / 2;
      this.toroidMeshes[1].position.set(
        this.renderControls.toroidXoffset,
        this.renderControls.toroidYoffset,
        this.renderControls.toroidZoffset,
      );
      this.toroidMeshes[1].castShadow = true;
      this.scene.add(this.toroidMeshes[1]);

      // Create mesh 3
      this.toroidMeshes[2] = new THREE.Mesh(toroidGeometry3, material);
      this.toroidMeshes[2].rotation.x = Math.PI / 3;
      this.toroidMeshes[2].position.set(
        this.renderControls.toroidXoffset,
        this.renderControls.toroidYoffset,
        this.renderControls.toroidZoffset,
      );
      this.toroidMeshes[2].castShadow = true;
      this.scene.add(this.toroidMeshes[2]);
    }
  }

  createPlanes() {
    this.createPlane('xz', 0x999999, 0xaaaaaa);
    this.createPlane('xy', 0xffffff, 0x000000);
    this.createPlane('yz', 0xffffff, 0x000000);
  }

  createPlane(
    orientation,
    fromCol = 0xffffff,
    toCol = 0x000000,
    planeSize = 450,
    planeWidthSegments = 10,
    planeHeightSegments = 10,
    wframe = false,
    transparent = false,
    opacity = 1.0,
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
    const rotationMatrix = new THREE.Matrix4();

    switch (orientation) {
      case 'xz':
        // this is needed because rotations don't actually change the vertices in the mesh
        rotationMatrix.makeRotationX(-Math.PI / 2);
        geo.applyMatrix4(rotationMatrix);

        mesh.position.set(
          this.renderControls.planeXoffset,
          this.renderControls.planeYoffset,
          this.renderControls.planeZoffset,
        );
        break;
      case 'xy':
        mesh.position.set(
          this.renderControls.planeXoffset,
          this.renderControls.planeYoffset + planeSize / 2,
          this.renderControls.planeZoffset - planeSize / 2,
        );
        break;
      case 'yz':
        rotationMatrix.makeRotationY(-Math.PI / 2);
        geo.applyMatrix4(rotationMatrix);

        mesh.position.set(
          this.renderControls.planeXoffset - planeSize / 2,
          this.renderControls.planeYoffset + planeSize / 2,
          this.renderControls.planeZoffset,
        );
        break;
      default:
        // eslint-disable-next-line no-console
        console.log('Fatal error, should have thrown if no plane details.');
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(Scene.createPlaneShading(fromCol, toCol, geo, planeSize, orientation), 3));

    mesh.receiveShadow = true;

    this.scene.add(mesh);
  }

  static createPlaneShading(viewerCol, horizonCol, geometry, planeSize, orientation) {
    // Calculate colors for the plane vertices
    const planeColors = [];
    const viewerColor = new THREE.Color(viewerCol);
    const horizonColor = new THREE.Color(horizonCol);

    for (let i = 0; i < geometry.attributes.position.count; i += 1) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(geometry.attributes.position, i);

      let t;
      if (orientation === 'xz') {
        t = (vertex.z + planeSize / 2) / planeSize; // Use the z-coordinate for xz plane
      } else {
        t = (vertex.y + planeSize / 2) / planeSize; // Use the y-coordinate for other planes
      }

      const color = new THREE.Color().lerpColors(viewerColor, horizonColor, t);
      planeColors.push(color.r, color.g, color.b);
    }

    return planeColors;
  }

  createLight(
    receivingSurfaceSize,
    colour,
    pos,
    lightDistance = 100,
    intensity = 0.5,
    shadowCamNear = 20,
    shadowCamFar = 1000,
  ) {
    // args are colour, intensity, distance and decay
    const light = new THREE.PointLight(colour, intensity, lightDistance);
    light.position.copy(pos);
    light.castShadow = true;
    this.scene.add(light);

    if (this.renderControls.shadowsOn) {
      light.shadow.mapSize.width = receivingSurfaceSize * this.shadowMapFactorOfPlaneSize;
      light.shadow.mapSize.height = receivingSurfaceSize * this.shadowMapFactorOfPlaneSize;
      light.shadow.camera.near = shadowCamNear;
      light.shadow.camera.far = shadowCamFar;
    }
  }

  createToroidLights(receivingSurfaceSize, lightOffsetFromReceivingSurface, lightColour) {
    const lightDistance = receivingSurfaceSize + lightOffsetFromReceivingSurface;
    const halfReceivingSurfaceSize = receivingSurfaceSize / 2;

    this.createLight(
      receivingSurfaceSize,
      lightColour,
      new THREE.Vector3(0, receivingSurfaceSize, 0),
      lightDistance,
      this.renderControls.toroidLightIntensity,
    );
    this.createLight(
      receivingSurfaceSize,
      lightColour,
      new THREE.Vector3(0, halfReceivingSurfaceSize, halfReceivingSurfaceSize),
      lightDistance,
      this.renderControls.toroidLightIntensity,
    );
    this.createLight(
      receivingSurfaceSize,
      lightColour,
      new THREE.Vector3(halfReceivingSurfaceSize, halfReceivingSurfaceSize, 0),
      lightDistance,
      this.renderControls.toroidLightIntensity,
    );
  }

  createAmbientLight(colour, intensity) {
    // args are colour and intensity
    const ambientLight = new THREE.AmbientLight(colour, intensity); // Soft white light
    ambientLight.position.set(0, 100, 200); // Move around as required
    this.scene.add(ambientLight);
  }

  createAxes() {
    const lineLength = 100;
    if (this.renderControls.axesOn) {
      const axes = [
        {
          direction: new THREE.Vector3(
            this.renderControls.planeXoffset + lineLength,
            this.renderControls.planeYoffset,
            this.renderControls.planeZoffset,
          ),
          color: 0xff0000,
        }, // x-axis

        {
          direction: new THREE.Vector3(
            this.renderControls.planeXoffset,
            this.renderControls.planeYoffset + lineLength,
            this.renderControls.planeZoffset,
          ),
          color: 0x00ff00,
        }, // y-axis

        {
          direction: new THREE.Vector3(
            this.renderControls.planeXoffset,
            this.renderControls.planeYoffset,
            this.renderControls.planeZoffset + lineLength,
          ),
          color: 0x0000ff,
        }, // z-axis
      ];

      axes.forEach((axis) => {
        this.createAndAddLine(axis.direction, axis.color);
      });
    }
  }

  createAndAddLine(direction, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        this.renderControls.planXoffset,
        this.renderControls.planeYoffset,
        this.renderControls.planeZoffset,
      ), // start point
      direction, // end point
    ]);

    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geometry, material);

    // add the line to the scene
    this.scene.add(line);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const r = this.renderControls.cameraRotationRadius;

    const x = r * Math.cos(this.renderControls.cameraAngleAroundY);
    const z = r * Math.sin(this.renderControls.cameraAngleAroundY);

    this.camera.position.set(x, this.camera.position.y, z);
    this.camera.lookAt(this.scene.position);

    // Update rotation angle based on direction
    this.renderControls.cameraAngleAroundY += this.renderControls.rotationSpeed
                                              * this.renderControls.rotationDirection;

    // If it exceeds 90 degrees (in radians) or goes below 0, flip the direction
    if (this.renderControls.cameraAngleAroundY >= Math.PI / 2
        || this.renderControls.cameraAngleAroundY <= 0) {
      this.renderControls.rotationDirection *= -1;
    }

    this.render();
  }

  render() {
    if (this.renderControls.toroidsOn) {
      // Apply rotation
      /* eslint-disable no-param-reassign */
      this.toroidMeshes.forEach((item) => {
        item.rotation.x += this.rotationIncrement;
        item.rotation.y += this.rotationIncrement;
        item.rotation.z += this.rotationIncrement;
      });
    }

    this.controls.update();

    this.composer.render();
  }
}

// eslint-disable-next-line no-unused-vars
const scene = new Scene();
