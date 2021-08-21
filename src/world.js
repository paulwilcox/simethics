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



let equation = algebra.parse('metal^2 + 2*energy = happiness + zero');


console.log(
    equation.solveFor('zero').toString()
);

return;

/*

    happiness => metal^2 + 2*energy

    metal(t) = 50 - 2/t
    energy(t) = 20 - 5/t

    happiness(t) = (50 - 2/t)^2 + 2*(20 - 5/t)

*/