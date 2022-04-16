let room = require('./room.js');

class mind extends room {

    constructor(name) {

        super(name);
        this.clarityCount = 7; // How many objects can be held in perception
        this.clarityThreshold = 0.33; // What level of clarity brings somethign into perception 

        this.pushReciever ('request parent contents',

            function (communicant) {
                this.parent.pushCommunicant(
                    'content request',
                    { sender: this, intensity: 0.5 }
                );
                communicant.garbage = true;
            }        

        );
        
        this.pushReciever ('content response',

            function (communicant) {
                let rawPerceptions = [];
                for (let item of communicant.items) 
                    rawPerceptions.push({
                        name: 'raw.' + item.name.replace('switch.', ''),
                        clarity: item.value
                    });
                communicant.garbage = true;
                this.addPerceptions(...rawPerceptions);
            }

        );

    }

    get pleasure() { return this.find(e => e.name == 'pleasure'); }
    get objects() { return this.filter(e => e.name && e.name.startsWith('obj.')); }
    get rawPerceptions() { return this.filter(e => e.name && e.name.startsWith('raw.')); }

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

module.exports = mind;