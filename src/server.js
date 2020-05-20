const express = require('express');
const sha1 = require('object-hash').sha1;
const bodyparser = require('body-parser');
const DataStore = require('nedb');

const db = new DataStore({filename: 'tracks.db', autoload: true});
const app = express();
app.use(bodyparser.json({limit: '10mb'}));
app.post('/', ({body}, res) => {
  if (!Array.isArray(body)) {
    console.warn(`Invalid POST body`);
    return res.status(400).send('bad request');
  }
  console.log(`POST ${body.length} tracks`);
  const errors = body.map(({points, filename, name, timestamp}) =>
    !([typeof filename, typeof name, typeof timestamp].every(type => ['string', 'undefined'].includes(type))
      && Array.isArray(points)
      && points.flatMap(p => [typeof p.lng, typeof p.lat]).every(type => type === 'number'))).filter(Boolean).length;
  if (errors) {
    console.warn(`POST with ${errors} invalid tracks`);
    return res.status(400).send('bad request');
  }
  res.send('ok');
  body.forEach(({points, filename, name, timestamp}) => {
    const hash = sha1(points);
    db.update({hash}, {
      hash, points: points.map(({lng, lat}) => ({lng, lat})), filename, name, timestamp
    }, {upsert: true});
  })
});
app.get('/tracks', (req, res) => {
  console.log('GET /tracks');
  db.find({}, (err, docs) => {
    if (err) {
      return res.status(500).send(err)
    }
    res.send(docs.map(track => ({...track, points: track.points.filter(outsidePrivateZone)})));
  })
});
app.use(express.static('public'));
app.listen(8000, () => {
  console.log('Server started at 8000');
});

const privateZones = [
  {nw: {lat: 59.4287421, lng: 24.7258619}, se: {lat: 59.4194392, lng: 24.7419560}},
  {nw: {lat: 59.5031350, lng: 24.8361700}, se: {lat: 59.4933700, lng: 24.8611460}}
];

function outsidePrivateZone({lng, lat}) {
  return !privateZones.some(zone =>
    zone.se.lng > lng &&
    zone.nw.lng < lng &&
    zone.nw.lat > lat &&
    zone.se.lat < lat);
}
