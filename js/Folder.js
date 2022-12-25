

const pieces = {
    "art-0": {
        "pictures": [
            "../css/img/Art/art_1.jpg",
            "../css/img/Art/art_1_2.jpg"
        ],
        "text": "test"
    }
}

let fileWindowObject;
let files;

class FileWindow {
    constructor(mesh) {
        this.Mesh = mesh;
        this.Mesh.visible = false;
        this.PicturesMesh = this.Mesh.children.filter(x => x.name.startsWith("frame"));
    }

    showing(pieces) {
        if (pieces != null) {
            var pictures = pieces['pictures'];
            console.log(pictures);
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

        this.Elements = pieces["art-" + id];

        this.TagLabel = moonMassLabel;
        this.TagDiv = moonMassDiv;
        TagMesh.add(moonMassLabel);
    }

    onHovering() {
        this.FileMesh.position.y = 0.1;
        this.TagDiv.style.opacity = 1;
    }

    onExitHovering() {
        this.FileMesh.position.y = 0;
        this.TagDiv.style.opacity = 0.2;
    }

    onOpening() {
        folder.showing(this.Elements);
    }

    onClosing() {
        folder.hidding();
        document.getElementById("title").style.display = "none";
    }

    update() {
        folder.update();
    }
}
