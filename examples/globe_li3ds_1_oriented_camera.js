/* global itowns, document, renderer, menuGlobe, dat, debug,  */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = {
    longitude: 2.423814,
    latitude: 48.844882,
    altitude: 100 };

// var positionOnGlobe = {
//     longitude: 2.33481381638492,
//     latitude: 48.850602961052147,
//     altitude: 20 };
var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, {
//    immersiveControls: true,
    renderer: renderer,
    handleCollision: false,
    sseSubdivisionThreshold: 10,
});
// console.log('!!!!!!!!!!!!!!!!!!!!!!', menuGlobe);
globeView.controls.minDistance = 0;

// speed up controls
// globeView.controls.moveSpeed = 10;

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));



globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings }),
    // onMeshCreated: function setMaterial(res) { res.children[0].material = result.shaderMat; },
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Buildings',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 16,
    projection: 'EPSG:4326',
    // extent: {
    //     west: 2.334,
    //     east: 2.335,
    //     south: 48.849,
    //     north: 48.851,
    // },
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
    wireframe: true,
}, globeView.tileLayer);


var layer = {
    // orientationType: 'Stereopolis2',
    sensors: [],
    //dist:'',
    dist:'_nodist',
    images: 'http://localhost:8080/examples/Li3ds/images_091117/{imageId}_{sensorId}{dist}.jpg',
}

function orientedImagesInit(orientedImages) {
    // console.log('SENSORS : ', layer.sensors);
    var i;
    var j = 0;
    var ori;
    var axis;
    var camera;
    var cameraHelper;
    var listOrientation;
    var quaternion = new itowns.THREE.Quaternion();
    var quaternionSensor = new itowns.THREE.Quaternion();
    var coordView = new itowns.Coordinates(globeView.referenceCrs, 0, 0, 0);
    var offset = { x: 657000, y: 6860000, z: -0.4 };
    // var offset = new itowns.THREE.Vector3(657000, 6860000, -0.4 );
    itowns.oiMicMac.offset = offset;
    // decode oriented images list
    listOrientation = itowns.OrientedImageDecoder.decode(orientedImages, itowns.oiMicMac);

    for (i = 0; i < listOrientation.length; i++) {

        if (i%5 != 0) {
            continue;
        }
        ori = listOrientation[i];

        // if (ori.source.id != 'StMande_20171109_1_074')
        //     continue;
        // console.log('source: ', ori);
        ori.coord.as(globeView.referenceCrs, coordView);
        // console.log('coord: ', ori.coord);

        var layerTHREEjs = globeView.mainLoop.gfxEngine.getUniqueThreejsLayer();
        globeView.camera.camera3D.layers.enable(layerTHREEjs);

        // add axis helper
        axis = new itowns.THREE.AxesHelper(2);
        axis.layers.set(layerTHREEjs);
        axis.position.copy(coordView.xyz());
        //console.log(axis.position);
        axis.lookAt(coordView.geodesicNormal.clone().add(axis.position));

        // PENSEZ à mettre le Y vers le Nord cartho avec proj4


        const matrixFromEuler = new itowns.THREE.Matrix4().makeRotationFromEuler(ori.orientation);

        // The three angles ω,ɸ, are computed
        // for a traditionnal image coordinate system (X=colomns left to right and Y=lines bottom up)
        // and not for a computer vision compliant geometry (X=colomns left to right and Y=lines top down)
        // so we have to multiply to rotation matrix by this matrix :
        var trix = new itowns.THREE.Matrix4().set(
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1);

        const trixQuaternion = new THREE.Quaternion().setFromRotationMatrix(trix);

        const matrixMicMac = matrixFromEuler.clone().multiply(trix);

        quaternion.setFromRotationMatrix (matrixMicMac);

        // quaternion.setFromEuler(ori.orientation);


        axis.quaternion.multiply(quaternion);


        var projectionMatrix = layer.sensors[0].projection;
        var size = layer.sensors[0].size;
        var focaleX = projectionMatrix[0];
        var ppaX = projectionMatrix[2];
        var focaleY = projectionMatrix[4];
        var ppaY = projectionMatrix[5];
        var sizeX = size[0];
        var sizeY = size[1];

        var focaleReel = 1;
        var Xreel = (sizeX * focaleReel) / focaleX;
        var Yreel = (sizeY * focaleReel) / focaleY;

        var demiAngle = Math.atan((sizeY / 2) / focaleY);
        console.log('demi angle: ', demiAngle);
        var demiAngleDegree = (demiAngle / (2*Math.PI)) * 360;
        console.log('demi angle degree: ', demiAngleDegree);
        var ouverture = 2 * demiAngleDegree
        console.log('ouverture: ', ouverture);
        // ouverture = 70;
        // add a mini camera oriented on Z
        camera = new itowns.THREE.PerspectiveCamera(ouverture, sizeX / sizeY, focaleReel / 2, focaleReel * 1000);
        // On se met dans le repère de l'image orientée (l'axis helper)
        axis.add(camera);
        // Dans notre repère de l'image orientée, l'axe des Z va vers la visée de caméra
        // Dans ThreeJS, la camera vise vers l'opposé de l'axe des Z
        // Donc on retourne la camera autour de l'axe Y
        camera.rotateY(Math.PI);
        camera.updateMatrixWorld(true);

        // camera.layers = globeView.camera.camera3D.layers;

        layer.camera = camera;
        camera.layers.enable(layerTHREEjs);
        // console.log('globeCamera : ', globeView.camera);
        // console.log(size);
        // console.log('Projection: ', projectionMatrix);
        // console.log('source parsee : ', ori.source);

        // var url = itowns.format(layer.images, { imageId: oiInfo.id, sensorId: sensor.id });
        var url = itowns.format(layer.images, { imageId:ori.source.id, sensorId: 'CAM24', dist:layer.dist });

        console.log('URL de l image:', url);
        var texture = new itowns.THREE.TextureLoader().load( url );

        var geometry = new itowns.THREE.PlaneGeometry( Xreel, Yreel, 32 );
        var material = new itowns.THREE.MeshBasicMaterial( {
            map: texture,
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true, opacity: 0.3,
        } );
        var plane = new itowns.THREE.Mesh( geometry, material );
        plane.layers.set(layerTHREEjs);
        plane.position.set(0, 0, focaleReel);
        plane.rotateX(Math.PI);
        axis.add( plane );

        // console.log('AXIS POSITION: ', axis.position);

        /*
        for (j = 0; j < layer.sensors.length; j++) {
            var sensor = layer.sensors[j];
            // console.log('SENSOR :', sensor);
            var sensorHelper = new itowns.THREE.AxesHelper(0.5);
            // console.log('SENSOR POSITION', sensor.centerCameraInPano);
            sensorHelper.position.copy(sensor.centerCameraInPano);

            quaternionSensor.setFromRotationMatrix(sensor.rotPano2Camera);
            sensorHelper.quaternion.multiply(quaternionSensor);

            axis.add(sensorHelper);
        }
        */

        // add axis to scene and update matrix world
        globeView.scene.add(axis);
        axis.updateMatrixWorld();

        // add a camera helper on the camera (to see it)
        // camera.matrixWorld.multiply(trix);
        cameraHelper = new itowns.THREE.CameraHelper(camera);
        cameraHelper.layers.set(layerTHREEjs);
        globeView.scene.add(cameraHelper);
        cameraHelper.updateMatrixWorld(true);

        break;
    }
}

