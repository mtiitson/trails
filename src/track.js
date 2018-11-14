// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser

import xml2js from 'xml2js';
import EasyFit from 'easy-fit';


const parser = new xml2js.Parser();

function extractGPXTracks(gpx) {
    if (!gpx.trk) {
        console.log('GPX file has no tracks!', gpx);
        throw new Error('Unexpected gpx file format.');
    }

    const parsedTracks = [];

    gpx.trk.forEach(trk => {
        let name = trk.name && trk.name.length > 0 ? trk.name[0] : 'untitled';

        trk.trkseg.forEach(trkseg => {
            let points = trkseg.trkpt.map(trkpt => ({
                lat: parseFloat(trkpt.$.lat),
                lng: parseFloat(trkpt.$.lon),
                // These are available to us, but are currently unused
                // elev: parseFloat(trkpt.ele) || 0,
                // time: new Date(trkpt.time || '0')
            }));

            parsedTracks.push({points, name});
        });
    });

    return parsedTracks;
}

function extractTCXTracks(tcx, name) {
    if (!tcx.Activities) {
        console.log('TCX file has no activities!', tcx);
        throw new Error('Unexpected tcx file format.');
    }

    const parsedTracks = [];

    tcx.Activities[0].Activity.forEach(act => {
        act.Lap.forEach(lap => {
            let points = lap.Track[0].Trackpoint
                    .filter(trkpt => trkpt.Position)
                    .map(trkpt => ({
                        lat: parseFloat(trkpt.Position[0].LatitudeDegrees[0]),
                        lng: parseFloat(trkpt.Position[0].LongitudeDegrees[0]),
                        // These are available to us, but are currently unused
                        // elev: parseFloat(trkpt.ElevationMeters[0]) || 0,
                        // time: new Date(trkpt.Time[0] || '0')
                    }));
            parsedTracks.push({points, name});
        });
    });

    return parsedTracks;
}

function extractFITTracks(fit, name) {
    if (!fit.records || fit.records.length === 0) {
        console.log('FIT file has no records!', fit);
        throw new Error('Unexpected FIT file format.');
    }

    const points = [];
    for (const record of fit.records) {
        if (record.position_lat && record.position_long) {
            points.push({
                lat: record.position_lat,
                lng: record.position_long,
                // Other available fields: timestamp, distance, altitude, speed, heart_rate
            });
        }
    }


    return [{points, name}];
}


export default function extractTracks(format, fileBuf, name) {
    switch (format) {
    case 'gpx':
    case 'tcx': /* Handle XML based file formats the same way */
        // TODO: TextDecoder likely needs a polyfill, can we get away without it?
        const textContents = new TextDecoder('utf-8').decode(new Uint8Array(fileBuf));

        return new Promise((resolve, reject) => {
            parser.parseString(textContents, (err, result) => {
                if (err) {
                    reject(err);
                } else if (result.gpx) {
                    resolve(extractGPXTracks(result.gpx));
                } else if (result.TrainingCenterDatabase) {
                    resolve(extractTCXTracks(result.TrainingCenterDatabase, name));
                } else {
                    reject(new Error('Invalid file type.'));
                }
            });
        });

    case 'fit':
        return new Promise((resolve, reject) => {
            const parser = new EasyFit({
                force: true,
                mode: 'list',
            });

            // Parse your file
            parser.parse(fileBuf, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(extractFITTracks(result, name));
                }
            });
        });

    default:
        throw `Unsupported file format: ${format}`;
    }
}
