import bnm from './boundNumberMaker.js';

let time = { 
    previous: null, 
    current: 0, 
    change: null,
    tick: function(increment = 1) {
        let _current = this.current + increment;
        this.previous = current;
        this.current = _current;
        this.change = this.current - this.previous;
    }
};

let world = [];
let n = bnm(time);

world.push(...[

    { concept: 'mine', keys: ['metal','rock'] },
    { concept: 'person', keys: ['happiness'] },
    { concept: 'battery', keys: ['energy'] },

    { metal: n(50).l(0), rock: n(100).l(0) },
    { metal: n(25).l(0), rock: n(50).l(0) },
    
    { 
        name: 'Ariceli', 
        happiness: n(0).l(0).u(100), 
        energy: n(20).l(0).u(100) 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(0).u(100), 
        energy: n(35).l(0).u(100) 
    },

    // A computer requires 2 parts metal and 1 part energy
    // This serves to demonstrate 'conversion'
    function makeComputers (mine,battery) {

        // extract according to the limits of the core equation below
        let metal = mine.metal.extract(battery.energy * 2);
        let energy = battery.energy.extract(mine.metal / 2);

        // The core equation.
        world.push({ computers: (metal * 2) + energy });

    }

]);


