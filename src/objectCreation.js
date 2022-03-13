let fd = require('fluent-data');

let focusCount = 7; // upper bound
let focusThreshold = 0.33; // lower bound.

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
if (focusThreshold > pleasure.quantity * pleasure.clarity)
    return;

// Bring an object into perception based on match to raw perceptions
for (let o of objects) {
    let matchSum = 0;
    for (let e of o.elements) {
        let p = rawPerceptions.find(p => p.quality == e.quality);
        matchSum += e.clarity * (p.clarity || 0);
    }
    o.clarity = matchSum / o.elements.length;
}

// TODO: reweight the inner clarities based on actual perceptions

return;

// TODO: decide when and when not to run the below based on existing objects
// Probably based on 'when pleasure is not sufficiently explained'

// create an object from scratch
let _obj =
    fd(elements)
    .sort(e => -e.clarity)
    .filter((e,i) => i < focusCount)
    .log();

/*
    A perception: 
        - An identifier and a -1 to 1 numeric weight
        - The weight being level of ACTUAL perception
        -   1 meaning full perception, 
            0 meaning neutral non-perception (extinction slow, might be present just not perceived),
            -1 meaning explicit non-perception (extinction fast)
    An object: 
        - A complex of identifiers with weights.
        - The weights being historically EXPECTED perception.
        - A single overarching weight indicating ACTUAL perception
        - History gets updated upon perception (and perhaps weighted by level of perception)
*/

/*

    Quantity vs clarity:
        - Algorithm to put them into an object may be the same for each
        - Clarity reduces over time, quantity does not.

*/




