const { events, Job, Group } = require("brigadier");

const shareLocation = "/mnt/brigade/share";
const dataLocation = shareLocation + "/data";
const buildLocation = shareLocation + "/build";
const cacheLocation = shareLocation + "/cache";
const wikiLocation = shareLocation + "/wikidata";


events.on("exec", (e, p) => {
    try {
        var env = {
            POSTGRES_DB: "openmaptiles",
            POSTGRES_USER: "openmaptiles",
            POSTGRES_PASSWORD: "openmaptiles",
            POSTGRES_HOST: "postgres-openmaptiles",
            POSTGRES_PORT: "5432",
            MIN_ZOOM: "0",
            MAX_ZOOM: "14",
            //BBOX: "5.103149,51.884968,7.163086,52.407446" // Netherlands/Gelderland
            BBOX: "3.136597,50.729502,7.256470,53.657661" // Netherlands
        };
        // importAll(e, p, env).catch((e) => {
        //     console.log(e);
        // });

        //console.log(e);
        //console.log(p);
        // generateTiles(e, p, env).catch((e) => {
        //     console.log(e);
        // });
        // jobs.copyMbTiles(e,p, env).catch((e) => console.log(e));
        generateTiles(e, p, env)
            .then(() => {
                return jobs.copyMbTiles(e, p, env)
                    .then(() => { return jobs.deployNewVersion(e, p, env) });
            })
            .catch((err) => console.log(err));
    }
    catch (eee) {
        console.log(err);
    }
});

const generateTiles = (e, p, env) => {
    return Group.runEach([
        jobs.setupTools(e, p, env),
        jobs.generateVectorTiles(e, p, env),
        jobs.addMetadata(e, p, env)
    ]);
}

const importAll = (e, p, env) => {
    return jobs.forcedCleanSql(e, p, env).then(() => {
        return jobs.setupTools(e, p, env).then(() => {
            return jobs.importCommon(e, p, env).then(() => {
                return jobs.importOsm(e, p, env).then(() => {
                    return jobs.importWikiData(e, p, env).then(() => {
                        return jobs.importSql(e, p, env).then(() => {
                            return jobs.generateVectorTiles(e, p, env).then(() => {
                                return jobs.addMetadata(e, p, env)
                            })
                        })
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
            `/usr/src/app/psql.sh -c "DROP SCHEMA IF EXISTS public CASCADE ; CREATE SCHEMA IF NOT EXISTS public;"`,
            `/usr/src/app/psql.sh -c "CREATE EXTENSION hstore; CREATE EXTENSION postgis; CREATE EXTENSION unaccent; CREATE EXTENSION fuzzystrmatch; CREATE EXTENSION osml10n; CREATE EXTENSION pg_stat_statements;"`,
            `/usr/src/app/psql.sh -c "GRANT ALL ON SCHEMA public TO public;COMMENT ON SCHEMA public IS 'standard public schema';"`
        ];
        return job;
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
            "mkdir " + dataLocation,
            "mkdir " + buildLocation,
            "mkdir " + cacheLocation,
            "ln -s " + shareLocation + " /tileset",
            "curl http://download.geofabrik.de/europe/netherlands-latest.osm.pbf -o " + dataLocation + "/netherlands.osm.pbf",
            "make"
        ];
        return makeJob;
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
        return cGroup;
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
        ioJob.env.IMPORT_DIR = dataLocation;
        ioJob.env.MAPPING_YAML = buildLocation + '/mapping.yaml';
        ioJob.env.IMPOSM_CACHE_DIR = '/cache';
        ioJob.env.DIFF_MODE = 'false';

        return ioJob;
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
        return wikiJob;
    },

    /**
     * import sql
     */
    importSql: (e, p, env) => {
        var sqlJob = new Job("import-sql", "openmaptiles/import-sql:0.8");
        sqlJob.env = env;
        sqlJob.storage.enabled = true;
        sqlJob.env.SQL_DIR = buildLocation;
        return sqlJob;
    },

    /**
     * Generate vector tiles
     */
    generateVectorTiles: (e, p, env) => {
        var gvJob = new Job("generate-vectortiles", "openmaptiles/generate-vectortiles:0.1.1");
        gvJob.env = env;
        gvJob.timeout = 10800000;
        gvJob.storage.enabled = true;
        gvJob.env.EXPORT_DIR = '/tmp';
        gvJob.env.SOURCE_PROJECT_DIR = buildLocation + "/openmaptiles.tm2source"
        gvJob.tasks = ['/usr/src/app/export-local.sh', 'cp /tmp/tiles.mbtiles ' + dataLocation]
        return gvJob;
    },

    /**
     * Add metadata
     */
    addMetadata: (e, p, env) => {
        var metaJob = new Job('add-metadata', 'openmaptiles/openmaptiles-tools');
        metaJob.storage.enabled = true;
        metaJob.tasks = [
            "mkdir -p /temp",
            "cp " + dataLocation + " /temp -r",
            "cd /temp",
            "generate-metadata ./data/tiles.mbtiles",
            "chmod 666 ./data/tiles.mbtiles",
            "\cp /temp/data/tiles.mbtiles " + shareLocation + "/data/tiles.mbtiles"
        ];
        return metaJob;
    },

    /**
     * Copy tiles to tileserver directory
     */
    copyMbTiles: (e, p, env) => {
        const copyJob = new Job('kubectl-copy-tiles', 'lachlanevenson/k8s-kubectl');
        copyJob.storage.enabled = true;
        copyJob.env = {
            BUILD_ID: e.buildID
        }

        copyJob.tasks = [
            `sh /src/copy-tiles/run.sh`
        ];

        return copyJob.run();
    },

    deployNewVersion: (e, p, env) => {
        const deployJob = new Job('kubectl-deploy-tileserver', 'lachlanevenson/k8s-kubectl');
        deployJob.storage.enabled = true;
        deployJob.env = {
            BUILD_ID: e.buildID
        }

        deployJob.tasks = [
            `sh /src/tileserver/deploy.sh`
        ];

        return deployJob.run();
    }
}