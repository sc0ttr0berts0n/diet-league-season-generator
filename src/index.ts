import Season from './season';

const cluster = require('cluster');
const numCPUS = require('os').cpus().length;
// const numCPUS = 1;

if (cluster.isMaster) {
    for (var i = 0; i < numCPUS; i++) {
        var new_worker_env = {};

        new_worker_env['WORKER_NAME'] = 'worker' + i;
        new_worker_env['id'] = i;

        var new_worker = cluster.fork(new_worker_env);
    }
} else {
    const season = new Season({ isSeeded: true, playerCount: 16 });
    let bestMatches: Match[];
    let bestDeviation = Infinity;
    const start = 0;
    const limit = 100000000;
    for (let i = start; i < limit; i = i + numCPUS) {
        season.opts.seed = i + parseInt(process.env['id']);
        if (season.opts.seed >= limit) break;
        season.generateSeason();
        const dev = season.getDeviationScore();
        if (dev < bestDeviation) {
            bestMatches = season.matches;
            bestDeviation = dev;

            console.log(`\nWorker [${process.env['id']}] found:`);
            console.log(`Iteration # ${i}`);
            console.log(`Best Deviation: ${bestDeviation}\n\n`);
        }
        if (dev === 0) {
            break;
        }
        // console.log('looping...');
    }
    if (bestDeviation < Infinity) {
        console.log(`\nWorker [${process.env['id']}] found:`);
        console.log(`Success!`);
        console.log(`Best Deviation: ${bestDeviation}`);
        console.log(bestMatches);
    } else {
        console.log(`\nWorker [${process.env['id']}] finished, nothing found`);
    }
    debugger;
}

// const season = new Season({ playerCount: 8 });
// season.matches.forEach((match: Match) => {
//     console.log(JSON.stringify(match));
// });
// console.log(season.getDeviationScore());

// debugger;
