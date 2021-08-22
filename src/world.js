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

let happiness = n(0).l(0).u(100);
let metal = n(50).l(0).er(2);
let energy = n(20).l(0).er(5);

let metalEq = algebra.parse('50 - 2/t');

let equation = algebra.parse('metal^2 + 2*energy = happiness + zero');


return;

/*

    'The naive equations, not considering boundary conditions'

        metal(t)      = metal.value - metal.er / t    
                      = 50 - 2/t
        
        energy(t)     = energy.value - energy.er / t  
                      = 20 - 5/t

        happiness(t)  = metal(t)^2 + 2*energy(t)
                      = (50 - 2/t)^2 + 2*(20 - 5/t)

------------------------

    'metal(t) needs to be split over conditionals'

        metal(t) = 50 - 2/t  : metal.min <= _metal(t) <= metal.max '_metal(t) is the uncontitioned'
                   metal.min : _metal(t) < metal.min
                   metal.max : _metal(t) > metal.max

                = 50 - 2/t   : 0 <= 50 - 2/t  'metal.max is infinite'
                  0          : 50 - 2/t < 0

    'When does _metal(t) hit the boundary?'

        _metal(t) = metal.min
        50 - 2/t  = 0
        -2/t      = -50
        t         = 25
        
        '
            Only one solution. 
            _metal(0) = 50, which is inbounds
            _metal(25) = 0, which is where it crosses the border.
            so ...
        '

    'the conditionals can now be expressed in terms of t

        metal(t) = 50 - 2/t  :  t <= 25
                   0         :  t > 25


-----------------------

    'repeat for energy'

        energy(t) = 20 - 5/t  :  0 <= 20 - 5/t
                  = 0         :  20 - 5 / t < 0
                  
        _energy(t) = energy.min
        20 - 5/t  =  0
        -5/t      =  -20
        t         =  4

        energy(t) = 20 - 5/t  :  t <= 4
                    0         :  t > 4

-----------------------



*/