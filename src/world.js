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

    'what a user would plug in'

        happiness <- metal^2 + 2*energy

    'The naive equations.'
    'Accounting for time and original state.'
    'Not considering boundary conditions.'

        metal(t)      = metal.value - metal.er / t    
                      = 50 - 2/t
        
        energy(t)     = energy.value - energy.er / t  
                      = 20 - 5/t

        happiness(t)  = happiness.value + metal(t)^2 + 2*energy(t)
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

    'Things are different for happiness, beause it has'
    'its own constraints and inherits those of metal'
    'and energy.'

        happiness(t) = 

            happiness.value + metal(t)^2 + 2*energy(t) :     metal.min <= metal(t) <= metal.max
                                                           & energy.min <= energy(t) <= energy.max
                                                           & happiness.min <= happiness(t) <= happines.max

            happiness.value + metal.min^2 + 2.energy(t) :    metal(t) < metal.min
                                                           & energy.min <= energy(t) <= energy.max
                                                           & happiness.min <= happiness(t) <= happines.max

            happiness.value + metal.max^2 + 2.energy(t) :    metal(t) > metal.max
                                                           & energy.min <= energy(t) <= energy.max
                                                           & happiness.min <= happiness(t) <= happines.max
            ... energy too low
            ... energy too high
            ... happiness too low
            ... happiness too high

            ... metal too low and energy too low
            ... metal too low and energy too high
            ... metal too high and energy too low
            ... metal too high and energy too high

            ... repeat for metal and happiness (4 lines)
            ... repeat for energy and happiness (4 lines)
            
            ... metal too low and energy too low and happiness too low
            ... metal too low and energy too low and happiness too high
            ... metal too low and energy too high and happiness too low
            ... metal too low and energy too high and happiness too high

            ... repeat for metal too high and energy and happiness (4 lines)

            'thats 27 lines'
            '3^3, due to 3 variables'
            'Just 5^5 would be 3125 lines!'

*/