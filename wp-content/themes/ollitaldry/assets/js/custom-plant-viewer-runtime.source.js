import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

class PlantViewer {
	constructor(modal) {
		this.modal = modal;
		this.stage = modal.querySelector('[data-custom-plant-viewer-stage]');
		this.canvas = modal.querySelector('[data-custom-plant-viewer-canvas]');
		this.loading = modal.querySelector('[data-custom-plant-viewer-loading]');
		this.progress = modal.querySelector('[data-custom-plant-viewer-progress]');
		this.status = modal.querySelector('[data-custom-plant-viewer-status]');
		this.error = modal.querySelector('[data-custom-plant-viewer-error]');
		this.resetButton = modal.querySelector('[data-custom-plant-viewer-reset]');
		this.fullscreenButton = modal.querySelector('[data-custom-plant-viewer-fullscreen]');
		this.loaded = false;
		this.loadingPromise = null;
		this.active = false;
		this.frame = 0;
		this.grid = null;
		this.minorGrid = null;
		this.floor = null;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x0c0c0d);
		this.camera = new THREE.PerspectiveCamera(34, 1, 0.001, 100);
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 0.78;

		const environment = new RoomEnvironment();
		const pmrem = new THREE.PMREMGenerator(this.renderer);
		this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
		environment.dispose();
		pmrem.dispose();
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x151719, 0.62));
		const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
		keyLight.position.set(3, 5, 4);
		this.scene.add(keyLight);
		const rimLight = new THREE.DirectionalLight(0xd8e0e4, 0.4);
		rimLight.position.set(-4, 3, -5);
		this.scene.add(rimLight);

		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.065;
		this.controls.screenSpacePanning = true;
		this.controls.zoomToCursor = true;
		this.controls.minPolarAngle = 0;
		this.controls.maxPolarAngle = Math.PI;

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.stage);
		this.resetButton.addEventListener('click', () => this.controls.reset());
		this.fullscreenButton.addEventListener('click', () => {
			if (document.fullscreenElement) document.exitFullscreen();
			else if (this.stage.requestFullscreen) this.stage.requestFullscreen();
		});
		this.modal.addEventListener('custom-plant-viewer:close', () => this.stop());
		document.addEventListener('fullscreenchange', () => this.resize());
	}

	open() {
		this.active = true;
		this.resize();
		if (this.loaded) {
			this.loading.hidden = true;
			this.start();
			return;
		}
		this.load();
	}

	load() {
		if (this.loadingPromise) return this.loadingPromise;
		this.loading.hidden = false;
		this.error.hidden = true;
		this.status.textContent = 'Loading 3D plant...';
		this.progress.value = 0;
		const loader = new GLTFLoader();
		loader.setMeshoptDecoder(MeshoptDecoder);
		this.loadingPromise = new Promise((resolve, reject) => {
			loader.load(this.modal.dataset.modelUrl, resolve, (event) => {
				if (!event.total) return;
				const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
				this.progress.value = percent;
				this.status.textContent = `Loading 3D plant... ${percent}%`;
			}, reject);
		}).then((gltf) => {
			const model = gltf.scene;
			const whiteMaterial = new THREE.MeshStandardMaterial({
				color: 0x999da0,
				metalness: 0.24,
				roughness: 0.56,
				envMapIntensity: 0.36,
				side: THREE.DoubleSide,
			});
			model.traverse((object) => {
				if (!object.isMesh) return;
				object.frustumCulled = true;
				object.material = whiteMaterial;
			});

			const initialBox = new THREE.Box3().setFromObject(model);
			const center = initialBox.getCenter(new THREE.Vector3());
			model.position.x -= center.x;
			model.position.z -= center.z;
			model.position.y -= initialBox.min.y;
			this.scene.add(model);

			const box = new THREE.Box3().setFromObject(model);
			const size = box.getSize(new THREE.Vector3());
			const gridSize = Math.max(size.x, size.z) * 50;
			const floorLevel = -Math.max(size.x, size.y, size.z) * 0.002;
			this.floor = new THREE.Mesh(
				new THREE.PlaneGeometry(gridSize, gridSize),
				new THREE.MeshBasicMaterial({ color: 0x0c0c0d })
			);
			this.floor.rotation.x = -Math.PI / 2;
			this.floor.position.y = floorLevel - 0.0003;
			this.scene.add(this.floor);
			this.minorGrid = new THREE.GridHelper(gridSize, 500, 0x303030, 0x303030);
			this.minorGrid.position.y = floorLevel;
			this.minorGrid.material.transparent = true;
			this.minorGrid.material.opacity = 0.38;
			this.minorGrid.material.depthWrite = false;
			this.scene.add(this.minorGrid);
			this.grid = new THREE.GridHelper(gridSize, 100, 0x55585a, 0x55585a);
			this.grid.position.y = floorLevel + 0.0001;
			this.grid.material.transparent = true;
			this.grid.material.opacity = 0.56;
			this.grid.material.depthWrite = false;
			this.scene.add(this.grid);
			this.scene.fog = new THREE.Fog(0x0c0c0d, gridSize * 0.05, gridSize * 0.48);
			const target = new THREE.Vector3(0, size.y * 0.42, 0);
			const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
			const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
			const direction = new THREE.Vector3(1.25, 0.42, 1.4).normalize();
			const forward = direction.clone().negate();
			const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
			const viewUp = new THREE.Vector3().crossVectors(right, forward).normalize();
			const tanVertical = Math.tan(verticalFov / 2);
			const tanHorizontal = Math.tan(horizontalFov / 2);
			let fitDistance = 0;
			for (const x of [box.min.x, box.max.x]) {
				for (const y of [box.min.y, box.max.y]) {
					for (const z of [box.min.z, box.max.z]) {
						const offset = new THREE.Vector3(x, y, z).sub(target);
						const depthOffset = offset.dot(forward);
						fitDistance = Math.max(
							fitDistance,
							depthOffset + Math.abs(offset.dot(right)) / tanHorizontal,
							depthOffset + Math.abs(offset.dot(viewUp)) / tanVertical
						);
					}
				}
			}
			fitDistance *= 1.08;
			this.camera.position.copy(target).add(direction.multiplyScalar(fitDistance));
			this.camera.near = Math.max(fitDistance / 100, 0.0005);
			this.camera.far = fitDistance * 100;
			this.camera.updateProjectionMatrix();
			this.controls.target.copy(target);
			this.controls.minDistance = fitDistance * 0.18;
			this.controls.maxDistance = fitDistance * 5;
			this.controls.update();
			this.controls.saveState();
			this.loaded = true;
			this.stage.dataset.modelLoaded = 'true';
			this.loading.hidden = true;
			this.start();
			this.modal.dispatchEvent(new CustomEvent('custom-plant-viewer:ready'));
		}).catch((loadError) => {
			console.error('Custom plant 3D model failed to load.', loadError);
			this.loadingPromise = null;
			this.loading.hidden = true;
			this.error.hidden = false;
		});
		return this.loadingPromise;
	}

	resize() {
		const width = Math.max(1, this.stage.clientWidth);
		const height = Math.max(1, this.stage.clientHeight);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height, false);
	}

	start() {
		if (!this.active || this.frame) return;
		const render = () => {
			if (!this.active) {
				this.frame = 0;
				return;
			}
			this.controls.update();
			this.renderer.render(this.scene, this.camera);
			this.frame = window.requestAnimationFrame(render);
		};
		render();
	}

	stop() {
		this.active = false;
		if (this.frame) window.cancelAnimationFrame(this.frame);
		this.frame = 0;
	}

	inspect() {
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		return {
			loaded: this.loaded,
			camera: this.camera.position.toArray(),
			target: this.controls.target.toArray(),
			canvas: [this.canvas.width, this.canvas.height],
		};
	}
}

const viewers = new WeakMap();
window.OllitalCustomPlantViewer = {
	open(modal) {
		if (!viewers.has(modal)) viewers.set(modal, new PlantViewer(modal));
		viewers.get(modal).open();
	},
	inspect(modal) {
		return viewers.has(modal) ? viewers.get(modal).inspect() : null;
	},
};
