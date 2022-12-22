import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { Color } from 'three';

let container, loader;
let camera, scene, renderer;
let controls, cameraControls;
let enableSelection = true;

const objects = [];
let showingFile = null;

const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();

let dragStartMousePos = new THREE.Vector2();
let dragStarted = false;
let dragDir = 0;
let dragCurrentMousePos = new THREE.Vector2();
let contentPages = [...document.getElementsByClassName("file")];
let group = new THREE.Group();

function init() {
    // container = document.createElement('div');
    // document.body.appendChild(container);
    loader = new GLTFLoader();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 2.59;
    camera.position.y = 2.25;
    camera.position.z = 7.18;
    camera.rotation.x = -0.3036777010004151;
    camera.rotation.y = 0.3315151371658562;
    camera.rotation.z = 0.10164309240520934;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    scene.environment = new RGBELoader().load('../textures/venice_sunset_1k.hdr');
    scene.environment.mapping = THREE.EquirectangularReflectionMapping;
    scene.fog = new THREE.Fog(0x333333, 10, 15);

    new THREE.TextureLoader().load('../css/img/bg_2.png', function (texture) {
        scene.background = texture;
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.shadowMap.enabled = true;
    // renderer.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(renderer.domElement);

    controls = new DragControls([...objects], camera, renderer.domElement);
    // cameraControls = new OrbitControls(camera, renderer.domElement);
    // cameraControls.enablePan = false;

    controls.addEventListener('drag', render);
    addEventListener('mousedown', onClick);
    addEventListener('mouseup', (event) => {
        if (dragStarted == true) {
            dragStarted = false;
            dragDir = 0;
        }
    });
    addEventListener('mousemove', onMouseMove);
    const albedoMap = new THREE.TextureLoader().load('../textures/Cabinet_CabinetMaterial_BaseColor.png');
    albedoMap.flipY = false;
    const material = new THREE.MeshBasicMaterial({ map: albedoMap });
    const paperMaterial = new THREE.MeshBasicMaterial({ color: new Color(224, 201, 166) });
    loader.load('./models/Cabinet.glb', function (gltf) {
        gltf.scene.position.y -= 3.5;
        const cabinet = gltf.scene.children[0];
        const drawer = gltf.scene.children[1];
        gltf.scene.children.forEach(x => x.material = material);

        gltf.scene.children[1].children.forEach(x => x.material = (x.name.startsWith("file") ? paperMaterial : material));
        objects.push(drawer);
        let newObject = gltf.scene.clone();
        newObject.position.y += 2.6;

        group.add(gltf.scene);
        group.add(newObject);

        scene.add(group);
    }, undefined, function (error) {
        console.error(error);
    });

    // var light = new THREE.DirectionalLight(0x505050, 2);
    // light.castShadow = true;
    // scene.add(light);

    // const geometry = new THREE.PlaneGeometry(2000, 2000);
    // geometry.rotateX(- Math.PI / 2);

    // const shadowMaterial = new THREE.ShadowMaterial();
    // material.opacity = 0.2;

    // const plane = new THREE.Mesh(geometry, shadowMaterial);
    // plane.position.y = -200;
    // plane.receiveShadow = true;
    // scene.add(plane);

    window.onresize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    requestAnimationFrame(render);
}

function onMouseMove(event) {
    let pos = new THREE.Vector2();

    var rect = renderer.domElement.getBoundingClientRect();
    pos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pos.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (dragStarted == true) {
        dragCurrentMousePos.x = pos.x;
        dragCurrentMousePos.y = pos.y;
    }

    raycaster.setFromCamera(pos, camera);
    const intersections = raycaster.intersectObjects(objects, true);

    if (intersections.length > 0) {
        if (intersections[0].object.name.startsWith("file")) {
            if (showingFile != intersections[0].object) {
                if (showingFile != null)
                    showingFile.position.y -= 0.1;
                showingFile = intersections[0].object;
                intersections[0].object.position.y += 0.1;
            }
        }
    }
}

function onClick(event) {

    event.preventDefault();

    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersections = raycaster.intersectObjects(objects, true);

    if (intersections.length > 0) {
        if (intersections[0].object.name == "drawer") {
            if (dragStarted == false) {
                dragStarted = true;
                dragStartMousePos.x = mouse.x;
                dragStartMousePos.y = mouse.y;
            }
        } else if (intersections[0].object.name.startsWith("file")) {
            let splittedName = intersections[0].object.name.split('-');
            let content = document.getElementById(splittedName[1]);

            contentPages.forEach(x => {
                x.style.display = 'none';
            });

            content.style.display = 'block';
        }
    }
}


function render(time) {
    time *= 0.001;

    if (dragStarted) {
        if ((dragCurrentMousePos.y < dragStartMousePos.y)) {
            dragDir = 1;
        } else {
            dragDir = -1;
        }
        if (objects.length > 0 && objects[0].position.z <= 2.5 && objects[0].position.z >= 0)
            objects[0].position.z += (dragDir * 0.05);

        if (objects[0].position.z > 2.5) {
            objects[0].position.z = 2.5;
        } else if (objects[0].position.z < 0) {
            objects[0].position.z = 0;
        }

        if (objects[0].position.z == 0) {
            contentPages.forEach(x => {
                x.style.display = 'none';
            });


        }
        if (objects[0].position.z < 0.5) {

            if (showingFile != null) {
                showingFile.position.y -= 0.1;
                showingFile = null;
            }
        }

    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

init();
