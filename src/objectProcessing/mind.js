let room = require('./room.js');

class mind extends room {

    constructor(name) {

        super(name);
        this.clarityCount = 7; // How many objects can be held in perception
        this.clarityThreshold = 0.33; // What level of clarity brings somethign into perception 
        this.supriseThreshold = 0.33; // What level of counter-expectation causes a deeper search

        this.pushReciever ('request parent contents',

            function (communicant) {
                this.parent.pushCommunicant(
                    'content request',
                    { 
                        sender: this, 
                        searchRegex: '*',
                        searchIntensity: 0.5 
                    }
                );
                communicant.garbage = true;
            }        

        );
        
        this.pushReciever ('request parent contents deeply',

            function (communicant) {
                this.parent.pushCommunicant(
                    'content request',
                    { sender: this, intensity: 1 }
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
                this.push(...rawPerceptions);
                this.processObjects();                
            }

        );

    }

    get pleasure() { return this.find(e => e.name == 'pleasure'); }
    get objects() { return this.filter(e => e.name && e.name.startsWith('obj.')); }
    get rawPerceptions() { return this.filter(e => e.name && e.name.startsWith('raw.')); }

    // Existing latent objects are put put into clarity.  (I may 
    // move the inner clarity algorithm to subsequent activation)
    processObjects() {

        let getRawPerceptionClarity = (elementName) => {
            let perception = this.rawPerceptions.find(rp => rp.name == elementName);
            if (!perception) return 0;
            if (!perception.clarity) return 0;
            return perception.clarity;
        }

        for (let o of this.objects) {

            // Set the parent object clarity based on object match to raw perceptions
            if (o.stage == 'dormant') {
                let avgSumOfProds = 
                    o.reduce((agg,element) => {
                        let rpClarity = getRawPerceptionClarity(element.name);
                        return agg += element.clarity * rpClarity; 
                    })
                    / o.length;
                o.clarity = avgSumOfProds;
                o.stage = 'activated';
            }

            // How different is an object to raw perceptions?  If a lot, search the world again. 
            else if (o.stage == 'activated') {
                let maxSurprise = o.reduce((agg,element) => {
                    let rpClarity = getRawPerceptionClarity(element.name);
                    return agg += Math.abs(element.clarity - rpClarity); 
                });
                // TODO: problem here is that intensity (in communicant) triggers change 
                // in clarity for all items in the world.  We need each individual item
                // reacting to intensity differently.  This way, when intensty rises, 
                // other raw perceptions remain constant, but some new ones manifest. 
                if (maxSurprise > this.supriseThreshold)
                    this.pushCommunicant('request parent contents deeply', {});
                o.stage = 'reviewed';
            }

            // Still different after review?  Calibrate expectations for next time.
            // TODO: Account for the expectation that something specifically not 
            // be present (different than it not mattering whether it's present
            // or not).  Maybe throw a pseudo-raw perception with negative clarity?
            else if (o.stage == 'reviewed') { 
                for (let element of o) {
                    let rpClarity = getRawPerceptionClarity(element.name);
                    // Alter the inner clarities.  Change is like modifying a 
                    // pseudo-average over time (as though current represents 
                    // one of 5 instances).
                    e.clarity = (e.clarity * 4 + rpClarity) / 5; 
                }
                o.stage = 'calibrated';
            }

        }

        return this;

    }

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