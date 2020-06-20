const eventmap = require("./eventmap.json");
const fs = require("fs").promises;

const locationsDir = __dirname + "/docs/";

let locationFiles = new Map();
let locationNames = new Map();

function eventTitle(ev) {
    if(ev.type === "travel") return "travel";
    if(ev.type === "loot") return ev.data.title;
    if(ev.type === "event") return ev.data.stage_data.title;
    throw new Error("unreachable");
}

function eventPrint(k, ev) {
    let res = "";
    res += "# "+eventTitle(ev) + "\n\n";
    for(let option of ev.options) {
        let vloc = ev.visits[option];
        if(vloc) {
            if(vloc.length > 1) vloc = vloc.filter(itm => itm !== k);
            res += "- **"+option+"**: "+vloc.map(im => "["+locationNames.get(im)+"]("+locationFiles.get(im)+")").join(", ")+"\n";
        }else
            res += "- **"+option+"**: I have not gone this way yet.\n";
    }
    return res;
}

(async () => {
    await fs.mkdir(locationsDir, {recursive: true});
    for(let [k, v] of Object.entries(eventmap)) {
        locationFiles.set(k, eventTitle(v).replace(/[^a-zA-Z0-9]/g, "-") + "-"+k);
        locationNames.set(k, eventTitle(v));
    }
    for(let [k, v] of Object.entries(eventmap)) {
        let filename = locationsDir + locationFiles.get(k);
        const text = eventPrint(k, v);
        await fs.writeFile(filename, text, "utf-8");
    }
})();
