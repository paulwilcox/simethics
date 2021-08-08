import bn from './boundNumber.js';

let time = 0;
let world = [];

world.push(...[

    { concept: 'mine', keys: ['metal','rock'] },
    { concept: 'person', keys: ['happiness'] },
    { concept: 'energy', keys: ['energy'] },

    { metal: bn(50,0), rock: 100 },
    { metal: bn(25,0), rock: 50 },
    
    { name: 'Ariceli', happiness: 0, energy: bn(20,0,100) },
    { name: 'Aaron', happiness: 0, energy: bn(35,0,100) },

    // Converter: A computer requires 2 parts metal and 1 part energy
    { func: (mine,energy) => {

        // extract according to the limits of the core equation below
        let _metal = mine.metal.extract(energy.energy * 2);
        let _energy = energy.energy.extract(mine.metal / 2);

        // The core equation.
        let computers = (_metal * 2) + _energy; 

        // make the transfers and new objects
        world.push({ computers: computers });

    }}

]);


