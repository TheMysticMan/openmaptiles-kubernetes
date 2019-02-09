const { events, Job, Group } = require("brigadier");

const shareLocation = "/mnt/brigade/share";
const dataLocation = shareLocation + "/data";
const buildLocation = shareLocation + "/build";
const cacheLocation = shareLocation + "/cache";
const wikiLocation = shareLocation + "/wikidata";


events.on("exec", (e, p) => {
    try {
        var env = {
            POSTGRES_DB: p.secrets.postgres_db,
            POSTGRES_USER: p.secrets.postgres_user,
            POSTGRES_PASSWORD: p.secrets.postgress_password,
            POSTGRES_HOST: p.secrets.postgress_host,
            POSTGRES_PORT: p.secrets.postgress_port.toString(),
            MIN_ZOOM: p.secrets.min_zoom.toString(),
            MAX_ZOOM: p.secrets.max_zoom.toString(),
            BBOX: p.secrets.bbox
        };
        importAll(e, p, env);
    }
    catch(e){
        console.log(e);
    }
});

const importAll = (e, p, env) => {
    jobs.forcedCleanSql(e, p, env)
        .then(() => {
            Promise.all(
                [
                    jobs.setupTools(e, p, env),
                    jobs.importCommon(e, p, env)
                ])
                .then(() => {
                    jobs.importOsm(e, p, env).then(() => {
                        jobs.importWikiData(e, p, env)
                            .then(() => {
                                jobs.importSql(e, p, env)
                                    .then(() => {
                                        jobs.generateVectorTiles(e, p, env)
                                            .then(() => { jobs.addMetadata(e, p, env) })
                                    })
                            })
                    })
                })
        });
}

const jobs = {
    /**
     * Clean the database
     */
    forcedCleanSql: (e, p, env) => {
        const job = new Job("forced-clean-sql", "openmaptiles/import-osm:0.5");
        job.env = env;
        job.tasks = [
            `/usr/src/app/psql.sh -c "DROP SCHEMA IF EXISTS public CASCADE ; CREATE SCHEMA IF NOT EXISTS public;`,
            `/usr/src/app/psql.sh -c "CREATE EXTENSION hstore; CREATE EXTENSION postgis; CREATE EXTENSION unaccent; CREATE EXTENSION fuzzystrmatch; CREATE EXTENSION osml10n; CREATE EXTENSION pg_stat_statements;"`,
            `/usr/src/app/psql.sh -c "GRANT ALL ON SCHEMA public TO public;COMMENT ON SCHEMA public IS 'standard public schema';"`
        ];
        return job.run();
    },

    /**
     * setup the tooling
     */
    setupTools: (e, p, env) => {
        var makeJob = new Job('openmaptiles-tools', 'openmaptiles/openmaptiles-tools');
        makeJob.storage.enabled = true;
        makeJob.tasks = [
            "cd " + shareLocation,
            "git clone https://github.com/openmaptiles/openmaptiles.git ./",
            "mkdir " + pbfLocation,
            "mkdir " + buildLocation,
            "mkdir " + cacheLocation,
            "ln -s " + shareLocation + " /tileset",
            "curl http://download.geofabrik.de/europe/netherlands/gelderland-latest.osm.pbf -o " + pbfLocation + "/gelderland.osm.pbf",
            "make"
        ];
        return makeJob.run()
    },

    /**
     * import common data
     */
    importCommon: (e, p, env) => {
        var neJob = new Job("import-natural-earth", "openmaptiles/import-natural-earth:1.4");
        neJob.env = env;

        var wJob = new Job("import-water", "openmaptiles/import-water:0.6");
        wJob.env = env;

        var llJob = new Job("import-lakelines", "openmaptiles/import-lakelines:1.0");
        llJob.env = env;

        var ibJob = new Job("import-border", "openmaptiles/import-osmborder:0.4");
        ibJob.env = env;

        var cGroup = new Group([neJob, wJob, llJob, ibJob]);
        return cGroup.runAll();
    },

    /**
     * Import osm data
     */
    importOsm: (e, p, env) => {
        var ioJob = new Job("import-osm", "openmaptiles/import-osm:0.5");
        ioJob.tasks = [
            "cd /usr/src/app",
            "./import_osm.sh > " + shareLocation + '/log.log'
        ];
        ioJob.storage.enabled = true;
        ioJob.env = env;
        ioJob.env.IMPORT_DIR = pbfLocation;
        ioJob.env.MAPPING_YAML = buildLocation + '/mapping.yaml';
        ioJob.env.IMPOSM_CACHE_DIR = '/cache';
        ioJob.env.DIFF_MODE = 'false';

        return ioJob.run();
    },

    /**
     * import wikidata
     */
    importWikiData: (e, p, env) => {
        var wikiJob = new Job("import-wiki", "openmaptiles/import-wikidata:0.1");
        wikiJob.env = env;
        wikiJob.storage.enabled = true;
        wikiJob.tasks = [
            "ln -s " + wikiLocation + " /import",
            "import-wikidata"
        ];
        return wikiJob.run();
    },

    /**
     * import sql
     */
    importSql: (e, p, env) => {
        var sqlJob = new Job("import-sql", "openmaptiles/import-sql:0.8");
        sqlJob.env = env;
        sqlJob.storage.enabled = true;
        sqlJob.env.SQL_DIR = buildLocation;
        return sqlJob.run();
    },

    /**
     * Generate vector tiles
     */
    generateVectorTiles: (e, p, env) => {
        var gvJob = new Job("generate-vectortilles", "openmaptiles/generate-vectortiles:0.1.1");
        gvJob.env = env;
        gvJob.timeout = 10800000;
        gvJob.storage.enabled = true;
        gvJob.env.EXPORT_DIR = '/tmp';
        gvJob.env.SOURCE_PROJECT_DIR = buildLocation + "/openmaptiles.tm2source"
        gvJob.tasks = ['/usr/src/app/export-local.sh', 'cp /tmp/tiles.mbtiles ' + pbfLocation]
        return gvJob.run();
    },

    /**
     * Add metadata
     */
    addMetadata: (e, p, env) => {
        var metaJob = new Job('add-metadata', 'openmaptiles/openmaptiles-tools');
        metaJob.storage.enabled = true;
        metaJob.tasks = [
            "mkdir -p /temp",
            "cp " + pbfLocation + " /temp -r",
            "cd /temp",
            "generate-metadata ./data/tiles.mbtiles",
            "chmod 666 ./data/tiles.mbtiles",
            "\cp /temp/data/tiles.mbtiles " + shareLocation + "/data/tiles.mbtiles"
        ];
        returnmetaJob.run();
    }
}