/**
 * Class: Raster_Provider
 * Description: Provides textures from a vector data
 */


import * as THREE from 'three';
import togeojson from 'togeojson';
import Extent from '../../Geographic/Extent';
import Feature2Texture from '../../../Renderer/ThreeExtended/Feature2Texture';
import GeoJSON2Features from '../../../Renderer/ThreeExtended/GeoJSON2Features';
import Fetcher from './Fetcher';

function getExtentFromGpxFile(file) {
    const bound = file.getElementsByTagName('bounds')[0];
    if (bound) {
        const west = bound.getAttribute('minlon');
        const east = bound.getAttribute('maxlon');
        const south = bound.getAttribute('minlat');
        const north = bound.getAttribute('maxlat');
        return new Extent('EPSG:4326', west, east, south, north);
    }
    return new Extent('EPSG:4326', -180, 180, -90, 90);
}

function createTextureFromVector(tile, layer) {
    if (!tile.material) {
        return Promise.resolve();
    }

    if (layer.type == 'color') {
        const coords = tile.extent;
        const result = { pitch: new THREE.Vector4(0, 0, 1, 1) };
        result.texture = Feature2Texture.createTextureFromFeature(layer.feature, tile.extent, 256, layer.style);
        result.texture.extent = tile.extent;
        result.texture.coords = coords;
        result.texture.coords.zoom = tile.level;

        if (layer.transparent) {
            result.texture.premultiplyAlpha = true;
        }
        return Promise.resolve(result);
    } else {
        return Promise.resolve();
    }
}

export default {
    preprocessDataLayer(layer) {
        if (!layer.url) {
            throw new Error('layer.url is required');
        }

        layer.options = layer.options || {};
        // KML and GPX specifications all says that they should be in
        // EPSG:4326. We still support reprojection for them through this
        // configuration option
        layer.projection = layer.projection || 'EPSG:4326';
        const parentCrs = layer.parentLayer.extent.crs();

        const options = { buildExtent: true, crsIn: layer.projection };

        if (!(layer.extent instanceof Extent)) {
            layer.extent = new Extent(layer.projection, layer.extent).as(parentCrs);
        }

        if (!layer.options.zoom) {
            layer.options.zoom = { min: 5, max: 21 };
        }

        layer.style = layer.style || {};

        // Rasterization of data vector
        // It shouldn't use parent's texture outside its extent
        // Otherwise artefacts appear at the outer edge
        layer.noTextureParentOutsideLimit = true;

        return Fetcher.text(layer.url, layer.networkOptions).then((text) => {
            let geojson;
            // if it's an xml file, then it can be kml or gpx
            if (text.startsWith('<')) {
                const parser = new DOMParser();
                const file = parser.parseFromString(text, 'application/xml');
                if (file.getElementsByTagName('kml')[0]) {
                    geojson = togeojson.kml(file);
                } else if (file.getElementsByTagName('gpx')[0]) {
                    geojson = togeojson.gpx(file);
                    layer.style.stroke = layer.style.stroke || 'red';
                    layer.extent = layer.extent.intersect(getExtentFromGpxFile(file).as(layer.extent.crs()));
                } else {
                    throw new Error('Unsupported xml file data vector');
                }
            } else {
                // assume it's json
                geojson = JSON.parse(text);
                if (geojson.type !== 'Feature' && geojson.type !== 'FeatureCollection') {
                    throw new Error('Unsupported json file data vector');
                }
            }

            if (geojson) {
                layer.feature = GeoJSON2Features.parse(parentCrs, geojson, layer.extent, options);
                layer.extent = layer.feature.extent || layer.feature.geometry.extent;
            }
        });
    },
    tileInsideLimit(tile, layer) {
        return tile.level >= layer.options.zoom.min && tile.level <= layer.options.zoom.max && layer.extent.intersectsExtent(tile.extent);
    },
    executeCommand(command) {
        const layer = command.layer;
        const tile = command.requester;

        return createTextureFromVector(tile, layer);
    },
};
