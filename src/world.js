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

    { metal: n(50).l(0).er(2), rock: n(100).l(0) },
    { metal: n(25).l(0).er(2), rock: n(50).l(0) },
    
    { 
        name: 'Ariceli', 
        happiness: n(0).l(0).u(100), 
        energy: n(20).l(0).u(100).er(5) 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(0).u(100), 
        energy: n(35).l(0).u(100).er(5) 
    },

    // world will be recursed.  
    // input/output objects will be identified
    // inputs and outputs will 'catch' other world objects
    // the objects will be processed according to the throughput
    { 
        name: 'industry',
        inputs: {
            mine: ['metal','rock'],
            battery: 'energy'
        },
        outputs: {
            person: 'happiness'
        },
        throughput: (mine,battery,person) => {

            let possibleImprovement = person.happiness.upper - person.happiness.value;

            // max metal due to improvement cap: metal = (posi - energy) / 2
            // max energy due to improvement cap: energy = posi - (metal * 2)

            // extract according to the limits of the core equation below
            let metal = mine.metal.extract(battery.energy * 2);
            let energy = battery.energy.extract(mine.metal / 2);

            // The core equation.
            person.happiness.deposit((metal * 2) + energy);

        }
    }

]);


for(let member of world) {

}