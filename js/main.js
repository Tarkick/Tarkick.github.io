import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MeshBasicMaterial, Quaternion, Vector2, Vector3 } from 'three';

let loader;
let camera, scene, renderer, labelRenderer;
let controls, cameraControls;

const objects = [];
let showingFile = null;

const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();

const pieces = {
    "art-0": {
        "pictures": [
            "../css/img/Art/art_1.jpg",
            "../css/img/Art/art_1_2.jpg"
        ],
        "text": "test"
    },
    "art-1": {
        "pictures": [
            "../css/img/Art/art_2.jpg",
            "../css/img/Art/art_2_1.jpg"
        ],
        "text": "test"
    },
    "project-0": {
        "models": [
            "./models/Skateboard.glb"
        ]
    }
}

let dragStartMousePos = new THREE.Vector2();
let dragStarted = false;
let dragDrawer = null;
let dragDir = 0;
let dragCurrentMousePos = new THREE.Vector2();
let contentPages = [...document.getElementsByClassName("file")];
var outlineEffect;
let pictureFrame = null;
let ashTray = null;
let smokeAnim = null;
var clock = new THREE.Clock();
var folder = null;


let files = {
    "ART": [],
    "PROJECTS": []
};

class FileWindow {
    constructor(mesh) {
        this.Mesh = mesh;
        this.Mesh.visible = false;
        this.PicturesMesh = this.Mesh.children.filter(x => x.name.startsWith("frame"));
        objects.push(mesh);
    }

    showing(pieces) {
        if (pieces != null) {
            var pictures = pieces['pictures'];
            for (var i = 0; i < pictures.length; ++i) {
                var pictureTexture = new THREE.TextureLoader().load(pictures[i]);
                pictureTexture.flipY = false;
                this.PicturesMesh[i].material = new MeshBasicMaterial({ map: pictureTexture });
            }

            this.Mesh.visible = true;
        }

    }

    update() {
        if (this.Mesh.visible == true) {
            var cwd = new THREE.Vector3();
            camera.getWorldDirection(cwd);
            cwd.multiplyScalar(1.5);
            cwd.add(camera.position);
            this.Mesh.position.set(cwd.x, cwd.y, cwd.z)
            this.Mesh.lookAt(camera.position);
        }
    }

    hidding() {
        this.Mesh.visible = false;
    }
}

class File {
    constructor(FileMesh, TagMesh, Label) {
        this.FileMesh = FileMesh;
        this.TagMesh = TagMesh;

        var id = this.FileMesh.name.split("-")[2];

        this.Elements = pieces[Label + "-" + id];

        // for (var i = 0; i < this.Elements.models.length; ++i) {
        //     loader.load(this.Elements.models[i], function (gltf) {
        //         // folder = new FileWindow(gltf.scene.children[0]);
        //         scene.add(gltf.scene);
        //     });
        // }

        // this.PageDiv = document.getElementById("art-" + id);

        // const moonMassDiv = document.createElement('div');
        // moonMassDiv.className = 'label';
        // moonMassDiv.textContent = Label;
        // moonMassDiv.style.marginTop = '-1em';

        // const moonMassLabel = new CSS2DObject(moonMassDiv);
        // moonMassLabel.position.set(0, 0, 0);

        // this.TagLabel = moonMassLabel;
        // this.TagDiv = moonMassDiv;
        // TagMesh.add(moonMassLabel);
    }

    showing() {
        this.FileMesh.position.y = 0.1;
        // this.TagDiv.style.opacity = 1;

    }

    hidding() {
        this.FileMesh.position.y = 0;
        // this.TagDiv.style.opacity = 0.2;
    }

    opening() {
        if (this.Elements != null) {
            folder.showing(this.Elements);
            document.getElementById("title").style.display = "none";
        }
    }

    closing() {
        folder.hidding();
        document.getElementById("title").style.display = "block";
    }

    update() {
        folder.update();
    }
}

function findFileFromMesh(mesh) {
    var found = null;
    found = files["ART"].find(x => x.FileMesh == mesh || x.TagMesh == mesh);
    if (found == null)
        found = files["PROJECTS"].find(x => x.FileMesh == mesh || x.TagMesh == mesh);
    return found;
}

function TextureAnimator(texture, tilesHoriz, tilesVert, numTiles, tileDispDuration) {
    // note: texture passed by reference, will be updated by the update function.

    this.tilesHorizontal = tilesHoriz;
    this.tilesVertical = tilesVert;
    // how many images does this spritesheet contain?
    //  usually equals tilesHoriz * tilesVert, but not necessarily,
    //  if there at blank tiles at the bottom of the spritesheet. 
    this.numberOfTiles = numTiles;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / this.tilesHorizontal, 1 / this.tilesVertical);

    // how long should each image be displayed?
    this.tileDisplayDuration = tileDispDuration;

    // how long has the current image been displayed?
    this.currentDisplayTime = 0;

    // which image is currently being displayed?
    this.currentTile = 0;

    this.update = function (milliSec) {
        this.currentDisplayTime += milliSec;
        while (this.currentDisplayTime > this.tileDisplayDuration) {
            this.currentDisplayTime -= this.tileDisplayDuration;
            this.currentTile++;
            if (this.currentTile == this.numberOfTiles)
                this.currentTile = 0;
            var currentColumn = this.currentTile % this.tilesHorizontal;
            texture.offset.x = currentColumn / this.tilesHorizontal;
            var currentRow = Math.floor(this.currentTile / this.tilesHorizontal);
            texture.offset.y = currentRow / this.tilesVertical;
        }
    };
}

