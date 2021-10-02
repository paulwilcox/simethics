let bnm = require('./boundNumberMaker.js');
let fd = require('fluent-data');
let solver = require('./solver.js');

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

    { metal: n(50).l(0).f('2t'), rock: n(100).l(0).f('0.5t') },
    { metal: n(25).l(0).f('2t'), rock: n(50).l(0).f('0.5t') },
    
    { 
        name: 'Ariceli', 
        happiness: n(0).l(-100).u(100).f('10t'), 
        energy: n(20).l(0).u(100).f('5t') 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(-100).u(100).f('10t'), 
        energy: n(35).l(0).u(100).f('5t') 
    }, 

    { name: 'dummy2' }

]);

// I think it's going to be important to better apply a '+' or '-' to 
// a propName.  That's may be hard if the '-' isn't right next to the
// variable name.  So we may have to require the negative be right next
// to the variable or a special function name be used to identify 
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
// func1 = '2*happiness <- metal^2 + 2*energy'
// func2 = '7*widgets <- knowledge^2 + 3*tools
// composite = 2*happiness + 7*widgets <- metal^2 + 2*energy + knowledge^2 + 3*tools
//
// One concern is that more complex equations may be too sensitive for the solver.
// Possible that inTermsOf's can be additively composed as well, but I"m not sure


class worldFunctionProcessor {

    constructor(
        world,
        worldFuncs // an array of directional functions (eg. 'w + x <- y + z'
    ) {

        this.world = world;

        let merged = this.mergeFunctions(worldFuncs);
        this.func = merged.func;
        this.sources = merged.sources;
        this.targets = merged.targets;

        this.caughts = this.catchProperties();
        this.setFlowAndRemainFuncs();
        this.applyTimeSubstitutions();
        this.calculateFirstEscapes();

    }

    mergeFunctions(funcs) {

        let sources = [];
        let targets = [];

        for (let func of funcs) {
            let parts = this.splitFuncToSourceAndTarget(func);
            sources.push(`(${parts.sources})`);
            targets.push(`(${parts.targets})`);
        }
        
        return {
            func: sources.join(' + ') + ' <- ' + targets.join(' + '),
            sources,
            targets
        };

    }

    catchProperties() {

        let propFinder = /[A-Z,a-z,_]+/g;
        let props = [
            ...this.sources.map(src => ({ type: 'source', propName: src.match(propFinder) })),
            ...this.targets.map(trg => ({ type: 'target', propName: trg.match(propFinder) }))
        ];

        let caughts = new Set();

        for (let p of props)
        for (let w of this.world) 
            if (w[p.propName] !== undefined)
                caughts.add({ 
                    ...p, 
                    getCaughtObj: () => w, 
                    getCaughtProp: () => w[p.propName]
                });

        return [...caughts];

    }

    // Stage 1: establish flowFuncs (stabilized flowRates) and remainFuncs
    setFlowAndRemainFuncs () {
        for (let c of this.caughts) {

            let prop = c.getCaughtProp();

            c.flowFunc = prop.flowRate || prop.value.toString();

            if (c.type == 'source') {
                c.remainFunc = prop.value.toString();
                if (prop.flowRate !== undefined) 
                    c.remainFunc += ' - ' + prop.flowRate;
            }

        }
    }

    // Stage 2: Establish 'inTermsOf' equations by substituting the time 
    // equations for all variables with their time-based equivalents, save
    // the given caught object, which you're trying to solve for.  
    applyTimeSubstitutions () {

        let sources = this.sources.join(' + ');
        let targets = this.targets.join(' + ');    

console.log({sources, targets})

        for (let c of this.caughts) {

            let timeSubstitutions = 
                fd(this.caughts)
                .group(c2 => ({  
                    type: c2.type, 
                    propName: c2.propName 
                })) 
                .reduce(({ // combine caughts within type/propNames via '+'
                    type: fd.first(c2 => c2.type),
                    propName: fd.first(c2 => c2.propName),
                    part: (agg,next) => 
                        agg + 
                        (agg == '' ? '' : ' + ') +
                        (c === next ? c.propName : next.flowFunc), 
                    ['part.seed']: ''
                }))
                .map(p => ({ // add parens around type/propName substitutions 
                    type: p.type,
                    propName: p.propName, 
                    part: `(${p.part})`
                })) 
                .get();
    
            for (let timeSub of timeSubstitutions) {
                let propRx = new RegExp(timeSub.propName,'ig');
                if (timeSub.type == 'source')
                    sources = sources.replace(propRx, timeSub.part);
                else if (timeSub.type == 'target')
                    targets = targets.replace(propRx, timeSub.part);
            }

            c.timeSubstitutions = `${sources} = ${targets}`;

// TODO: Lots of repeats.  Definite chance to increase performance
//console.log(c.timeSubstitutions);

        }

    }