var THREE = itowns.THREE;

function getMatrix4FromRotation(Rot) {
    var M4 = new THREE.Matrix4();
    M4.elements[0] = Rot.elements[0];
    M4.elements[1] = Rot.elements[1];
    M4.elements[2] = Rot.elements[2];
    M4.elements[4] = Rot.elements[3];
    M4.elements[5] = Rot.elements[4];
    M4.elements[6] = Rot.elements[5];
    M4.elements[8] = Rot.elements[6];
    M4.elements[9] = Rot.elements[7];
    M4.elements[10] = Rot.elements[8];
    return M4;
}

// initialize a sensor for each camera and create the material (and the shader)

function cibleInit(res) {
    let i;

    var geometry = new itowns.THREE.SphereGeometry(0.05, 32, 32);
    // var material = layer.shaderMat;
    var material = new THREE.MeshPhongMaterial({ color: 0xff0000 });

    console.log(res);
    for (const s of res) {

        const coord = new itowns.Coordinates('EPSG:2154', s.long, s.lat, s.alt);

        var sphere = new THREE.Mesh(geometry, material);
        coord.as('EPSG:4978').xyz(sphere.position);

        globeView.scene.add(sphere);
        sphere.updateMatrixWorld();
        // console.log('boule position: ', sphere.position);
    }
}

function sensorsInit(res) {
    let i;
    console.log(res);
    var withDistort = false;
    for (const s of res) {
        var sensor = {};
        sensor.id = s.id;

        sensor.projection = s.projection;
        sensor.size = s.size;

        layer.sensors.push(sensor);
    }
    console.log(layer.sensors);
}

// itowns.Fetcher.json('http://www.itowns-project.org/itowns-sample-data/panoramicsMetaData.json',
// { crossOrigin: '' }).then(orientedImagesInit);

// function calibrationInit(cameras) {
//     console.log(cameras);
// }

// itowns.Fetcher.json('http://localhost:8080/examples/cameraCalibration.json',
// { crossOrigin: '' }).then(sensorsInit);


var promises = [];

// promises.push(itowns.Fetcher.json('http://www.itowns-project.org/itowns-sample-data/panoramicsMetaData.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/cibles.json', { crossOrigin: '' }));

// promises.push(itowns.Fetcher.json('http://localhost:8080/examples/cameraCalibration.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_camera.json', { crossOrigin: '' }));

// promises.push(itowns.Fetcher.json('http://www.itowns-project.org/itowns-sample-data/panoramicsMetaData.json', { crossOrigin: '' }));
promises.push(itowns.Fetcher.json('http://localhost:8080/examples/Li3ds/images_091117/demo_091117_CAM24_pano.json', { crossOrigin: '' }));


Promise.all(promises).then((res) => {
    cibleInit(res[0])
    sensorsInit(res[1]);
    orientedImagesInit(res[2]);

});



function colorBuildings(properties) {
    if (properties.id.indexOf('bati_remarquable') === 0) {
        return new itowns.THREE.Color(0x5555ff);
    } else if (properties.id.indexOf('bati_industriel') === 0) {
        return new itowns.THREE.Color(0xff5555);
    }
    return new itowns.THREE.Color(0xeeeeee);
}

function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}


exports.view = globeView;
exports.initialPosition = positionOnGlobe;