function makeLabelCanvas(name, color, size, x, y) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = 1056;
    ctx.canvas.height = 256;
    ctx.fillStyle = '#E0C9A6';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = color;
    const font = `${size}px Courier New`;
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillText(name, x, y);

    return ctx.canvas;
}

function load() {
    const albedoMap = new THREE.TextureLoader().load('../textures/Picture_DefaultMaterial_BaseColor.png');
    const ashTrayAlbedoMap = new THREE.TextureLoader().load('../textures/ashTray_DefaultMaterial_BaseColor.png');
    const smokeMap = new THREE.TextureLoader().load('../textures/smoke.png');
    albedoMap.flipY = false;
    ashTrayAlbedoMap.flipY = false;

    const material = new THREE.MeshBasicMaterial({ map: albedoMap });
    const ashTrayMaterial = new THREE.MeshBasicMaterial({ map: ashTrayAlbedoMap });
    const folderMaterial = new THREE.MeshNormalMaterial();

    loader.load('./models/Picture.glb', function (gltf) {
        gltf.scene.children[0].material = material;
        gltf.scene.position.y -= 2;
        pictureFrame = gltf.scene.children[0];
        scene.add(gltf.scene);
    });

    loader.load('./models/Ashtray.glb', function (gltf) {
        gltf.scene.children[0].material = ashTrayMaterial;
        gltf.scene.position.y -= 0.9;
        ashTray = gltf.scene.children[0];
        scene.add(gltf.scene);
    });

    loader.load('./models/Folder.glb', function (gltf) {
        folder = new FileWindow(gltf.scene.children[0]);
        scene.add(gltf.scene);
    });

    smokeAnim = new TextureAnimator(smokeMap, 5, 6, 30, 300); // texture, #horiz, #vert, #total, duration.

    const geometry = new THREE.PlaneGeometry(1, 1);
    const smokeMaterial = new THREE.MeshBasicMaterial({ map: smokeMap, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const plane = new THREE.Mesh(geometry, smokeMaterial);
    plane.position.z += 1.2;
    plane.position.x += .8;
    plane.position.y += 3.6;
    plane.scale.y = 3;
    scene.add(plane);
}

function init() {
    loader = new GLTFLoader();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 2.59;
    camera.position.y = 4.25;
    camera.position.z = 7.18;
    camera.rotation.x = -0.6036777010004151;
    camera.rotation.y = 0.315151371658562;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    scene.environment = new RGBELoader().load('../textures/venice_sunset_1k.hdr');
    scene.environment.mapping = THREE.EquirectangularReflectionMapping;
    scene.fog = new THREE.Fog(0x333333, 10, 15);

    new THREE.TextureLoader().load('../css/img/bg_2.png', function (texture) {
        scene.background = texture;
    });

    const artNametagTexture = new THREE.CanvasTexture(makeLabelCanvas("ART", '#b31b1b', 250, 250, 20));
    const projectsNametagTexture = new THREE.CanvasTexture(makeLabelCanvas("PROJECTS", '#002984', 180, 100, 40));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'
    document.body.appendChild(labelRenderer.domElement);

    outlineEffect = new OutlineEffect(renderer);
    cameraControls = new OrbitControls(camera, renderer.domElement);

    controls = new DragControls([...objects], camera, renderer.domElement);

    controls.addEventListener('drag', render);
    addEventListener('mousedown', onClick);
    addEventListener('mouseup', (event) => {
        if (dragStarted == true) {
            dragStarted = false;
            dragDir = 0;
            cameraControls.enableRotate = true;
        }
    });
    addEventListener('mousemove', onMouseMove);

    load();

    const albedoMap = new THREE.TextureLoader().load('../textures/Cabinet_CabinetMaterial_BaseColor.png');
    const albedoSecondMap = new THREE.TextureLoader().load('../textures/projects/Cabinet_CabinetMaterial_BaseColor.png');
    const fileAlbedoMap = new THREE.TextureLoader().load('../textures/Cabinet_fileMaterial_BaseColor.png');
    const woodenFloorAlbedoMap = new THREE.TextureLoader().load('../textures/WoodenFloor_DefaultMaterial_BaseColor.png');

    albedoMap.flipY = false;
    albedoSecondMap.flipY = false;
    fileAlbedoMap.flipY = false;
    woodenFloorAlbedoMap.flipY = false;

    const material = new THREE.MeshBasicMaterial({ map: albedoMap });
    const fileMaterial = new THREE.MeshBasicMaterial({ map: fileAlbedoMap });
    const secondMaterial = new THREE.MeshBasicMaterial({ map: albedoSecondMap });
    const artNametagMaterial = new THREE.MeshBasicMaterial({ map: artNametagTexture });
    const projectNametagMaterial = new THREE.MeshBasicMaterial({ map: projectsNametagTexture });
    const woodenFloorMaterial = new THREE.MeshBasicMaterial({ map: woodenFloorAlbedoMap });


    loader.load('./models/WoodenFloor.glb', function (gltf) {
        gltf.scene.children[0].material = woodenFloorMaterial;
        gltf.scene.position.y -= 3.5;
        scene.add(gltf.scene);
    });

    loader.load('./models/Cabinet.glb', function (gltf) {
        gltf.scene.position.y -= 3.5;
        const cabinet = gltf.scene.children[0];
        const drawer = gltf.scene.children[1];
        gltf.scene.children.forEach(x => x.material = material);

        // ART CABINET
        gltf.scene.children[1].children.forEach(x => {
            if (x.name.startsWith("file")) {
                x.material = fileMaterial;
                var newFile = new File(x, x.children[0], "art");
                files["ART"].push(newFile);
            } else if (x.name == "drawer-nametag") {
                x.material = artNametagMaterial;
            }
            else {
                x.material = material;
            }
        });

        objects.push(cabinet);
        objects.push(drawer);

        let newObject = gltf.scene.clone();
        newObject.position.y += 2.6;

        // PROJECTS CABINET
        newObject.children.forEach(x => x.material = secondMaterial);
        newObject.children[1].children.forEach(x => {
            if (x.name.startsWith("file")) {
                x.material = fileMaterial;
                var newFile = new File(x, x.children[0], "projects");
                files["PROJECTS"].push(newFile);
            }
            else if (x.name == "drawer-nametag") {
                x.material = projectNametagMaterial;
            }
            else {
                x.material = secondMaterial;
            }
        });

        objects.push(newObject.children[0]);
        objects.push(newObject.children[1]);

        scene.add(gltf.scene);
        scene.add(newObject);
    }, undefined, function (error) {
        console.error(error);
    });


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
            var hoveringFile = findFileFromMesh(intersections[0].object);
            if (hoveringFile != showingFile) {
                // Reset last selected file
                if (showingFile != null) {
                    //     showingFile.TagDiv.style.opacity = "0.2";
                    showingFile.FileMesh.position.y -= 0.1;
                }

                showingFile = hoveringFile;
                showingFile.FileMesh.position.y += 0.1;
                // showingFile.TagDiv.style.opacity = "1";
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
        if (!intersections[0].object.name.startsWith("clip") &&
            !intersections[0].object.name.startsWith("frame") &&
            !intersections[0].object.name == "folder") {
            showingFile.closing();
        }
        if (intersections[0].object.name.startsWith("drawer")) {
            cameraControls.enableRotate = false;
            dragStarted = true;
            dragDrawer = (intersections[0].object.name == "drawer" ? intersections[0].object : intersections[0].object.parent);
            dragStartMousePos.x = mouse.x;
            dragStartMousePos.y = mouse.y;
        } else if (intersections[0].object.name.startsWith("file")) {
            // for (const key in files) {

            //     for (const file in files[key]) {
            //         if (files[key][file].PageDiv != null) {
            //             files[key][file].PageDiv.style.display = "none";
            //         }
            //     }
            // }

            var hoveringFile = findFileFromMesh(intersections[0].object);
            hoveringFile.opening();
        }
    } else {
        if (showingFile != null) {
            showingFile.closing();
        }
    }
}


function render(time) {
    time *= 0.001;

    if (pictureFrame != null) {
        pictureFrame.position.x = Math.sin(time) * 5;
        pictureFrame.position.z = Math.cos(time) * 5;
        pictureFrame.rotation.x = Math.cos(time) * 2;
        pictureFrame.rotation.y = Math.sin(time) * 2;
    }

    if (showingFile != null) {
        showingFile.update();
    }

    smokeAnim.update(1000 * clock.getDelta());

    if (dragStarted) {
        if ((dragCurrentMousePos.y < dragStartMousePos.y)) {
            dragDir = 1;
        } else {
            dragDir = -1;
        }
        if (dragDrawer.position.z <= 2.5 && dragDrawer.position.z >= 0)
            dragDrawer.position.z += (dragDir * 0.05);

        if (dragDrawer.position.z > 2.5) {
            dragDrawer.position.z = 2.5;
        } else if (dragDrawer.position.z < 0) {
            dragDrawer.position.z = 0;
        }

        if (dragDrawer.position.z == 0) {
            contentPages.forEach(x => {
                x.style.display = 'none';
            });
        }

        if (dragDrawer.position.z < 0.5) {

            if (showingFile != null) {
                showingFile.hidding();
                // showingFile.position.y -= 0.1;
                showingFile = null;
            }
        }
    }

    renderer.render(scene, camera);
    cameraControls.update();
    outlineEffect.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(render);
}

init();
