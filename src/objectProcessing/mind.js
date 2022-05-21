let room = require('./room.js');
let contentRequestCom = require('./communicators/contentRequest.js');
let arraySum = require('./general.js').arraySum;

class mind extends room {

    constructor(name) {

        super(name);
        this.clarityCount = 7; // How many objects can be held in perception
        this.clarityThreshold = 0.33; // What level of clarity brings somethign into perception 
        this.supriseThreshold = 0.33; // What level of counter-expectation causes a deeper search

        this.pushReciever ('request parent contents',

            function (communicant) {
                this.parent.pushCommunicant(
                    contentRequestCom.makeCommunicant(this, { 
                        '^a|b|d$': 0.85,
                        '^c$': 0.25,
                        '^switch\.pleasure$': 0.25
                    })
                );
                communicant.garbage = true;
            }        

        );
        
        this.pushReciever ('request parent contents deeply',

            function (communicant) {
                this.parent.pushCommunicant(
                    contentRequestCom.makeCommunicant(this, { '.*': 1 })
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
                // delete the old ones; 
                for(let rp of this.rawPerceptions)
                    rp.garbage = true;
                this.push(...rawPerceptions);
                this.processObjects();      
            }

        );

    }

    get pleasure() { return this.items.find(e => e.name == 'pleasure'); }
    get objects() { return this.items.filter(e => e.name && e.name.startsWith('obj.')); }
    get rawPerceptions() { return this.items.filter(e => e.name && e.name.startsWith('raw.')); }

    // Existing latent objects are put put into clarity.  (I may 
    // move the inner clarity algorithm to subsequent activation)
    processObjects() {

        for (let o of this.objects) {

            let getRawPerceptionClarity = (rpName) => {
                let rp = this.rawPerceptions.find(rp => rp.name == rpName);
                if (!rp || !rp.clarity || isNaN(rp.clarity))
                    return 0;
                return rp.clarity;
            }

            // How different is an object to raw perceptions?  If a lot, search the world again.                 
            if (o.stage == 'dormant') {
                let maxSurprise = arraySum(o.items, element => 
                    Math.abs(element.clarity - getRawPerceptionClarity(element.name))
                );
                if (maxSurprise > this.supriseThreshold) {
                    this.pushCommunicant('request parent contents deeply', {});
                    o.stage = 'doubting';
                }    
                else 
                    o.stage = 'uncalibrated';
            }
            else if (o.stage == 'doubting') 
                o.stage = 'uncalibrated';

            // Calibrate expectations (alter inner clarties) for next time.
            // TODO: Account for the expectation that something specifically not 
            // be present (different than it not mattering whether it's present
            // or not).  Maybe throw a pseudo-raw perception with negative clarity?
            if (o.stage == 'uncalibrated') { 
                // A pseudo-average over time (as though current represents one of 5 instances).
                for (let element of o.items) 
                    element.clarity = 
                        (element.clarity * 4 + getRawPerceptionClarity(element.name)) 
                        / 5; 
                o.stage = 'activated';
            }

            // Set the parent object clarity based on object match to raw perceptions
            o.clarity = arraySum (o.items, element => {
                if (o.stage == 'activated')
                    console.log({
                        en: element.name, 
                        ec: element.clarity, 
                        rpc: getRawPerceptionClarity(element.name), // coming out far lower than expected
                        rps: this.rawPerceptions
                    })
                return (element.clarity || 0) * getRawPerceptionClarity(element.name)
            }) / o.length;

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