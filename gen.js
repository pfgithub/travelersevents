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

function percent(curr, total) {
    return (curr * 100 / total).toFixed(2) + "% ("+curr+"/"+total+")";
}

function eventPrint(k, ev) {
    let lastSeen = ev.latestView ? new Date(ev.latestView).toISOString() : "??";
    let loot = Object.entries(ev.loot || {})
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([a, b]) => [JSON.parse(a), b]);
    let res = "";
    res += "# "+eventTitle(ev) + "\n\n";
    res += "Seen " + (ev.views || "??") + " time" + (ev.views === 1 ? "" : "s") + ". Last seen "+lastSeen+".\n\n";
    res += eventDescription(ev) + "\n\n";
    res += "## Buttons:\n\n";
    for(let option of ev.options) {
        let vloc = ev.visits[option];
        if(vloc) {
            if(vloc.length > 1) vloc = vloc.filter(itm => itm !== k);
            res += "- **"+option+"**: "+vloc.map(im => "["+locationNames.get(im)+"]("+locationFiles.get(im)+")").join(", ")+"\n";
        }else
            res += "- **"+option+"**: I have not gone this way yet.\n";
    }
    if(ev.options.length === 0){
        res += "- *No options. Strange.*";
    }
    res += "\n";
    if(loot.length >= 1 && !(ev.type !== "loot" && loot.length === 1 && loot[0][0].length === 0)) {
        res += "## Loot Frequency:\n\n";
        let total = loot.reduce((t, b) => t + b[1], 0);
        let itemGroups = {};
        for(let [json, count] of loot) {
            let key = [...new Set(json.map(item => item.id))].sort().join("%,%");
            if(!itemGroups[key]) itemGroups[key] = {arr: [], total: 0};
            itemGroups[key].total += count;
            itemGroups[key].arr.push([json, count]);
        }
        for(let [itemStr, values] of Object.entries(itemGroups)) {
            let groupTotal = values.total;
            let items = itemStr.split("%,%");
            let itemValues = {};
            for(let [json, count] of values.arr) {
                for(let item of json) {
                    if(!itemValues[item.id]) itemValues[item.id] = {...item, counts: []};
                    let exst = itemValues[item.id].counts.find(q => q.count === item.count);
                    if(exst)
                        exst.chance += count;
                    else
                        itemValues[item.id].counts.push({count: item.count, chance: count});
                }
            }
            res += "- +"+percent(groupTotal, total)+" chance of:\n";
            let vlus = Object.entries(itemValues);
            if(vlus.length === 0)
                res += "  - *No items*";
            for(let [_, item] of vlus) {
                let counts = item.counts.map(a => "<a title=\""+percent(a.chance, groupTotal)+"\">" + a.count + "</a>").join(", ");
                res += "  - "+item.name+": "+counts+" (hover for chance)\n";
            }
        }
        res += "\n";
    }else if(ev.type === "loot") {
        res += "## Example Loot:\n\n";
        for(let [name, item] of Object.entries(ev.data.items)) {
            res += "- +"+item.count+" "+item.data.title+" (<code>";
            res += item.data.icon.replace(/[\\*_]/g, "\\$0")+"</code>)  \n";
            res += "  "+item.data.desc+"  \n";
            res += "  **weight**: "+item.data.weight+" units\n";
        }
        res += "\n";
    }
    res += "\n";
    return res.trim();
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
