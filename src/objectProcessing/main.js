/*
    
    Name:      A loose identifier.  Loose because it distinguishes from other objects,
               but may share a name with some others, meaning they are both of the same
               type but otherwise hard to distinguish.
    Clarity:   The degree to which an object is in perception.  I haven't decided whether
               I seek a -1 to 1 scale or a 0 to 1 scale.
    A Raw Perception: 
        - Has no component elements.
        - Has a well defined name, quantity, and direct clarity.
    An Object:
        - Has component elements
        - Ill defined name, as the name is the component elements
        - Not sure if I consider it to have top level quantity yet
        - Has clarity, defined by a cross between inner element clarities and raw perception 
          clarities.  
        - Component element clarities no longer represent level of perception.  Rather, 
          they now represent level of membership in the object.  These get updated as well
          based on cross with raw perception.

*/
let room = require('./room.js');
let mind = require('./mind.js');
let contentRequestCom = require('./communicators/contentRequest.js');
let fd = require('fluent-data');

// This should come about by the algorithm, but I'm seeding it here
// to work with object matching before object creation.
// This room has no parent 'clarity' right now, but it will have one.
let objAC = room.create('obj.ac').push(
    // These clarities indicate how important their existence is in the parent object
    { name: 'raw.pleasure', clarity: 0.75 }, 
    { name: 'raw.a', clarity: 0.75 },
    { name: 'raw.c', clarity: 0.75 }
);
objAC.stage = 'dormant';

let dava = 
    new mind('dava')
    .push(objAC)
    .pushCommunicant('request parent contents', {}); // the starter communicant

let world = 
    room.create('world')
    .pushReciever(contentRequestCom.reciever)
    .push(
        dava,
        { name: 'switch.pleasure', value: 0.75 }, 
        { name: 'a', value: 1},
        { name: 'b', value: 0.5 },
        { name: 'c', value: 0.75}, 
        { name: 'd', value: 0.25 },
    );

// TODO: loop recieve until some sort of stop
world
    .recieve()
    .recieve()
    .recieve()
    .recieve();

/* logging */

console.log(objAC.allItems)

fd(objAC.allItems.map(i => ({...i, parent: undefined}))).log();

