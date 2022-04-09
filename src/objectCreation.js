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

class room extends Array {

    static base = null;
    static loops = 0;
    static maxLoops = null;

    constructor(name) {

        super();

        if (room.base === null)
            room.base = this;

        if (name)
            this.name = name;

        this.recievers = [];

    }

    push(...children) {
        for (let child of children) { 

            if (typeof child === 'function') {
                this.recievers.push(child.bind(this));
                continue;
            }

            room.setParent(child, this);
            super.push(child);
            
        }
        return this;
    }

    // A true property is polluting console.log 
    // (stackoverflow.com/q/37973290)
    static setParent(obj, value) {
        Object.defineProperty( 
            obj, 
            'parent', 
            { 
                get: function() { return value; }.bind(value),
                configurable: true
            }
        );
    }

    recieve () {
        for(let reciever of this.recievers)
        for(let child of this) { 
            if(child.recieve)
                child.recieve();
            reciever(child);
        }
        return this;
    }

    garbageCollect () {
        for(let c = this.length - 1; c >= 0; c--) {
            let child = this[c];
            if (child.garbageCollect)
                child.garbageCollect();
            if (child.garbage) {
                this.splice(c,1);
                room.setParent(child, null);
            }
        }
        return this;
    }

}
room.create = (name) => new room(name);

class mind extends room {

    constructor(name) {

        super(name);
        this.clarityCount = 7; // How many objects can be held in perception
        this.clarityThreshold = 0.33; // What level of clarity brings somethign into perception 

        this.push(
            (communicant) => this.requestParentContents(communicant),
            (communicant) => this.readRoomContents(communicant)
        );

    }

    get pleasure() { return this.find(e => e.name == 'pleasure'); }
    get objects() { return this.filter(e => e.name && e.name.startsWith('obj.')); }
    get rawPerceptions() { return this.filter(e => e.name && e.name.startsWith('raw.')); }

    requestParentContents(communicant) {
        if (communicant.name !== 'request parent contents')
            return;
        this.parent.push({
            name: 'content request',
            sender: this,
            intensity: 0.5
        });
        communicant.garbage = true;
    }

    readRoomContents(communicant) {

        if (communicant.name !== 'content response')
            return;

        let rawPerceptions = [];
            
        for (let item of communicant.items) {

            if (item === this)
                continue;
            rawPerceptions.push({
                name: 'raw.' + item.name.replace('switch.', ''),
                clarity: item.value
            });
        }
    
        communicant.garbage = true;

        this.addPerceptions(...rawPerceptions);

    }

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

            for (let e of o) {
                let rp = this.rawPerceptions.find(p => p.name == e.name);
                if (!rp)
                    continue;
                claritySumOfProds += e.clarity * (rp.clarity || 0); // for the parent clarity
                e.clarity = (e.clarity * 4 + rp.clarity) / 5; // for the inner clarities
            }
            o.clarity = claritySumOfProds / o.length;

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

let dava = new mind('dava');
dava.push(

    // the starter communicant
    { name: 'request parent contents' }, 

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

let world = room.create('world').push(

    dava,
    { name: 'switch.pleasure', value: 0.75 }, 
    { name: 'a', value: 1},
    { name: 'b', value: 0.5 },
    { name: 'c', value: 0.75}, 
    { name: 'd', value: 0.25 },

    function showContents (communicant) {

        if (communicant.name !== 'content request')
            return;

        let items = 
            this
            .filter(e => 
                // don't return the communicant itself or what sent 
                // the communicant, both of which would be in the world. 
                e !== communicant.sender && 
                e !== communicant
            )
            .map(e => {
                let clone = JSON.parse(JSON.stringify(e));
                if (clone.value)
                    clone.value *= communicant.intensity;
                return clone;
            });

        communicant.sender.push({
            name: 'content response',
            items
        });

        communicant.garbage = true; 

    }

);

world
    .recieve().garbageCollect()
    .recieve().garbageCollect();

console.log('dava', dava);

