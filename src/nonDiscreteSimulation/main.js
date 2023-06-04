let n = require('./boundNumber').n;
let world = require('./world.js');

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
        energy: n(20).l(0).u(100).f('5t') 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(-100).u(100).f('5t'), 
        energy: n(35).l(0).u(100).f('5t') 
    }, 

    { name: 'dummy2' }

];

let relations = [
    '2*happiness <- metal^2 + 2*energy',
    '-0.25*happiness <- 0.5*rock',
    '1.5*rock <- 7*metal + energy' 
]

// TODO: Uncatch some properties.  
//  - For each variable, uncatch any properties with a firstEscape = 0.
//  - If any variable no longer has caught properties, the whole merged relation cannot be activated.
//  - Else, find the global firstEscape, use that as the time to move forward.
//  - Start focusing on how to move forward by transferring value between properties.
// TODO: Different values and constraints on metal cannot force a firstEscape <> infinity.  
//  - Instead, it just changes the first escape of happiness.  Why?
// TODO: I don't think when we uncatch properties we kill the whole merged relation.
//  - Perhaps we just set flow rates to 0 and reprocess? 
let w = new world(entities, relations)

w.log('Elements before tick');

w.tick()
w.log('Elements after tick');

w.tick()
w.log('Elements after tick2');

w.tick()
w.log('Elements after tick3');

// I think it's going to be important to better apply a '+' or '-' to 
// a propName.  That's may be hard if the '-' isn't right next to the
// variable name.  So we may have to require the negative be right next
// to the variable or a special relation name be used to identify 
// deposit or extraction.  So '3(-x)' or '3ext(x)' instead of just '-3x'.
//
// But the pure math may work itself out.  
// -2x = y
// x = -y/2
// If y is positive, x would be negative, and so you would extract from x
//
// Pausing on the above note and focus on getting time funcs.  Just 
// assume extraction of sources and deposits into targets.

// How am I going to resolve things when there are multiple funcs?  I
// don't wan't to do a queue, because that will make it order dependent.
// I think some sort of composition is necessary.  
//
// But I think the composition will be simple.  Add up all the sources
// for the sources.  On the other side, add up all the targets.
//
// relation1 = '2*happiness <- metal^2 + 2*energy'
// relation2 = '7*widgets <- knowledge^2 + 3*tools
// composite = 2*happiness + 7*widgets <- metal^2 + 2*energy + knowledge^2 + 3*tools
//
// One concern is that more complex equations may be too sensitive for the solver.
// Possible that inTermsOf's can be additively composed as well, but I"m not sure

/************************************************************************************************************* */

// TODO: find min escape time of all caughts.
// Increment t by that time.
// Then find out how to make appropriate withdrawals and deposits.
//console.log(wfp.func);
//console.log([...wfp.caughts].map(c => c.firstEscape));


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