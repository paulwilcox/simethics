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
    // world objects will be 'caught' based on properties
    // the objects will be processed according to the throughput
    { 
        name: 'industry',
        catch: {
            mine: ['metal','rock'],
            battery: 'energy',
            person: 'happiness'
        },
        throughput: (mine,battery,person) => {

            // max amount happiness can improve
            let hapPossImprov = person.happiness.upper - person.happiness.value;

            // extract according to the limits of the core equation below
            let metal = mine.metal.extract(Math.min(
                battery.energy.value * 2, // max posible due to energy bottleneck
                (hapPossImprov - battery.energy.value) / 2 // max possible due to happinees cap 
            ));
            
            let energy = battery.energy.extract(Math.min(
                mine.metal.value / 2, // max possible due to metal bottleneck
                hapPossImprov - (mine.metal.value * 2) // max possible due to happiness cap
            ));

            // The core equation.
            person.happiness.deposit((metal * 2) + energy);

        }
    }

]);

/*

    - A tree representation may be unavoidable.
    - Is there an algorithm to get all possibe constraints?

    & (
        = (
            + (
                *(metal.t0,2),
                energy.t0
            ),
            happiness.t1
        },
        metal.t1 >= 0,
        energy.t1 >= 0,
        happiness.t1 <= 100
    )


*/