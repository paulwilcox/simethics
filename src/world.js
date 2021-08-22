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

let equation = algebra.parse('(2/t)^2 + 2*(5/t) = 100');
console.log(
    equation.solveFor('t').toString()
)


return;

/*

    'what a user would plug in'

        happiness <- metal^2 + 2*energy

    'The naive equations.'
    'Not considering boundary conditions.'

        metal.extract(t)      = metal.er / t
                              = 2/t

        energy.extract(t)     = energy.er / t
                              = 5/t

        metal.remain(t)       = metal(0) - metal.extract(t)    
                              = 50 - 2/t
        
        energy.remain(t)      = energy(0) - energy.extract(t)  
                              = 20 - 5/t

        happiness.deposit(t)  = metal.extract(t)^2 + 2*energy.extract(t)
                              = (2/t)^2 + 2*(5/t)

        happiness.remain(t)   = happiness(0) + happiness.deposit(t)
                              = 0 + (2/t)^2 + 2*(5/t)

------------------------

    'Which element will reach its limit first?'

        metal(t) = metal.min
        50 - 2/t  = 0
        -2/t      = -50
        t         = 25
                          
        energy(t) = energy.min
        20 - 5/t  =  0
        -5/t      =  -20
        t         =  4

        happiness(t) = happiness.min
        (2/t)^2 + 2*(5/t) = 0
        www.mathpapa.com/algebra-calculator.html -> google
            | t = 0.02975949514
            | t = 0.05291767021

        happiness(t) = happiness.max
        (2/t)^2 + 2*(5/t) = 100
        www.mathpapa.com/algebra-calculator.html -> google
            | t = 0.02845621373
            | t = 0.05760936003

    'lowest of all these is 0.02845621373'

        'The idea would be to choose this as t and increment only this amount of time.' 

        'But, whoops, this is not right.'
        'How can happiness reach it's lower bound at t > 0?'

        'The problem is that I set happiness to equal to the value'
        'of the metal in the mine, which decreases over time.'
        'I need to do the extracted metal, which increases over time.'

*/