    calculateFirstEscapes() {

        for (let c of this.caughts) {

            // This can have more than one solution.  
            c.timeFuncs = 
                solver(c.timeSubstitutions)
                .solveFor(c.propName)
                .get()
                .map(tf => tf.toString());

            // Of the c.timeFuncs, get the earliest times value escapes caught boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            let tfFirstEscapes = 
                c.timeFuncs
                .map(tf => this.getFirstEscape(tf, c.getCaughtProp()))
                .filter(fe => fe != 0);

            // Of the applicable solutions, find the earliest escape time.
            // If no solutions are applicable, set the earliest escape time to 0.
            let tfFirstEscape = 
                tfFirstEscapes.length == 0 ? 0 : Math.min(...tfFirstEscapes);

            // boundaries imposed by the giving object
            let remainFirstEscape =     
                c.remainFunc 
                ? this.getFirstEscape(c.remainFunc, c.getCaughtProp())
                : Infinity;

            c.firstEscape = Math.min(tfFirstEscape, remainFirstEscape);
            
        }

    }

    // Get the earliest (current or future) time at which the 
    // timeFunction will go out of bounds with respect to 
    // boundNum lower and upper limits. 
    getFirstEscape (
        timeFunction,
        boundNum 
    ) {

        // If timeFunc isn't even in bounds at t = 0, return '0' to indicate 
        // that you can't make use of the equation even a little bit.
        let t0val = solver(timeFunction).evaluateToFloat({t: 0}).get();
        if (t0val === undefined) return 0; 
        if (t0val < boundNum.lower) return 0;
        if (t0val > boundNum.upper) return 0;

        let boundaryTimes = []; 
        if (boundNum.lower !== -Infinity && boundNum.lower !== Infinity)
            boundaryTimes.push(
                ...this.getBoundaryTimes(timeFunction, boundNum.lower, 'lower')
            );
        if (boundNum.upper !== -Infinity && boundNum.upper !== Infinity)
            boundaryTimes.push(
                ...this.getBoundaryTimes(timeFunction, boundNum.upper, 'upper')
            );

        let tfFirstEscape = 
            fd(boundaryTimes)
            .filter(bt => bt.t >= 0 && bt.isEscape) 
            .sort(bt => bt.t)
            .reduce(fd.first(bt => bt.t))
            .get();            

        return   tfFirstEscape === 0 ? 0
                : tfFirstEscape === undefined ? Infinity
                : tfFirstEscape === null ? Infinity
                : tfFirstEscape;
    
    }

    getBoundaryTimes (
        timeExpression, // the time (t) based expression
        boundary, // the constraint value
        boundaryType // 'lower' or 'upper'
    ) {

        let derivative = solver(`diff( ${timeExpression}, t )`);

        return solver(`${timeExpression} = ${boundary}`)
            .solveFor('t')
            .get()
            .map(solved => {
                solved = solver.fromNerdamerObj(solved);
                let _ = {};
                _.equation = `${timeExpression} = ${boundary}`,
                _.t = solved.evaluateToFloat(solved).get();
                _.derivative = solved.evaluateToFloat(derivative, {t: _.t}).get();
                if (_.derivative === undefined)
                    return undefined;
                // as in: does it escape the bounds?
                _.isEscape = boundaryType == 'lower' ? _.derivative < 0 : _.derivative > 0; 
                return _;
            })
            .filter(obj => obj !== undefined);

    }

    // Split a [*] b <- c [*] d to { source: c [*] d, target: a [*] b }, or
    // split a [*] b -> c [*] d to { source: a [*] b, target: c [*] d }
    splitFuncToSourceAndTarget (func) {
        
        let [ sources, targets ] = 
            func.includes('<-') ? func.split('<-').reverse()
            : func.includes('->') ? func.split('->')
            : null;

        return { sources, targets };

    }

}

let funcs = [
    '2*happiness <- metal^2 + 2*energy',
    '-0.25*happiness <- 0.5*rock',
    '1.5*rock <- 7*metal + energy' // TODO: adding this gives an error
]

let wfp = new worldFunctionProcessor(world, funcs);


// TODO: find min escape time of all caughts.
// Increment t by that time.
// Then find out how to make appropriate withdrawals and deposits.
console.log(wfp.func);
console.log([...wfp.caughts].map(c => c.firstEscape));


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