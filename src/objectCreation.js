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
let fd = require('fluent-data');

class room {

    constructor(name) {
        if (name)
            this.name = name;
        this.children = [];
        this.communicants = []; 
        this.receptors = []; // communicant recievers
    }

    get siblings() {
        return this.parent.children.filter(c => c !== this);
    }

    push(...children) {
        for (let child of children) { 

            if (typeof child === 'function') {
                this.funcs.push(child);
                continue;
            }

            // I want a getter because a true property is polluting console.log.
            // If I build a log() method then turn into a real property again.
            // stackoverflow.com/q/37973290
            Object.defineProperty( 
                child, 
                'parent', 
                { get: function() { return this; }.bind(this) }
            );

            this.children.push(child);
            
        }
        return this;
    }

}
room.create = (name) => new room(name);

/*
    Going down an old rabbit-hole, but maybe making progress.
    Rooms need to interact with one another and change each other's state.
    But, I'm having trouble with loose coupling and separation of concerns here.
    Going in circles in my thinking. 
*/
class communicant {
    constructor(funcNames, sender, state) {
        this.funcNames = funcNames; // functions activating the communicant
        this.state = state;
        this.sender = sender;
        this.reciever = null;
        this.active = true;
    }
    searchForRecievers(room) {

        let reciever = room.children.find(child => child.funcNames )

        if (reciever === this.sender || !reciever[this.name])
            return;
        let _state = reciever[this.name](this);
        if (_state === null || _state === undefined)
            return;
        this.reciever = reciever;
        this.state = state;
    }
}

class mind extends room {

    constructor(name) {
        super(name);
        this.clarityCount = 7; // How many objects can be held in perception
        this.clarityThreshold = 0.33; // What level of clarity brings somethign into perception 
    }

    get pleasure() { return this.children.find(e => e.name == 'pleasure'); }
    get objects() { return this.children.filter(e => e.name && e.name.startsWith('obj.')); }
    get rawPerceptions() { return this.children.filter(e => e.name && e.name.startsWith('raw.')); }

    addPerceptions(...perceptions) {
        this.push(...perceptions);
        this.activateObjects();
    }

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
                let rp = this.rawPerceptions.find(p => p.name == e.name);
                if (!rp)
                    continue;
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
mind.funcs.lookAround = (communicant) => {

    let rawPerceptions = [];
        
    for (let child of communicant.state) {
        if (child === source)
            continue;
        rawPerceptions.push({
            name: 'raw.' + sibling.name.replace('switch.', ''),
            clarity: sibling.value
        });
    }

    source.addPerceptions(...rawPerceptions);

}

let dava = new mind('dava');
dava.push(
    // This should come about by the algorithm, but I'm seeding it here
    // to work with object matching before object creation.
    // This room has no parent 'clarity' right now, but it will have one.
    room.create('obj.latent').push(
        // These clarities indicate how important their existence is in the parent object
        { name: 'raw.pleasure', clarity: 0.75 }, 
        { name: 'raw.a', clarity: 0.75 },
        { name: 'raw.c', clarity: 0.75 }
    ) 
     
);

// console.log('davaObjects', dava.funcs[0]())


// For the world, I can see myself getting back into old problems.
// These will take a while to resolve.  I am going to make the 
// world less important here and just hard-code some anticipated
// moves from the mind.  
// TODO: loosely couple world and mind.  Create API structure 
// for world and mind and have it so that their interactions
// are flexible but the rules for building them are well defined.

/*

    - Objects are in rooms inside the world (which is also a room)
    - Objects can have state, which is just an array of other objects
    - Objects have interfaces.  
       > These are functions that accept other objects as parameters.
       > To view object state:
           - ObjectA is in same room as ObjectB
           - ObjectA has a child element that matches on ObjectB 
             interface input
           - ObjectB reads it's state, and releases elements into
             its room.   

*/

// TODO: Right now 'lookAround' interacts with siblings directly.  
// But I can't model different visibilites based on different 
// behaviors/controls with this.  For, instance, 'a', has value
// '1', but I may want 'a' to be hard to see for 'dava', and so
// translates to a clarity of '0.5'.  But if a different way
// to look around is made, clarity is better.  I can create a
// lookAround2(), but this puts the logic only inside, 'dava'.
// I want the logic to also be inside 'a', and 'dava' has to 
// learn which look around method works better.  
let world = room.create('world').push(
    dava,
    { name: 'switch.pleasure', value: 0.75 }, 
    { name: 'a', value: 1},
    { name: 'b', value: 0.5 },
    { name: 'c', value: 0.75}, 
    { name: 'd', value: 0.25 }
);

let logThis =     
    dava
    .lookAround()
    .activateObjects()
    .children;

console.log(JSON.parse(
    JSON.stringify(logThis)
    .replace(/"funcs":\[\],*/, '')
));


