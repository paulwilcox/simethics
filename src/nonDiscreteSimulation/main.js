let n = require('./boundNumber').n;
let world = require('./world.js');
let fd = require('fluent-data');
let solver = require('./solver');
let solution = require('./variableSolution');

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

let entities = [

    { metal: n(50).l(0).f('2t'), rock: n(100).l(0).f('0.5t') },
    { metal: n(25).l(0).f('2t'), rock: n(50).l(0).f('0.5t') },

    { 
        name: 'Ariceli', 
        happiness: n(0).l(-100).u(100).f('10t'), 
        energy: n(20).l(0).u(96).f('4t') 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(-100).u(97).f('5t'), 
        energy: n(35).l(0).u(98).f('6t') 
    }, 

    { name: 'dummy2' }

];

let relations = [
    '2*happiness <- metal^2 + 2*energy',
    '-0.25*happiness <- 0.5*rock',
    '1.5*rock <- 7*metal + energy' 
]

let w = new world(entities, relations)

let result = 
    solver(w.masterRelation.replace('->', '='))
    .solveFor('rock')
    .get()

console.log(w.masterRelation.replace('->', '='));
console.log(result);

    /*
    .map(f => {
        let _solution = new solution(); 
        _solution.algebraic = `${name} = ${f}`;
        return _solution;
    })*/

// return;
w.log();
w.logSolutions();
w.tick().log();

/*

TODO:

Mater relation:

    ( metal^2 + 2*energy) + ( 0.5*rock) + ( 7*metal + energy) -> (2*happiness ) + (-0.25*happiness ) + (1.5*rock )
    ( metal^2 + 2*energy) + ( 0.5*rock) + ( 7*metal + energy) = (2*happiness ) + (-0.25*happiness ) + (1.5*rock )

Solve for rock:
    ( metal^2 + 2*energy) + ( 7*metal + energy) = (2*happiness ) + (-0.25*happiness ) + rock
    ( metal^2 + 2*energy) + ( 7*metal + energy) = (7/4)*happiness + rock
    metal^2 + 2*energy + 7*metal + energy = (7/4)*happiness + rock
    metal^2 + 3*energy + 7*metal = (7/4)*happiness + rock
    3*energy + 7*metal + metal^2 = (7/4)*happiness + rock
    -(7/4)*happiness+3*energy + 7*metal + metal^2 = rock
    rock = -(7/4)*happiness+3*energy + 7*metal + metal^2
    
Simethics is showing: 
  rock = (-7/4)*happiness+3*energy+7*metal+metal^2

Algebraic variable substitutions (not yet doing 'rock', look good);
Splitting the solved-for variable into components and subtracting the other looks good,
    0.5t = (-7/4)*((10t)+(5t))+3*((4t)+(6t))+7*((2t)+(2t))+((2t)+(2t))^2 - ((0.5t))
    Though for debug purposes it may be helpful to replace the unused left part
    newRockVal = (-7/4)*((10t)+(5t))+3*((4t)+(6t))+7*((2t)+(2t))+((2t)+(2t))^2 - ((0.5t))

Time ticked should have been 2.1269 because happiness stopped it (correctly or not)
    rockValChange = (-7/4)*((10t)+(5t))+3*((4t)+(6t))+7*((2t)+(2t))+((2t)+(2t))^2 - ((0.5t))
    rockValChange = 138.84488276 (desmos)
    hmm, simethics is showing 1.0634 for both rocks.  And they started at different values (100, 50)
    I seem to not actually be using this though to change the rate.  I'm using boundnumber flow rate.
    I think this isn't accounting for the larger relations (which can feed back into it)

So implment the solution.  But uh-oh, there can be multiple.
    - Pick the solution with the latest escape time.  
Also, I don't think I'm properly using isSource and isTarget




*/


/************************************************************************************************************* */

/*

    'what a user would plug in'

        happiness <- metal^2 + 2*energy

    'The naive equations.'
    'Not considering boundary conditions.'

        metal.extract(t)      = metal.er * t
                              = 2*t

        energy.extract(t)     = energy.er * t
                              = 5*t

        metal.remain(t)       = metal(0) - metal.extract(t)    
                              = 50 - 2*t
        
        energy.remain(t)      = energy(0) - energy.extract(t)  
                              = 20 - 5*t

        happiness.deposit(t)  = metal.extract(t)^2 + 2*energy.extract(t)
                              = (2*t)^2 + 2*(5*t)

        happiness.remain(t)   = happiness(0) + happiness.deposit(t)
                              = 0 + (2*t)^2 + 2*(5*t)

------------------------

    'Which element will reach its limit first?'

        metal.remain(t) = metal.min
        50 - 2*t        = 0
        -2*t            = -50
        t               = 25
        
        energy.remain(t) = energy.min
        20 - 5*t         = 0
        -5*t             = -20
        t                = 4
        
        happiness(t)      = happiness.min
        (2*t)^2 + 2*(5*t) = 0
        t                 = -2.5 or 0 'from algebra.equation.solveFor'
        
        happiness(t) = happiness.max
        (2*t)^2 + 2*(5*t) = 100
        t                 = -6.40388 or 3.90388 'from algebra.equation.solveFor'

    'Lowest t of all these is negative.'
    'But time will never be negative, so we can discard it.'

    'Lowest non-negative is 0.'
    'But 0 is okay, just < 0 is not.  We start at 0 and go up so we're good.'
    'Lowest after that is 3.90388, where happiness hits 100.'

    'So 3.90388, is the next event.'
    'We would tick t by 3.90388, remove this object from being "catchable", and repeat the process.'
    
    'One task is to be able to identify when an equation solution'
    'hits a boundary but does not exceed it.'
    

*/