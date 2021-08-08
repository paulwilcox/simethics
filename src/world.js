import bn from './boundNumber.js';

let time = 0;
let world = [];

world.push(...[

    { concept: 'mine', keys: ['metal','rock'] },
    { concept: 'person', keys: ['happiness'] },
    { concept: 'battery', keys: ['energy'] },

    { metal: bn(50,0), rock: bn(100,0) },
    { metal: bn(25,0), rock: bn(50,0) },
    
    { name: 'Ariceli', happiness: bn(0,0,100), energy: bn(20,0,100) },
    { name: 'Aaron', happiness: bn(0,0,100), energy: bn(35,0,100) },

    // Converter: A computer requires 2 parts metal and 1 part energy
    function computerFactory (mine,battery) {

        // extract according to the limits of the core equation below
        let metal = mine.metal.extract(battery.energy * 2);
        let energy = battery.energy.extract(mine.metal / 2);

        // The core equation.
        let computers = (metal * 2) + energy; 

        // make the transfers and new objects
        world.push({ computers: computers });

    }

]);


