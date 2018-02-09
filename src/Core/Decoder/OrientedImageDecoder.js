import { Euler, Matrix4 } from 'three';
import Coordinates from '../Geographic/Coordinates';

function toCoord(ori, offset) {
    return new Coordinates('EPSG:2154', ori.easting + offset.x, ori.northing + offset.y, ori.altitude + offset.z);
}

function toOri(ori) {
    const d2r = Math.PI / 180;
    return new Euler(
        ori.pitch * d2r,
        ori.roll * d2r,
        ori.heading * d2r, 'ZXY');
}

export const oiStereopolis = {
    toCoord,
    toOri,
    offset: {
        x: 0,
        y: 0,
        z: 0,
    },
};

function getTransfoLocalToPanoMicMac(roll, pitch, heading) {
    // Omega
    var ω = parseFloat(roll) / 180 * Math.PI;  // Deg to Rad // Axe X
    // Phi
    var ɸ = parseFloat(pitch) / 180 * Math.PI;  // Deg to Rad // axe Y
    // Kappa
    var κ = parseFloat(heading) / 180 * Math.PI;  // Deg to Rad // axe Z
    var M4 = new Matrix4();
    M4.elements[0] = Math.cos(ɸ) * Math.cos(κ);
    M4.elements[1] = Math.cos(ɸ) * Math.sin(κ);
    M4.elements[2] = -Math.sin(ɸ);

    M4.elements[4] = Math.cos(ω) * Math.sin(κ) + Math.sin(ω) * Math.sin(ɸ) * Math.cos(κ);
    M4.elements[5] = -Math.cos(ω) * Math.cos(κ) + Math.sin(ω) * Math.sin(ɸ) * Math.sin(κ);
    M4.elements[6] = Math.sin(ω) * Math.cos(ɸ);

    M4.elements[8] = Math.sin(ω) * Math.sin(κ) - Math.cos(ω) * Math.sin(ɸ) * Math.cos(κ);
    M4.elements[9] = -Math.sin(ω) * Math.cos(κ) - Math.cos(ω) * Math.sin(ɸ) * Math.sin(κ);
    M4.elements[10] = -Math.cos(ω) * Math.cos(ɸ);
    console.log(M4);
    return M4;
}

function toOriMicMac(ori) {
    const d2r = Math.PI / 180;
    // console.log('++++++++++++++++++++++++++++++++++++++');
    // console.log('Matrice ecrite par Gregoire de la doc MicMac');

    // getTransfoLocalToPanoMicMac(ori.roll, ori.pitch, ori.heading);
    const euler = new Euler(
        ori.roll * d2r,
        ori.pitch * d2r,
        ori.heading * d2r,
        'XYZ');

    // const matrixFromEuler = new Matrix4().makeRotationFromEuler(euler);
    // console.log('Matrice obtenue par le code générique ThreeJs make rotation from euler');
    // console.log(matrixFromEuler);

    // var trix = new Matrix4().set(
    //     1, 0, 0, 0,
    //     0, -1, 0, 0,
    //     0, 0, -1, 0,
    //     0, 0, 0, 1);

    // const matrixMicMac = matrixFromEuler.clone().multiply(trix).transpose();
    // // const matrixMicMac = trix.clone().multiply(matrixFromEuler);
    // console.log('Matrice obtenue en trixant');
    // console.log(matrixMicMac);

    // console.log('++++++++++++++++++++++++++++++++++++++');
    return euler;
}

export const oiMicMac = {
    toCoord,
    toOri: toOriMicMac, // ori => toOriMicMac(ori),
    offset: {
        x: 0,
        y: 0,
        z: 0,
    },
};

export default {
    decode(arrayOE, convert) {
        if (!arrayOE || !(arrayOE instanceof Array)) {
            throw new Error('lol');
        }
        const result = new Array(arrayOE.length);

        for (let i = 0; i < arrayOE.length; ++i) {
            // console.log('Decoding line : ', arrayOE[i]);
            result[i] = {
                coord: convert.toCoord(arrayOE[i], convert.offset),
                orientation: convert.toOri(arrayOE[i]),
                source: arrayOE[i],
            };
        }
        return result;
    },
};
