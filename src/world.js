let bnm = require('./boundNumberMaker.js');
let algebra = require('algebra.js');

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
    }

]);

let equation = algebra.parse('metal * 2 + energy = happiness + zero');


console.log(
    equation.solveFor('zero').toString()
);

return;

/*

Problem: 
    - I don't think I"m on the right track.  What if the 
      equation were parabolic or sinusoidal. Then the 
      extremes of metal and energy will not be where the
      boundaries are broken. 

TODO: With respect to the bottlenecks ...
    - Consider two targets, 
    - Consider three sources
    - Consider same substance in both source and target

Core equation:

    happiness := metal * 2 + energy

    - I use ':=' to signify directionality.  
    - Happiness is the target
    - Metal and energy are the sources.

'Captured' entities:

    - Target: Person (because it has happiness)
    - Source: Mine (because it has metal)
    - Source: Battery (because it has energy)

Equation output must be between what target entity can loose and what it can accept:

    prsHappiness - prsHappinessMin <= happiness <= prsHappinessMax - prsHappiness

Equation input coefficients must be between what source entities can accept or loose:

    mineMetalMax - mineMetal <= metal <= mineMetal - mineMetalMin  
    batEnergyMax - batEnergy <= energy <= batEnergy - batEnergyMin

    - Note that the direction changes between target bounds and source bounds

Bottlenecks:

    These have to be met:
        
        metal = energy * 2 
        energy = metal / 2

    Here, the 'motivator' is happiness.  Let's call metal and energy neutral in motivation 
    for these purposes.  So if happiness want's to maximize, metal and energy are at it's 
    service.  So, take the boundaries processed above and narrow them further where 
    necessary:

        batEnergyMin * 2 <= mineMetal <= batEnergyMax * 2
        mineMetalMax / 2 <= batEnergy <= mineMetalMax / 2

*/
