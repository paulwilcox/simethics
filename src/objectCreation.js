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

class mind extends Array {

    constructor() {
        super();
        this.clarityCount = 7; // How many objects can be held in perception
        this.clarityThreshold = 0.33; // What level of clarity brings somethign into perception        
    }

    get pleasure() { return this.find(e => e.quality == 'pleasure'); }
    get objects() { return this.filter(e => Object.keys(e).includes('children')); }
    get rawPerceptions() { return this.filter(e => !Object.keys(e).includes('children')); }

    // Existing latent objects are put put into clarity.  (I may 
    // move the inner clarity algorithm to subsequent activation)
    activateObjects() {

        for (let o of this.objects) {

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
            let claritySumOfProds = 0;
            for (let e of o.children) {
                let rp = this.rawPerceptions.find(p => p.quality == e.quality);
                claritySumOfProds += e.clarity * (rp.clarity || 0); // for the parent clarity
                e.clarity = (e.clarity * 4 + rp.clarity) / 5; // for the inner clarities
            }
            o.clarity = claritySumOfProds / o.children.length;

        }

        return this;

    }

    // Expectation Search: Of the activated objects, there will be a mismatch for some
    // of the inner elements.  Do a second search of raw perceptions to see if any 
    // are found.  If not found, throw a pseudo-raw-perception with negatie clarity
    // into the elements.  Basically, this models how expectations work.
    //
    // - This is where negative clarities come into play.  If an expectation exists and
    //   the raw perception is not present, throw a pseudo-raw-perception into the 
    //   elements with negative clarity.  
    // - Also, the second search models active interatction with the world.  So it would
    //   involve throwing a 'control' element into the elements and then requerying 
    //   the elements.


    // Object Generation: If all else fails with activating and modifying existing
    // objects, create new ones.  Criteria for this point is probably 'when pleasure is 
    // not sufficiently explained'
    /*
    let _obj =
        fd(mind)
        .sort(e => -e.clarity)
        .filter((e,i) => i < clarityCount)
        .log();
    */

}

let dava = new mind();
dava.push(

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
        
        children: [
            // These clarities indicate how important their existence is in the parent object
            { quality: 'pleasure', quantity: 2, clarity: 0.75 }, 
            { quality: 'a', quantity: 2, clarity: 0.75 },
            { quality: 'c', quantity: 1, clarity: 0.75 }
        ]

    } 
     
);


console.log(dava.activateObjects().objects[0])

return;

let world = [

    { room: 'lit', clarity: 0.75, children: [ { a: 2 }, { b: 3 } ] },
    { room: 'dark', clarity: 0.25, children: [ { c: 1 }, { d: 2 } ] }, 
    { room: 'lounge', clarity: 1, children: [ {  } ] }

];
    


