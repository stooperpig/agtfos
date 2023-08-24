console.log('Running dummy.js');

const crew = ["1st-Officer", "Captain-Yid", "Comm-Officer", "Cook", "Coxswain", "Doc",
    "Engineer", "Engineer-Officer", "Machinist", "Marine", "Marine2", "Mascot", "Medic", "Ops-Officer",
    "Pilot", "Pilot2", "Robot", "Sarge", "Sparks", "Supply-Officer", "Tech", "Yeoman"
];

const weapons = [
    { name: "BottleOfAcid", count: 3 },
    { name: "CannisterOfZgwortz", count: 3 },
    { name: "CommBeamer", count: 2 },
    { name: "ElectricFence", count: 2 },
    { name: "FireExtinguisher", count: 2 },
    { name: "GasGrenade", count: 3 },
    { name: "Hypodermic", count: 2 },
    { name: "Knife", count: 3 },
    { name: "PoolStick", count: 2 },
    { name: "RocketFuel", count: 3 },
    { name: "StunPistol", count: 2 },
    { name: "WeldingTorch", count: 2 }
]

const dumpStacks = () => {
    const stacks = {};

    for (let i = 1; i < 46; ++i) {
        for (let j = 1; j < 3; ++j) {
            let stack = {
                id: `${i}-${j}`,
                locationId: `${i}`,
                counterIds: []
            }
            stacks[`${i}-${j}`] = stack;
        }
    }

    console.log(JSON.stringify(stacks));
}

let counterCount = 0;

const dumpCounters = () => {
    const counters = {};
    for (let i = 0; i < crew.length; ++i) {
        const counter = {
            id: `${counterCount}`,
            name: crew[i],
            type: 'CREW',
            state: 'NORMAL',
            weapon: null,
            movementAllowance: 0,
            attackDice: 0,
            constitution: 0,
            imageName: `${crew[i]}`
        }

        counters[`${counterCount}`] = counter;
        ++counterCount;
    }

    for (let i = 0; i < weapons.length; ++i) {
        for (let j = 0; j < weapons[i].count; ++j) {
            const counter = {
                id: `${counterCount}`,
                name: weapons[i].name,
                type: 'WEAPON',
                state: 'NORMAL',
                weapon: null,
                movementAllowance: 0,
                attackDice: 0,
                constitution: 0,
                imageName: `${weapons[i].name}`
            }

            counters[`${counterCount}`] = counter;
            ++counterCount;
        }
    }

    console.log(JSON.stringify(counters))
}

const dumpImageMap = () => {
    const imageMap = {};

    for(let i = 0; i < crew.length; ++i) {
        let image = {
            src:`/images/${crew[i]}.png`
        }

        imageMap[crew[i]] = image;
    }

    for(let i = 0; i < weapons.length; ++i) {
        let image = {
            src:`/images/${weapons[i].name}.png`
        }

        imageMap[weapons[i].name] = image;
    }

    console.log(JSON.stringify(imageMap));
}

dumpImageMap();