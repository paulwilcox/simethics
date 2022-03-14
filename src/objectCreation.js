/*
    
    Quality:   The identifier, distinguishes it from other objects in perception.
    Quantity:  The amount an object has of itself.  Not really used yet.  Just there to
               point out that it is different than clarity.
    Clarity:   The degree to which an object is in perception.  I haven't decided whether
               I seek a -1 to 1 scale or a 0 to 1 scale.
    A Raw Perception: 
        - Has no component elements.
        - Has a well defined quality, quantity, and direct clarity.
    An Object:
        - Has component elements
        - Ill defined quality, as the quality is the component elements
        - Not sure if I consider it to have top level quantity yet
        - Has clarity, defined by a cross between inner element clarities and raw perception 
          clarities.  
        - Component element clarities no longer represent level of perception.  Rather, 
          they now represent level of membership in the object.  These get updated as well
          based on cross with raw perception.

*/

let fd = require('fluent-data');

let clarityCount = 7; // How many objects can be held in perception
let clarityThreshold = 0.33; // What level of clarity brings somethign into perception

let elements = [

    { quality: 'pleasure', quantity: 2, clarity: 0.75 }, // perception
    { quality: 'a', quantity: 2, clarity: 1 }, // perception
    { quality: 'b', quantity: 3, clarity: 0.5 }, // perception
    { quality: 'c', quantity: 1, clarity: 0.75 }, // perception
    { quality: 'd', quantity: 2, clarity: 0.25 }, // perception

    // This should come about by the algorithm, but I'm seeding it here
    // to work with object matching before object creation
    {
        
        // This clarity indicates level of perception, like the raw elements.
        // It is to be processed on each refresh of raw perceptions
        clarity: undefined, 
        
        elements: [
            // These clarities indicate how important their existence is in the parent object
            { quality: 'pleasure', quantity: 2, clarity: 0.75 }, 
            { quality: 'a', quantity: 2, clarity: 0.75 },
            { quality: 'c', quantity: 1, clarity: 0.75 }
        ]

    } 
     
];

let pleasure = elements.find(e => e.quality == 'pleasure');
let objects = elements.filter(e => Object.keys(e).includes('elements'));
let rawPerceptions = elements.filter(e => !Object.keys(e).includes('elements'));

// Don't bother building an object if there would be no correlated pleasure.
if (clarityThreshold > pleasure.quantity * pleasure.clarity)
    return;

for (let o of objects) {

    // The parent object's clarity is being updated
    //  - This clarity represents how much the object is actually being percieved
    //  - Child element clarities are multiplied by matched perceptive clarity
    //    and the average of this is taken.
    // Each child element's clarity is being updated
    //  - This clarity represents how crucial the element is in representing the
    //    parent object.
    //  - Since I don't want to record an actual history, instead what I do is 
    //    pretend as though I have 4 points in history that led to the child
    //    element's value, and update the average to reflect the new 5th data point.
    // TODO: This algorithm can't produce negative inner clarities
    //  - Raw perceptions never have negative clarities
    //  - Or, if we want 0-1 scale, this algorithm doesn't have a way to hold onto
    //    a 0 clarity element and idenity it as important that it be that way 
    //    (presently it is not important and subject to a garbage collection method)
    let claritySumOfProds = 0;
    for (let e of o.elements) {
        let rp = rawPerceptions.find(p => p.quality == e.quality);
        claritySumOfProds += e.clarity * (rp.clarity || 0); // for the parent clarity
        e.clarity = (e.clarity * 4 + rp.clarity) / 5; // for the inner clarities
    }
    o.clarity = claritySumOfProds / o.elements.length;

}

fd(objects[0].elements).log()

return;

// TODO: decide when and when not to run the below based on existing objects
// Probably based on 'when pleasure is not sufficiently explained'

// create an object from scratch
let _obj =
    fd(elements)
    .sort(e => -e.clarity)
    .filter((e,i) => i < clarityCount)
    .log();






