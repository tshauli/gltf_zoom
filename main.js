
import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { CSM } from 'three/addons/csm/CSM.js';
import { CSMHelper } from 'three/addons/csm/CSMHelper.js';

let camera, scene, renderer, csm, csmHelper, model, controls, applyZoomToModel;

applyZoomToModel = false;
document.getElementById("btn_use_model").onclick = onBtnUseModel;

function onBtnUseModel(x)
{
    const gltf_url_element = document.getElementById('gltf_url')
    const gltf_url = gltf_url_element.value;
    hideControls();
    init();
    setModel(gltf_url);
}

function hideControls()
{
    document.getElementById('setup_model_section').hidden = true;
}

function setModel(url)
{
    const glLoader = new GLTFLoader();
    glLoader.load( url, async function ( gltf ) {
            model = gltf.scene;
            setShadowsRecursive(model);
            const aabb = new THREE.Box3().setFromObject(model);
            const modelSize = new THREE.Vector3().copy(aabb.max).sub(aabb.min);
            model.position.set(-aabb.min.x - 0.5 * modelSize.x, -aabb.min.y, -aabb.min.z - 0.5 * modelSize.z);
            // wait until the model can be added to the scene without blocking due to shader compilation
            await renderer.compileAsync( model, camera, scene );
            scene.add(model);
            controls.target.set(0, 0.5 *(aabb.max.y - aabb.min.y), 0);
            controls.update();
            applyZoomToModel = true;
            render();
        }
    );
}

function init() {
    const container = document.createElement( 'div' );
    document.body.appendChild( container );
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set(7, 13, 7);
    scene.add( camera );
    
    // Lighting and Shadows
    csm = new CSM( {
        maxFar: 100,
        cascades: 4,
        // mode: params.mode,
        parent: scene,
        shadowMapSize: 1024,
        lightDirection: new THREE.Vector3( -1, -2, -3).normalize(),
        camera: camera
    } );
    // csmHelper = new CSMHelper( csm );
    // csmHelper.visible = true;
    // csmHelper.displayFrustum = true;
    // scene.add(csmHelper)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Room
    const wallSize = 10;
    // Basic room
    // const roomMat = new THREE.MeshPhongMaterial({
    //     color: 0x898989,
    //     side: THREE.BackSide,
    // });
    // csm.setupMaterial(roomMat);
    // const roomGeom = new THREE.BoxGeometry(wallSize, wallSize, wallSize);
    // const roomMesh = new THREE.Mesh(roomGeom, roomMat);
    // roomMesh.position.y = wallSize * 0.5;
    // roomMesh.receiveShadow = true;
    // scene.add(roomMesh);
    
    // Room with floor
    const wallMat = new THREE.MeshPhongMaterial({color: 0x898989});
    csm.setupMaterial(wallMat);
    const floorMat = new THREE.MeshPhongMaterial({color: 0x867972});
    csm.setupMaterial(floorMat);
    const wallGeom = new THREE.PlaneGeometry(wallSize, wallSize, 8, 8);

    const wallR = new THREE.Mesh(wallGeom, wallMat);
    wallR.position.setX(0.5 * wallSize);
    wallR.position.setY(0.5 * wallSize);
    wallR.rotateY(-0.5 * Math.PI);
    wallR.receiveShadow = true;
    scene.add(wallR);

    const wallL = new THREE.Mesh(wallGeom, wallMat);
    wallL.position.setX(-0.5 * wallSize);
    wallL.position.setY(0.5 * wallSize);
    wallL.rotateY(0.5 * Math.PI);
    wallL.receiveShadow = true;
    scene.add(wallL);

    const wallF = new THREE.Mesh(wallGeom, wallMat);
    wallF.position.setZ(0.5 * wallSize);
    wallF.position.setY(0.5 * wallSize);
    wallF.rotateY(Math.PI);
    wallF.receiveShadow = true;
    scene.add(wallF);
    
    const wallB = new THREE.Mesh(wallGeom, wallMat);
    wallB.position.setZ(-0.5 * wallSize);
    wallB.position.setY(0.5 * wallSize);
    wallB.receiveShadow = true;
    scene.add(wallB);
    
    const wallU = new THREE.Mesh(wallGeom, wallMat);
    wallU.position.setY(wallSize);
    wallU.rotateX(0.5 * Math.PI);
    wallU.receiveShadow = true;
    scene.add(wallU);

    const floor = new THREE.Mesh(wallGeom, floorMat);
    floor.rotateX(-0.5 * Math.PI);
    floor.receiveShadow = true;
    scene.add(floor);

    // Setup renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.type = 2;
    renderer.shadowMap.enabled = true;
    container.appendChild( renderer.domElement );

    // Camera controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', onCameraMove ); // use if there is no animation loop
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set( 0, 0, 0);
    controls.update();

    window.addEventListener( 'resize', onWindowResize );
    render()
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
}

function setShadowsRecursive(obj)
{
    obj.castShadow = true;
    obj.receiveShadow = true;
    for (const child of obj.children)
    {
        setShadowsRecursive(child);
    }
}

function getBox3DPoints(box) {
    return [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ]
}

function zoomToModel()
{
    const aabb = new THREE.Box3().setFromObject(model);
    const pts = getBox3DPoints(aabb);

    const vFovRad = camera.fov * Math.PI / 180;
    const hFOVRad = 2 * Math.atan(Math.tan(0.5 * vFovRad) * camera.aspect);
    const tgHalfVFov = Math.tan(0.5 * vFovRad);
    const tgHalfHFov = Math.tan(0.5 * hFOVRad);
    const ptsView = pts.map((x) => new THREE.Vector3().copy(x));
    for (const pt of ptsView)
    {
        camera.worldToLocal(pt);
    }

    const deltaZsForV = ptsView.map((x) => x.z + Math.abs(x.y) / tgHalfVFov);
    const deltaZsForH = ptsView.map((x) => x.z + Math.abs(x.x) / tgHalfHFov);
    
    const maxDeltaZForV = Math.max(...deltaZsForV);
    const maxDeltaZForH = Math.max(...deltaZsForH);
    const maxDeltaZ = Math.max(maxDeltaZForV, maxDeltaZForH);
    const cameraToTarget = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const cameraDelta = new THREE.Vector3().copy(cameraToTarget).normalize().multiplyScalar(maxDeltaZ);
    camera.position.add(cameraDelta)
}

function onCameraMove(x) {
    render();
}

function render() {
    if (applyZoomToModel)
    {
        zoomToModel();
    }
    csm.update();
    // csmHelper.update();
    renderer.render( scene, camera );
}
