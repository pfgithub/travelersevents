const eventmap = require("./eventmap.json");
const fs = require("fs").promises;

const locationsDir = __dirname + "/docs/";

let locationFiles = new Map();
let locationNames = new Map();

function eventTitle(ev) {
    if(ev.type === "travel") return "Travel";
    if(ev.type === "loot") return ev.data.title + " (Looting)";
    if(ev.type === "event") return ev.data.stage_data.title;
    throw new Error("unreachable");
}

let catif = (txt, ycy) => txt ? ycy.replace("{}", txt) : "";

function eventDescription(ev) {
    if(ev.type === "travel") return "Walking.";
    if(ev.type === "loot") return ev.data.desc + catif(ev.data.visitdesc, "\n\n**Visited**: {}");
    if(ev.type === "event") return ev.data.stage_data.desc + catif(ev.data.stage_data.req_met_desc, "\n\n**If Req Met**: {}");
    throw new Error("unreachable");
}

function eventPrint(k, ev) {
    let lastSeen = ev.latestView ? new Date(ev.latestView).toISOString() : "??";
    let res = "";
    res += "# "+eventTitle(ev) + "\n\n";
    res += "Seen " + (ev.views || "??") + " time" + (ev.views === 1 ? "" : "s") + ". Last seen "+lastSeen+".\n\n";
    res += eventDescription(ev) + "\n\n";
    if(ev.type === "loot") {
        res += "## Example Loot:\n\n";
        for(let [name, item] of Object.entries(ev.data.items)) {
            res += "- +"+item.count+" "+item.data.title+" (<code>";
            res += item.data.icon.replace(/[\\*_]/g, "\\$0")+"</code>)  \n";
            res += "  "+item.data.desc+"  \n";
            res += "  **weight**: "+item.data.weight+" units\n";
        }
        res += "\n";
    }
    res += "## Buttons:\n\n";
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
        locationFiles.set(k, eventTitle(v).replace(/[^a-zA-Z0-9]/g, "-") + "-"+k+".md");
        locationNames.set(k, eventTitle(v));
    }
    for(let [k, v] of Object.entries(eventmap)) {
        let filename = locationsDir + locationFiles.get(k);
        const text = eventPrint(k, v);
        await fs.writeFile(filename, text, "utf-8");
    }
})();
