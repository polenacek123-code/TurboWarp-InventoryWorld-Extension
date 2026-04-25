// InventoryWorld Extension for TurboWarp/Scratch
// Version 1.0.0 | Category: Game Systems
// 50+ blocks across 6 categories:
//   📦 Inventory, ⚔️ Items & Stats, 🌍 World Map, 📅 Time & Calendar,
//   🎲 RNG & Probability, 💾 Data (Import/Export .sef)

(function (Scratch) {
  "use strict";

  // ─── STATE ────────────────────────────────────────────────────────────────
  const state = {
    inventories: {}, // inventoryName -> { slotCount, slots: [{id,qty,meta}] }
    items: {},        // itemId -> { name, type, value, weight, tags:{} }
    stats: {},        // statName -> number
    worldMap: {},     // "x,y" -> { biome, visited, notes }
    playerPos: { x: 0, y: 0 },
    worldSeed: Math.floor(Math.random() * 999999),
    calendar: { day: 1, month: 1, year: 1, hour: 8, minute: 0, speed: 1 },
    rngSeed: Date.now(),
    rngState: Date.now(),
    eventLog: [],
    recipes: {},       // recipeId -> { inputs:[{id,qty}], output:{id,qty} }
    factions: {},      // factionName -> { reputation: 0, rank: "Neutral" }
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  function getOrCreateInv(name) {
    if (!state.inventories[name]) {
      state.inventories[name] = { slotCount: 20, slots: [] };
    }
    return state.inventories[name];
  }

  function findSlot(inv, itemId) {
    return inv.slots.findIndex((s) => s && s.id === itemId);
  }

  function mulberry32(seed) {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function seededRand() {
    state.rngState = (state.rngState * 1664525 + 1013904223) & 0xffffffff;
    return (state.rngState >>> 0) / 0xffffffff;
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function log(msg) {
    state.eventLog.push({ t: Date.now(), msg: String(msg) });
    if (state.eventLog.length > 200) state.eventLog.shift();
  }

  const BIOMES = ["Forest", "Desert", "Snow", "Ocean", "Plains", "Mountain", "Swamp", "Volcano"];
  function biomeAt(x, y, seed) {
    const v = mulberry32(hashStr(`${x},${y},${seed}`));
    return BIOMES[Math.floor(v * BIOMES.length)];
  }

  const MONTH_NAMES = ["Thaw", "Bloom", "Ember", "Frost", "Storm", "Void"];
  const DAY_NAMES = ["Sunday", "Moonday", "Starday", "Ashday", "Rainday"];

  // ─── EXTENSION ────────────────────────────────────────────────────────────
  class InventoryWorldExtension {
    getInfo() {
      return {
        id: "inventoryworld",
        name: "InventoryWorld",
        color1: "#2D5A27",
        color2: "#1A3D16",
        color3: "#0F2409",
        blocks: [
          // ══════════════════════════════════════════════════
          // 📦 INVENTORY
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "📦 Inventory" },

          {
            opcode: "createInventory",
            blockType: Scratch.BlockType.COMMAND,
            text: "create inventory [NAME] with [SLOTS] slots",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
              SLOTS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
            },
          },
          {
            opcode: "addItem",
            blockType: Scratch.BlockType.COMMAND,
            text: "add [QTY] of item [ID] to inventory [NAME]",
            arguments: {
              QTY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "removeItem",
            blockType: Scratch.BlockType.COMMAND,
            text: "remove [QTY] of item [ID] from inventory [NAME]",
            arguments: {
              QTY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "itemCount",
            blockType: Scratch.BlockType.REPORTER,
            text: "count of [ID] in [NAME]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "hasItem",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "inventory [NAME] has [QTY]+ of [ID]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
              QTY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
            },
          },
          {
            opcode: "slotItem",
            blockType: Scratch.BlockType.REPORTER,
            text: "item ID in slot [SLOT] of [NAME]",
            arguments: {
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "slotQty",
            blockType: Scratch.BlockType.REPORTER,
            text: "quantity in slot [SLOT] of [NAME]",
            arguments: {
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "usedSlots",
            blockType: Scratch.BlockType.REPORTER,
            text: "used slots in [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "freeSlots",
            blockType: Scratch.BlockType.REPORTER,
            text: "free slots in [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "clearInventory",
            blockType: Scratch.BlockType.COMMAND,
            text: "clear inventory [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "transferItem",
            blockType: Scratch.BlockType.COMMAND,
            text: "transfer [QTY] of [ID] from [FROM] to [TO]",
            arguments: {
              QTY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              FROM: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
              TO: { type: Scratch.ArgumentType.STRING, defaultValue: "chest" },
            },
          },
          {
            opcode: "totalWeight",
            blockType: Scratch.BlockType.REPORTER,
            text: "total weight of [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "inventoryAsJSON",
            blockType: Scratch.BlockType.REPORTER,
            text: "inventory [NAME] as JSON",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },

          // ══════════════════════════════════════════════════
          // ⚔️ ITEMS & STATS
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "⚔️ Items & Stats" },

          {
            opcode: "defineItem",
            blockType: Scratch.BlockType.COMMAND,
            text: "define item [ID] name [NAME] type [TYPE] value [VAL] weight [W]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "Apple" },
              TYPE: { type: Scratch.ArgumentType.STRING, defaultValue: "food" },
              VAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.2 },
            },
          },
          {
            opcode: "itemProperty",
            blockType: Scratch.BlockType.REPORTER,
            text: "item [ID] property [PROP]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              PROP: {
                type: Scratch.ArgumentType.STRING,
                menu: "itemProps",
                defaultValue: "name",
              },
            },
          },
          {
            opcode: "tagItem",
            blockType: Scratch.BlockType.COMMAND,
            text: "tag item [ID] with [TAG] = [VAL]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "sword" },
              TAG: { type: Scratch.ArgumentType.STRING, defaultValue: "damage" },
              VAL: { type: Scratch.ArgumentType.STRING, defaultValue: "15" },
            },
          },
          {
            opcode: "itemTag",
            blockType: Scratch.BlockType.REPORTER,
            text: "tag [TAG] of item [ID]",
            arguments: {
              TAG: { type: Scratch.ArgumentType.STRING, defaultValue: "damage" },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "sword" },
            },
          },
          {
            opcode: "setStat",
            blockType: Scratch.BlockType.COMMAND,
            text: "set stat [STAT] to [VAL]",
            arguments: {
              STAT: { type: Scratch.ArgumentType.STRING, defaultValue: "HP" },
              VAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
            },
          },
          {
            opcode: "changeStat",
            blockType: Scratch.BlockType.COMMAND,
            text: "change stat [STAT] by [DELTA]",
            arguments: {
              STAT: { type: Scratch.ArgumentType.STRING, defaultValue: "HP" },
              DELTA: { type: Scratch.ArgumentType.NUMBER, defaultValue: -10 },
            },
          },
          {
            opcode: "getStat",
            blockType: Scratch.BlockType.REPORTER,
            text: "stat [STAT]",
            arguments: {
              STAT: { type: Scratch.ArgumentType.STRING, defaultValue: "HP" },
            },
          },
          {
            opcode: "clampStat",
            blockType: Scratch.BlockType.COMMAND,
            text: "clamp stat [STAT] between [MIN] and [MAX]",
            arguments: {
              STAT: { type: Scratch.ArgumentType.STRING, defaultValue: "HP" },
              MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
            },
          },
          {
            opcode: "defineRecipe",
            blockType: Scratch.BlockType.COMMAND,
            text: "define recipe [ID] inputs [INPUTS] output [OUTID] qty [QTY]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "r1" },
              INPUTS: { type: Scratch.ArgumentType.STRING, defaultValue: "wood:2,stone:1" },
              OUTID: { type: Scratch.ArgumentType.STRING, defaultValue: "axe" },
              QTY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "canCraft",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "can craft recipe [ID] from [INV]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "r1" },
              INV: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },
          {
            opcode: "craftRecipe",
            blockType: Scratch.BlockType.COMMAND,
            text: "craft recipe [ID] from [INV]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "r1" },
              INV: { type: Scratch.ArgumentType.STRING, defaultValue: "bag" },
            },
          },

          // ══════════════════════════════════════════════════
          // 🌍 WORLD MAP
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "🌍 World Map" },

          {
            opcode: "setWorldSeed",
            blockType: Scratch.BlockType.COMMAND,
            text: "set world seed to [SEED]",
            arguments: {
              SEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 42 },
            },
          },
          {
            opcode: "movePlayer",
            blockType: Scratch.BlockType.COMMAND,
            text: "move player [DIR]",
            arguments: {
              DIR: { type: Scratch.ArgumentType.STRING, menu: "dirs", defaultValue: "north" },
            },
          },
          {
            opcode: "teleportPlayer",
            blockType: Scratch.BlockType.COMMAND,
            text: "teleport player to x [X] y [Y]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "playerX",
            blockType: Scratch.BlockType.REPORTER,
            text: "player world X",
          },
          {
            opcode: "playerY",
            blockType: Scratch.BlockType.REPORTER,
            text: "player world Y",
          },
          {
            opcode: "biomeHere",
            blockType: Scratch.BlockType.REPORTER,
            text: "biome at player position",
          },
          {
            opcode: "biomeAt",
            blockType: Scratch.BlockType.REPORTER,
            text: "biome at x [X] y [Y]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
            },
          },
          {
            opcode: "visitTile",
            blockType: Scratch.BlockType.COMMAND,
            text: "mark tile x [X] y [Y] as visited",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "isTileVisited",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "tile x [X] y [Y] is visited",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "setTileNote",
            blockType: Scratch.BlockType.COMMAND,
            text: "set note at x [X] y [Y] to [NOTE]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              NOTE: { type: Scratch.ArgumentType.STRING, defaultValue: "town" },
            },
          },
          {
            opcode: "getTileNote",
            blockType: Scratch.BlockType.REPORTER,
            text: "note at x [X] y [Y]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "distanceTo",
            blockType: Scratch.BlockType.REPORTER,
            text: "world distance from player to x [X] y [Y]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
            },
          },
          {
            opcode: "visitedCount",
            blockType: Scratch.BlockType.REPORTER,
            text: "number of visited tiles",
          },

          // ══════════════════════════════════════════════════
          // 📅 TIME & CALENDAR
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "📅 Time & Calendar" },

          {
            opcode: "tickTime",
            blockType: Scratch.BlockType.COMMAND,
            text: "advance time by [MINS] minutes",
            arguments: {
              MINS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 },
            },
          },
          {
            opcode: "setTimeSpeed",
            blockType: Scratch.BlockType.COMMAND,
            text: "set time speed to [SPD] (minutes per tick)",
            arguments: {
              SPD: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "getCalendar",
            blockType: Scratch.BlockType.REPORTER,
            text: "calendar [PART]",
            arguments: {
              PART: { type: Scratch.ArgumentType.STRING, menu: "calParts", defaultValue: "day" },
            },
          },
          {
            opcode: "dayName",
            blockType: Scratch.BlockType.REPORTER,
            text: "name of current day",
          },
          {
            opcode: "monthName",
            blockType: Scratch.BlockType.REPORTER,
            text: "name of current month",
          },
          {
            opcode: "timeOfDay",
            blockType: Scratch.BlockType.REPORTER,
            text: "time of day (HH:MM)",
          },
          {
            opcode: "isDaytime",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is daytime",
          },
          {
            opcode: "setCalendar",
            blockType: Scratch.BlockType.COMMAND,
            text: "set calendar day [D] month [M] year [Y] hour [H] minute [MIN]",
            arguments: {
              D: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              M: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 8 },
              MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "totalDays",
            blockType: Scratch.BlockType.REPORTER,
            text: "total days elapsed",
          },
          {
            opcode: "season",
            blockType: Scratch.BlockType.REPORTER,
            text: "current season",
          },

          // ══════════════════════════════════════════════════
          // 🎲 RNG & PROBABILITY
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "🎲 RNG & Probability" },

          {
            opcode: "setSeed",
            blockType: Scratch.BlockType.COMMAND,
            text: "set RNG seed to [SEED]",
            arguments: {
              SEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1337 },
            },
          },
          {
            opcode: "seededInt",
            blockType: Scratch.BlockType.REPORTER,
            text: "seeded random int [MIN] to [MAX]",
            arguments: {
              MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
            },
          },
          {
            opcode: "seededFloat",
            blockType: Scratch.BlockType.REPORTER,
            text: "seeded random float [MIN] to [MAX] decimals [DEC]",
            arguments: {
              MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              DEC: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
            },
          },
          {
            opcode: "rollDice",
            blockType: Scratch.BlockType.REPORTER,
            text: "roll [N]d[SIDES]",
            arguments: {
              N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              SIDES: { type: Scratch.ArgumentType.NUMBER, defaultValue: 6 },
            },
          },
          {
            opcode: "percentChance",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[PCT]% chance",
            arguments: {
              PCT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
            },
          },
          {
            opcode: "weightedPick",
            blockType: Scratch.BlockType.REPORTER,
            text: "pick from [ITEMS] with weights [WEIGHTS]",
            arguments: {
              ITEMS: { type: Scratch.ArgumentType.STRING, defaultValue: "sword,shield,potion" },
              WEIGHTS: { type: Scratch.ArgumentType.STRING, defaultValue: "1,2,5" },
            },
          },
          {
            opcode: "shuffleList",
            blockType: Scratch.BlockType.REPORTER,
            text: "shuffle items [ITEMS] (comma-separated)",
            arguments: {
              ITEMS: { type: Scratch.ArgumentType.STRING, defaultValue: "a,b,c,d" },
            },
          },
          {
            opcode: "lootTable",
            blockType: Scratch.BlockType.REPORTER,
            text: "loot from table [TABLE] at luck [LUCK]",
            arguments: {
              TABLE: { type: Scratch.ArgumentType.STRING, defaultValue: "common:50,rare:30,epic:15,legendary:5" },
              LUCK: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "normalRand",
            blockType: Scratch.BlockType.REPORTER,
            text: "gaussian random mean [MU] stddev [SD]",
            arguments: {
              MU: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SD: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },

          // ══════════════════════════════════════════════════
          // 💾 DATA — IMPORT / EXPORT .SEF
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "💾 Data & .SEF Files" },

          {
            opcode: "exportSEF",
            blockType: Scratch.BlockType.COMMAND,
            text: "export all data as .sef file named [FNAME]",
            arguments: {
              FNAME: { type: Scratch.ArgumentType.STRING, defaultValue: "savegame" },
            },
          },
          {
            opcode: "importSEF",
            blockType: Scratch.BlockType.COMMAND,
            text: "import .sef file (opens file picker)",
          },
          {
            opcode: "exportSection",
            blockType: Scratch.BlockType.COMMAND,
            text: "export only [SECTION] data as .sef named [FNAME]",
            arguments: {
              SECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "sections",
                defaultValue: "inventory",
              },
              FNAME: { type: Scratch.ArgumentType.STRING, defaultValue: "export" },
            },
          },
          {
            opcode: "sefToJSON",
            blockType: Scratch.BlockType.REPORTER,
            text: "current data as SEF JSON string",
          },
          {
            opcode: "loadSEFFromString",
            blockType: Scratch.BlockType.COMMAND,
            text: "load SEF from JSON string [JSON]",
            arguments: {
              JSON: { type: Scratch.ArgumentType.STRING, defaultValue: "{}" },
            },
          },
          {
            opcode: "logEvent",
            blockType: Scratch.BlockType.COMMAND,
            text: "log event [MSG]",
            arguments: {
              MSG: { type: Scratch.ArgumentType.STRING, defaultValue: "Player entered dungeon" },
            },
          },
          {
            opcode: "lastEvent",
            blockType: Scratch.BlockType.REPORTER,
            text: "last logged event",
          },
          {
            opcode: "eventCount",
            blockType: Scratch.BlockType.REPORTER,
            text: "total logged events",
          },
          {
            opcode: "clearLog",
            blockType: Scratch.BlockType.COMMAND,
            text: "clear event log",
          },

          // ══════════════════════════════════════════════════
          // 🤝 FACTIONS
          // ══════════════════════════════════════════════════
          { blockType: Scratch.BlockType.LABEL, text: "🤝 Factions" },

          {
            opcode: "setRep",
            blockType: Scratch.BlockType.COMMAND,
            text: "set reputation with [FAC] to [VAL]",
            arguments: {
              FAC: { type: Scratch.ArgumentType.STRING, defaultValue: "Guild" },
              VAL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "changeRep",
            blockType: Scratch.BlockType.COMMAND,
            text: "change reputation with [FAC] by [DELTA]",
            arguments: {
              FAC: { type: Scratch.ArgumentType.STRING, defaultValue: "Guild" },
              DELTA: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
            },
          },
          {
            opcode: "getRep",
            blockType: Scratch.BlockType.REPORTER,
            text: "reputation with [FAC]",
            arguments: {
              FAC: { type: Scratch.ArgumentType.STRING, defaultValue: "Guild" },
            },
          },
          {
            opcode: "factionRank",
            blockType: Scratch.BlockType.REPORTER,
            text: "rank with [FAC]",
            arguments: {
              FAC: { type: Scratch.ArgumentType.STRING, defaultValue: "Guild" },
            },
          },
        ],

        menus: {
          itemProps: {
            acceptReporters: true,
            items: ["name", "type", "value", "weight"],
          },
          dirs: {
            acceptReporters: true,
            items: ["north", "south", "east", "west"],
          },
          calParts: {
            acceptReporters: true,
            items: ["day", "month", "year", "hour", "minute"],
          },
          sections: {
            acceptReporters: true,
            items: ["inventory", "items", "stats", "worldmap", "calendar", "factions", "recipes"],
          },
        },
      };
    }

    // ─── 📦 INVENTORY IMPLEMENTATIONS ──────────────────────────────────────
    createInventory({ NAME, SLOTS }) {
      state.inventories[NAME] = { slotCount: Math.max(1, SLOTS | 0), slots: [] };
    }

    addItem({ QTY, ID, NAME }) {
      const inv = getOrCreateInv(NAME);
      const qty = Math.max(0, QTY | 0);
      const idx = findSlot(inv, ID);
      if (idx >= 0) {
        inv.slots[idx].qty += qty;
      } else if (inv.slots.length < inv.slotCount) {
        inv.slots.push({ id: ID, qty });
      }
      log(`Added ${qty}x ${ID} to ${NAME}`);
    }

    removeItem({ QTY, ID, NAME }) {
      const inv = getOrCreateInv(NAME);
      const qty = Math.max(0, QTY | 0);
      const idx = findSlot(inv, ID);
      if (idx < 0) return;
      inv.slots[idx].qty -= qty;
      if (inv.slots[idx].qty <= 0) inv.slots.splice(idx, 1);
    }

    itemCount({ ID, NAME }) {
      const inv = getOrCreateInv(NAME);
      const idx = findSlot(inv, ID);
      return idx >= 0 ? inv.slots[idx].qty : 0;
    }

    hasItem({ NAME, QTY, ID }) {
      return this.itemCount({ ID, NAME }) >= (QTY | 0);
    }

    slotItem({ SLOT, NAME }) {
      const inv = getOrCreateInv(NAME);
      const s = inv.slots[(SLOT | 0) - 1];
      return s ? s.id : "";
    }

    slotQty({ SLOT, NAME }) {
      const inv = getOrCreateInv(NAME);
      const s = inv.slots[(SLOT | 0) - 1];
      return s ? s.qty : 0;
    }

    usedSlots({ NAME }) {
      return getOrCreateInv(NAME).slots.length;
    }

    freeSlots({ NAME }) {
      const inv = getOrCreateInv(NAME);
      return inv.slotCount - inv.slots.length;
    }

    clearInventory({ NAME }) {
      getOrCreateInv(NAME).slots = [];
    }

    transferItem({ QTY, ID, FROM, TO }) {
      const count = this.itemCount({ ID, NAME: FROM });
      const actual = Math.min(count, QTY | 0);
      if (actual <= 0) return;
      this.removeItem({ QTY: actual, ID, NAME: FROM });
      this.addItem({ QTY: actual, ID, NAME: TO });
    }

    totalWeight({ NAME }) {
      const inv = getOrCreateInv(NAME);
      return inv.slots.reduce((sum, s) => {
        const item = state.items[s.id];
        return sum + (item ? item.weight * s.qty : 0);
      }, 0).toFixed(2);
    }

    inventoryAsJSON({ NAME }) {
      return JSON.stringify(getOrCreateInv(NAME));
    }

    // ─── ⚔️ ITEMS & STATS IMPLEMENTATIONS ─────────────────────────────────
    defineItem({ ID, NAME, TYPE, VAL, W }) {
      state.items[ID] = { name: NAME, type: TYPE, value: +VAL, weight: +W, tags: {} };
    }

    itemProperty({ ID, PROP }) {
      const item = state.items[ID];
      if (!item) return "";
      return item[PROP] !== undefined ? item[PROP] : "";
    }

    tagItem({ ID, TAG, VAL }) {
      if (!state.items[ID]) state.items[ID] = { name: ID, type: "misc", value: 0, weight: 0, tags: {} };
      state.items[ID].tags[TAG] = VAL;
    }

    itemTag({ TAG, ID }) {
      const item = state.items[ID];
      return item ? (item.tags[TAG] ?? "") : "";
    }

    setStat({ STAT, VAL }) {
      state.stats[STAT] = +VAL;
    }

    changeStat({ STAT, DELTA }) {
      state.stats[STAT] = (state.stats[STAT] ?? 0) + +DELTA;
    }

    getStat({ STAT }) {
      return state.stats[STAT] ?? 0;
    }

    clampStat({ STAT, MIN, MAX }) {
      state.stats[STAT] = Math.min(+MAX, Math.max(+MIN, state.stats[STAT] ?? 0));
    }

    defineRecipe({ ID, INPUTS, OUTID, QTY }) {
      const inputs = INPUTS.split(",").map((s) => {
        const [id, q] = s.trim().split(":");
        return { id, qty: +(q || 1) };
      });
      state.recipes[ID] = { inputs, output: { id: OUTID, qty: +(QTY) } };
    }

    canCraft({ ID, INV }) {
      const recipe = state.recipes[ID];
      if (!recipe) return false;
      return recipe.inputs.every((inp) => this.itemCount({ ID: inp.id, NAME: INV }) >= inp.qty);
    }

    craftRecipe({ ID, INV }) {
      if (!this.canCraft({ ID, INV })) return;
      const recipe = state.recipes[ID];
      recipe.inputs.forEach((inp) => this.removeItem({ QTY: inp.qty, ID: inp.id, NAME: INV }));
      this.addItem({ QTY: recipe.output.qty, ID: recipe.output.id, NAME: INV });
      log(`Crafted ${recipe.output.qty}x ${recipe.output.id}`);
    }

    // ─── 🌍 WORLD MAP IMPLEMENTATIONS ─────────────────────────────────────
    setWorldSeed({ SEED }) {
      state.worldSeed = +SEED;
    }

    movePlayer({ DIR }) {
      switch (DIR) {
        case "north": state.playerPos.y++; break;
        case "south": state.playerPos.y--; break;
        case "east":  state.playerPos.x++; break;
        case "west":  state.playerPos.x--; break;
      }
      this.visitTile({ X: state.playerPos.x, Y: state.playerPos.y });
    }

    teleportPlayer({ X, Y }) {
      state.playerPos.x = +X;
      state.playerPos.y = +Y;
      this.visitTile({ X: +X, Y: +Y });
    }

    playerX() { return state.playerPos.x; }
    playerY() { return state.playerPos.y; }

    biomeHere() {
      return biomeAt(state.playerPos.x, state.playerPos.y, state.worldSeed);
    }

    biomeAt({ X, Y }) {
      return biomeAt(+X, +Y, state.worldSeed);
    }

    visitTile({ X, Y }) {
      const key = `${+X},${+Y}`;
      if (!state.worldMap[key]) state.worldMap[key] = {};
      state.worldMap[key].visited = true;
    }

    isTileVisited({ X, Y }) {
      const key = `${+X},${+Y}`;
      return !!(state.worldMap[key] && state.worldMap[key].visited);
    }

    setTileNote({ X, Y, NOTE }) {
      const key = `${+X},${+Y}`;
      if (!state.worldMap[key]) state.worldMap[key] = {};
      state.worldMap[key].notes = NOTE;
    }

    getTileNote({ X, Y }) {
      const key = `${+X},${+Y}`;
      return state.worldMap[key] ? state.worldMap[key].notes ?? "" : "";
    }

    distanceTo({ X, Y }) {
      const dx = +X - state.playerPos.x;
      const dy = +Y - state.playerPos.y;
      return Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10;
    }

    visitedCount() {
      return Object.values(state.worldMap).filter((t) => t.visited).length;
    }

    // ─── 📅 TIME & CALENDAR IMPLEMENTATIONS ────────────────────────────────
    tickTime({ MINS }) {
      let total = state.calendar.minute + state.calendar.hour * 60 + +MINS;
      const MINS_PER_DAY = 60 * 24;
      const DAYS_PER_MONTH = 5;
      const MONTHS_PER_YEAR = 6;

      const extraDays = Math.floor(total / MINS_PER_DAY);
      total %= MINS_PER_DAY;
      state.calendar.hour = Math.floor(total / 60);
      state.calendar.minute = total % 60;

      state.calendar.day += extraDays;
      while (state.calendar.day > DAYS_PER_MONTH) {
        state.calendar.day -= DAYS_PER_MONTH;
        state.calendar.month++;
        if (state.calendar.month > MONTHS_PER_YEAR) {
          state.calendar.month = 1;
          state.calendar.year++;
        }
      }
    }

    setTimeSpeed({ SPD }) {
      state.calendar.speed = +SPD;
    }

    getCalendar({ PART }) {
      return state.calendar[PART] ?? 0;
    }

    dayName() {
      const d = (state.calendar.day - 1) % DAY_NAMES.length;
      return DAY_NAMES[d];
    }

    monthName() {
      return MONTH_NAMES[(state.calendar.month - 1) % MONTH_NAMES.length];
    }

    timeOfDay() {
      const h = String(state.calendar.hour).padStart(2, "0");
      const m = String(state.calendar.minute).padStart(2, "0");
      return `${h}:${m}`;
    }

    isDaytime() {
      return state.calendar.hour >= 6 && state.calendar.hour < 20;
    }

    setCalendar({ D, M, Y, H, MIN }) {
      state.calendar = { day: +D, month: +M, year: +Y, hour: +H, minute: +MIN, speed: state.calendar.speed };
    }

    totalDays() {
      return (state.calendar.year - 1) * 30 + (state.calendar.month - 1) * 5 + state.calendar.day;
    }

    season() {
      const m = state.calendar.month;
      if (m <= 1) return "Spring";
      if (m <= 2) return "Summer";
      if (m <= 4) return "Autumn";
      return "Winter";
    }

    // ─── 🎲 RNG IMPLEMENTATIONS ────────────────────────────────────────────
    setSeed({ SEED }) {
      state.rngSeed = +SEED;
      state.rngState = +SEED;
    }

    seededInt({ MIN, MAX }) {
      const v = seededRand();
      return Math.floor(v * (+MAX - +MIN + 1)) + +MIN;
    }

    seededFloat({ MIN, MAX, DEC }) {
      const v = seededRand();
      const val = v * (+MAX - +MIN) + +MIN;
      return +val.toFixed(Math.min(10, Math.max(0, DEC | 0)));
    }

    rollDice({ N, SIDES }) {
      let total = 0;
      const n = Math.max(1, N | 0);
      const s = Math.max(2, SIDES | 0);
      for (let i = 0; i < n; i++) total += Math.floor(seededRand() * s) + 1;
      return total;
    }

    percentChance({ PCT }) {
      return seededRand() * 100 < +PCT;
    }

    weightedPick({ ITEMS, WEIGHTS }) {
      const items = ITEMS.split(",").map((s) => s.trim());
      const weights = WEIGHTS.split(",").map((s) => +s.trim() || 1);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = seededRand() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    }

    shuffleList({ ITEMS }) {
      const arr = ITEMS.split(",").map((s) => s.trim());
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(seededRand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.join(",");
    }

    lootTable({ TABLE, LUCK }) {
      const entries = TABLE.split(",").map((e) => {
        const [item, w] = e.trim().split(":");
        return { item, w: Math.max(0, +(w || 1) + +LUCK) };
      });
      return this.weightedPick({
        ITEMS: entries.map((e) => e.item).join(","),
        WEIGHTS: entries.map((e) => e.w).join(","),
      });
    }

    normalRand({ MU, SD }) {
      // Box-Muller
      const u1 = seededRand() || 1e-10;
      const u2 = seededRand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return +(+MU + +SD * z).toFixed(4);
    }

    // ─── 💾 DATA / SEF IMPLEMENTATIONS ────────────────────────────────────
    _buildSEF(section) {
      const pkg = {
        _sef_version: "1.0",
        _created: new Date().toISOString(),
        _extension: "inventoryworld",
      };
      const all = {
        inventory: state.inventories,
        items: state.items,
        stats: state.stats,
        worldmap: state.worldMap,
        calendar: state.calendar,
        factions: state.factions,
        recipes: state.recipes,
      };
      if (section && all[section] !== undefined) {
        pkg[section] = all[section];
      } else {
        Object.assign(pkg, all);
      }
      return JSON.stringify(pkg, null, 2);
    }

    exportSEF({ FNAME }) {
      try {
        const json = this._buildSEF(null);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (FNAME || "savegame") + ".sef";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log(`Exported .sef: ${FNAME}`);
      } catch (e) {
        console.error("[InventoryWorld] Export error:", e);
      }
    }

    importSEF() {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".sef,.json";
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) { resolve(); return; }
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.loadSEFFromString({ JSON: ev.target.result });
            resolve();
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    exportSection({ SECTION, FNAME }) {
      try {
        const json = this._buildSEF(SECTION);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (FNAME || SECTION) + ".sef";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("[InventoryWorld] Export error:", e);
      }
    }

    sefToJSON() {
      return this._buildSEF(null);
    }

    loadSEFFromString({ JSON: jsonStr }) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.inventory !== undefined) state.inventories = data.inventory;
        if (data.items !== undefined) state.items = data.items;
        if (data.stats !== undefined) state.stats = data.stats;
        if (data.worldmap !== undefined) state.worldMap = data.worldmap;
        if (data.calendar !== undefined) state.calendar = { ...state.calendar, ...data.calendar };
        if (data.factions !== undefined) state.factions = data.factions;
        if (data.recipes !== undefined) state.recipes = data.recipes;
        log("SEF data loaded");
      } catch (e) {
        console.error("[InventoryWorld] Import parse error:", e);
      }
    }

    logEvent({ MSG }) { log(MSG); }
    lastEvent() { return state.eventLog.length ? state.eventLog[state.eventLog.length - 1].msg : ""; }
    eventCount() { return state.eventLog.length; }
    clearLog() { state.eventLog = []; }

    // ─── 🤝 FACTION IMPLEMENTATIONS ────────────────────────────────────────
    setRep({ FAC, VAL }) {
      if (!state.factions[FAC]) state.factions[FAC] = { reputation: 0 };
      state.factions[FAC].reputation = +VAL;
    }

    changeRep({ FAC, DELTA }) {
      if (!state.factions[FAC]) state.factions[FAC] = { reputation: 0 };
      state.factions[FAC].reputation += +DELTA;
    }

    getRep({ FAC }) {
      return state.factions[FAC] ? state.factions[FAC].reputation : 0;
    }

    factionRank({ FAC }) {
      const rep = this.getRep({ FAC });
      if (rep >= 500) return "Champion";
      if (rep >= 200) return "Honored";
      if (rep >= 50) return "Friendly";
      if (rep >= -49) return "Neutral";
      if (rep >= -200) return "Unfriendly";
      if (rep >= -500) return "Hostile";
      return "Nemesis";
    }
  }

  Scratch.extensions.register(new InventoryWorldExtension());
})(Scratch);
