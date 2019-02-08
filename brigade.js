const { events, Job, Group } = require("brigadier");
const { test } = require('./test.js');

events.on("exec", () => {
    console.log('hello world');
    test.say();
    // var env = {
    //     POSTGRES_DB: 'openmaptiles',
    //     POSTGRES_USER: 'openmaptiles',
    //     POSTGRES_PASSWORD: 'openmaptiles',
    //     POSTGRES_HOST: 'postgres-openmaptiles',
    //     POSTGRES_PORT: '5432',
    //     MIN_ZOOM: '0',
    //     MAX_ZOOM: '14',
    //     BBOX: '5.103149,51.884968,7.163086,52.407446'
    // };
    // var shareLocation = "/mnt/brigade/share";
    // var pbfLocation = shareLocation + "/data";
    // var buildLocation = shareLocation + "/build";
    // var cacheLocation = shareLocation + "/cache";
    // var wikiLocation = shareLocation + "/wikidata";

    // var makeJob = new Job('openmaptiles-tools', 'openmaptiles/openmaptiles-tools');
    // makeJob.storage.enabled = true;
    // makeJob.tasks = [
    //     "cd " + shareLocation,
    //     "git clone https://github.com/openmaptiles/openmaptiles.git ./",
    //     "mkdir " + pbfLocation,
    //     "mkdir " + buildLocation,
    //     "mkdir " + cacheLocation,
    //     "ln -s " + shareLocation + " /tileset",
    //     "curl http://download.geofabrik.de/europe/netherlands/gelderland-latest.osm.pbf -o " + pbfLocation + "/gelderland.osm.pbf",
    //     "make"
    // ];
    // makeJob.run().then(() => {
    //     var neJob = new Job("import-natural-earth", "openmaptiles/import-natural-earth:1.4");
    //     neJob.env = env;

    //     var wJob = new Job("import-water", "openmaptiles/import-water:0.6");
    //     wJob.env = env;

    //     var llJob = new Job("import-lakelines", "openmaptiles/import-lakelines:1.0");
    //     llJob.env = env;

    //     var ibJob = new Job("import-border", "openmaptiles/import-osmborder:0.4");
    //     ibJob.env = env;

    //     var cGroup = new Group([neJob, wJob, llJob, ibJob]);
    //     cGroup.runAll()
    //         .then(() => {

    //             var ioJob = new Job("import-osm", "2gcontainerregistry.azurecr.io/import-osm:0.17");
    //             ioJob.tasks = [
    //                 "cd /usr/src/app",
    //                 "./import_osm.sh > " + shareLocation + '/log.log'
    //             ];
    //             ioJob.imagePullSecrets = ["2gazureregistry"];
    //             ioJob.storage.enabled = true;
    //             ioJob.env = env;
    //             ioJob.env.IMPORT_DIR = pbfLocation;
    //             ioJob.env.MAPPING_YAML = buildLocation + '/mapping.yaml';
    //             ioJob.env.IMPOSM_CACHE_DIR = '/cache';
    //             ioJob.env.DIFF_MODE = 'false';

    //             ioJob.run().then(() => {
    //                 var wikiJob = new Job("import-wiki", "openmaptiles/import-wikidata:0.1");
    //                 wikiJob.env = env;
    //                 wikiJob.storage.enabled = true;
    //                 wikiJob.tasks = [
    //                     "ln -s " + wikiLocation + " /import",
    //                     "import-wikidata"
    //                 ];
    //                 wikiJob.run().then(() => {
    //                     var sqlJob = new Job("import-sql", "openmaptiles/import-sql:0.8");
    //                     sqlJob.env = env;
    //                     sqlJob.storage.enabled = true;
    //                     sqlJob.env.SQL_DIR = buildLocation;
    //                     sqlJob.run().then(() => {
    //                         var gvJob = new Job("generate-vectortilles", "openmaptiles/generate-vectortiles:0.1.1");
    //                         gvJob.env = env;
    //                         gvJob.timeout = 10800000;
    //                         gvJob.storage.enabled = true;
    //                         gvJob.env.EXPORT_DIR = '/tmp';
    //                         gvJob.env.SOURCE_PROJECT_DIR = buildLocation + "/openmaptiles.tm2source"
    //                         gvJob.tasks = ['/usr/src/app/export-local.sh', 'cp /tmp/tiles.mbtiles ' + pbfLocation]
    //                         gvJob.run().then(() => {
    //                             var metaJob = new Job('add-metadata', 'openmaptiles/openmaptiles-tools');
    //                             metaJob.storage.enabled = true;
    //                             metaJob.tasks = [
    //                                 "mkdir -p /temp",
    //                                 "cp " + pbfLocation + " /temp -r",
    //                                 "cd /temp",
    //                                 "generate-metadata ./data/tiles.mbtiles",
    //                                 "chmod 666 ./data/tiles.mbtiles",
    //                                 "\cp /temp/data/tiles.mbtiles " + shareLocation + "/data/tiles.mbtiles"
    //                             ];
    //                             metaJob.run();
    //                         })
    //                     })
    //                 });
    //             });
    //         });
    // });
});