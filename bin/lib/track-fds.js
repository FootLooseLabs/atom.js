// fdTracker.js
const fs = require("fs");
const chalk = require("chalk");

function listOpenFDs() {
    try {
        return fs.readdirSync(`/proc/${process.pid}/fd`)
                 .map(Number)
                 .filter(n => !isNaN(n));
    } catch {
        return [];
    }
}

const initialFDs = listOpenFDs();
const fdOpenTimes = new Map(initialFDs.map(fd => [fd, Date.now()]));

function reportLeakedFDs() {
    const currentFDs = listOpenFDs();
    const newFDs = currentFDs.filter(fd => !initialFDs.includes(fd));

    if (newFDs.length > 0) {
        console.log("\n" + chalk.yellow(`Leaked/Open FDs:`));
        newFDs.forEach(fd => {
            try {
                const target = fs.readlinkSync(`/proc/${process.pid}/fd/${fd}`);
                const openTime = fdOpenTimes.get(fd) || Date.now();
                const ageSecs = ((Date.now() - openTime) / 1000).toFixed(2);
                console.log(`  FD ${fd}: ${target} (open for ${ageSecs}s)`);
            } catch {
                console.log(`  FD ${fd}: (could not read link)`);
            }
        });
    }
}

process.on("exit", reportLeakedFDs);
process.on("SIGINT", () => { reportLeakedFDs(); process.exit(); });
process.on("SIGTERM", () => { reportLeakedFDs(); process.exit(); });

module.exports = {
    track: () => {
        // optional manual snapshot of new FDs
        listOpenFDs().forEach(fd => {
            if (!fdOpenTimes.has(fd)) fdOpenTimes.set(fd, Date.now());
        });
    }
};
