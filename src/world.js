let bnm = require('./boundNumberMaker.js');
let nerdamer = require('nerdamer');
let fd = require('fluent-data');
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
        happiness: n(0).l(0).u(100).f('10t'), 
        energy: n(20).l(0).u(100).f('5t') 
    },
    { 
        name: 'Aaron', 
        happiness: n(0).l(0).u(100).f('10t'), 
        energy: n(35).l(0).u(100).f('5t') 
    }, 

    { name: 'dummy' }

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


let func = '2*happiness <- metal^2 + 2*energy';

let caughts = catchFromFunc(func);
console.log(caughts);




function catchFromFunc(func) {

    let { sources, targets } = splitFuncToSourceAndTarget(func);

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
                getCaughtObj: () => w, 
                getCaughtProp: () => w[p.propName]
            });

    _catchFromFunc_calcFlowAndRemainFuncs(caughts);
    _catchFromFunc_applyTimeSubstitutions(caughts);
    return caughts;

}

// Stage 1: calculate flowFuncs (stabilized flowRates) and remainFuncs
function _catchFromFunc_calcFlowAndRemainFuncs (caughts) {
    for (let c of caughts) {

        let prop = c.getCaughtProp();

        c.flowFunc = prop.flowRate || prop.value.toString();

        if (c.type == 'source') {
            c.remainFunc = prop.value.toString();
            if (prop.flowRate !== undefined) 
                c.remainFunc += ' - ' + prop.flowRate;
        }

    }
};

// Stage 2: Calculate 'inTermsOf' equations by substituting the time 
// equations for all variables with their time-based equivalents, save
// the given caught object, which you're trying to solve for.  
function _catchFromFunc_applyTimeSubstitutions (caughts) {
        
    let { sources, targets } = splitFuncToSourceAndTarget(func);
    for (let c of caughts) {

        let _sources = sources;
        let _targets = targets;

        let timeSubstitutions = 
            fd(caughts)
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
                _sources = _sources.replace(propRx, timeSub.part);
            else if (timeSub.type == 'target')
                _targets = _targets.replace(propRx, timeSub.part);
        }

        c.timeSubstitutions = `${_sources} = ${_targets}`;

        // Problem.  We can have more than one solution for time.
        // My instinct here is to take the earliest boundary times for each,
        // and then only consider the equation which, of those, has the latest time.
        // But I can't articulate a justification right now.
        //
        // Duh, it's the fact that it's a quadradic equation.  So it goes
        // back to deciding which one to use.  And I return to my instinct
        // of first finding the minimum boundary break for all of them, and
        // then choosing the one with the latest break.  
        // 
        // Another, safer, possibillity is to take the minimum boundary crossings
        // and then, of those, select the minimum that is still feasible.  
        // Time increments less but if the element doesn't hit its boundary then
        // time will just continue incrementing.
        // 
        // I think I'm going to choose the first solution because I want to see
        // this break if it's not good.  But I"ll keep the second safer solution
        // in mind.  Also I know I need a better think-through of the justification
        // in general.
        //
        // (metal + 2t)^2 + 2*(5t + 5t) = 2*(10t + 10t) 
        //
        // x = 4*sqrt(5)*sqrt(t)        'always positive, undefined for t < 0'
        // metal = (1/2)*(-4*t+x)       'starts positive then goes negative'
        // metal = (1/2)*(-4*t-x)       'always negative'

        c.timeFuncs = 
            nerdamer(c.timeSubstitutions)
            .solveFor(c.propName)
            .map(tf => tf.toString());

        c.boundaryTimes = [];
        let cp = c.getCaughtProp();

        // boundaries imposed by the giving object
        if (c.remainFunc) 
            c.boundaryTimes.push(...getBoundaryTimes(c.remainFunc, cp));

        // boundaries imposed by equation bottlenecks
        // TODO: Implement the strategy in the notes described in the paragraphs just above
        for (let tf of c.timeFuncs) 
            c.boundaryTimes.push(...getBoundaryTimes(tf, cp));

        // wrote this up but I think it may be better to just work
        // within the for loop above
        fd(c.boundaryTimes)
            .filter(bt => bt.t) // we won't be moving back in time
            .group(bt => bt.equation)
            .window({reduce: {
                isViableAtT0: table => !table.some(bt => bt == 0 && bt.isEscape) 
            }})
            .reduce({
                minEscape: fd.min(bt => 
                    bt.isViableAtT0 ? // ...
                )
            })
            .map(bt => ({ t: bt.t }))
            .log();

        c.boundaryTimesStr = c.boundaryTimes.map(bt => 
            `${Math.round(bt.t,4)} | isEscape: ${bt.isEscape}`
        );
        
    }

}

function getBoundaryTimes(
    timeExpression,
    boundProp
) {

    let boundaryTimes = [];

    if (boundProp.lower !== -Infinity && boundProp.lower !== Infinity)
        boundaryTimes.push(
            ..._getBoundaryTimes(timeExpression, boundProp.lower, 'lower')
        );

    if (boundProp.upper !== -Infinity && boundProp.upper !== Infinity)
        boundaryTimes.push(
            ..._getBoundaryTimes(timeExpression, boundProp.upper, 'upper')
        );

    // This function takes the timeExpression as a whole.  If it's not viable
    // at t = 0, either by min or max, it will be marke as such in both 
    // min and max.   
    let timeExpressionIsViableAtT0 = !boundaryTimes.some(bt => bt.t == 0 && bt.isEscape);
    for (let bt of boundaryTimes)
        bt.timeExpressionIsViableAtT0 = timeExpressionIsViableAtT0;

    return boundaryTimes;

}

function _getBoundaryTimes (
    timeExpression, // the time (t) based expression
    boundary, // the constraint value
    boundaryType // 'lower' or 'upper'
) {

    let derivative = nerdamer(`diff( ${timeExpression}, t )`);

    return nerdamer(`${timeExpression} = ${boundary}`)
        .solveFor('t')
        .map(solved => {
            try {
                let _ = {};
                _.equation = `${timeExpression} = ${boundary}`,
                _.t = nerdamer(solved).evaluate();
                _.derivative = derivative.evaluate({t: _.t});
                _.t = parseFloat(_.t.toDecimal());
                _.derivative = parseFloat(_.derivative.toDecimal());
                // as in: does it escape the bounds?
                _.isEscape = boundaryType == 'lower' ? _.derivative < 0 : _.derivative > 0; 
                return _;
            }
            catch (e) {
                if (e.message.startsWith('Division by zero is not allowed'))
                    return undefined;
            }
        })
        .filter(obj => obj !== undefined);

}

// Split a [*] b <- c [*] d to { source: c [*] d, target: a [*] b }, or
// split a [*] b -> c [*] d to { source: a [*] b, target: c [*] d }
function splitFuncToSourceAndTarget (func) {
    
    let [ sources, targets ] = 
        func.includes('<-') ? func.split('<-').reverse()
        : func.includes('->') ? func.split('->')
        : null;

    return { sources, targets };

}


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