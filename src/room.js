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
        this.garbageCollect();
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

module.exports = room;