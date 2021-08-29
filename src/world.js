let bnm = require('./boundNumberMaker.js');
let nerdamer = require('nerdamer');
require('../node_modules/nerdamer/Algebra.js');
require('../node_modules/nerdamer/Calculus.js');
require('../node_modules/nerdamer/Solve.js');

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

    { metal: n(50).l(0).f('2t'), rock: n(100).l(0) },
    { metal: n(25).l(0).f('2t'), rock: n(50).l(0) },
    
    { 
        name: 'Ariceli', 
        happiness: n(0).l(0).u(100), 
        energy: n(20).l(0).u(100).f('5t') 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(0).u(100), 
        energy: n(35).l(0).u(100).f('5t') 
    }, 

    { name: 'dummy' }

]);

function catchFromFunc(func) {

    let [ sources, targets ] = 
        func.includes('<-') ? func.split('<-').reverse()
        : func.includes('->') ? func.split('->')
        : null;

    let propFinder = /[A-Z,a-z,_]+/g;
    let props = [
        ...sources.match(propFinder).map(propName => ({ type: 'source', propName })),
        ...targets.match(propFinder).map(propName => ({ type: 'target', propName }))
    ];

    let caughts = new Set();

    for (let p of props)
    for (let w of world) 
        if (w[p.propName] !== undefined)
            caughts.add({ 
                ...p, 
                caught: w, 
                prop: w[p.propName]
            });

    return caughts;

}

let func = 'happiness <- metal^2 + 2*energy';

let caughts = catchFromFunc(func);

// I think it's going to be important to better apply a '+' or '-' to 
// a propName.  That's may be hard if the '-' isn't right next to the
// variable name.  So we may have to require the negative be right next
// to the variable or a special function name be used to identify 
// deposit or extraction.  So '3(-x)' or '3ext(x)' instead of just '-3x'. 
// This may also help with the issue about side of the equation.  So 
// instead of 'y <- x' indicating extract from x and deposit into y, 
// maybe we do 'dep(y) <- ext(x)'.  It's ugly, but may be more workabble.

let result = 
    caughts
    .map(c => ({
        ...c,
        flowRate = 
            c.caught.flowRate === undefined ? ''
            c.type c.caught.flowRate
    }))

console.log(result);

return;


function getBoundaryTimes (
    timeExpression, // the time (t) based expression
    boundary, // the constraint value
    boundaryType // 'min' or 'max'
) {

    let derivative = nerdamer(`diff( ${timeExpression}, t )`);

    return nerdamer(`${timeExpression} = ${boundary}`)
        .solveFor('t')
        .map(solved => {
            let _ = {};
            _.equation = `${timeExpression} = ${boundary}`,
            _.t = nerdamer(solved).evaluate();
            _.derivative = derivative.evaluate({t: _.t});
            _.t = parseFloat(_.t.toDecimal());
            _.derivative = parseFloat(_.derivative.toDecimal());
            // as in: does it escape the bounds?
            _.isEscape = boundaryType == 'min' ? _.derivative < 0 : _.derivative > 0; 
            return _;
        });

}

console.log(
    getBoundaryTimes(
        timeExpression = '(2*t)^2 + 2*(5*t)', 100, 'max'    
    )
); 


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