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

        let _metal = mine.metal;
        let _energy = energy.energy;

        // find out which will have excess, and cap it
        // so that only what is needed is taken.
        if (_metal > _energy * 2) 
            _metal = _energy * 2; 
        else if (_energy > _metal / 2)
            _energy = _metal / 2;

        // The core equation.
        let computers = (_metal * 2) + _energy; 

        // make the transfers and new objects
        mine.metal -= _metal;
        energy.energy -+ _energy;
        world.push({ computers: computers });

    }}

]);


