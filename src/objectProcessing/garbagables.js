module.exports = class garbagables {

    constructor(
        parentOfItems // a garbagable is really a manager, not a parent itself
    ) {

        if (!parentOfItems)
            throw 'parentOfItems must have a value.  ';

        this.items = [];
        this.parentOfItems = parentOfItems;

    }

    *[Symbol.iterator]() {
        let i = 0;
        let stop = this.items.length - 1;
        while (i <= stop) {
            let item = this.items[i];
            if (item.garbage) { 
                // garbage collect
                this.items.splice(i,1);
                setParent(item,null);
                stop--;
            }
            else 
                yield item;
            i++;
        }
        return;
    } 

    push(...items) {
        for (let item of items) { 
            setParent(item,this.parentOfItems);
            this.items.push(item);
        }
        return this;
    }

    filter(func) {
        let result = [];
        for (let item of this.items)
            if (func(item))
                result.push(item);
        return result;
    }

    find(func) {
        for (let item of this.items)
            if (func(item))
                return item;
    }

    map(func) {
        let result = [];
        for (let item of this.items)
            result.push(func(item));
        return result;
    }

}

// A true property is polluting console.log 
// (stackoverflow.com/q/37973290)
function setParent (obj, val) {
    Object.defineProperty( 
        obj, 
        'parent', 
        { 
            get: function() { return val; }.bind(val),
            configurable: true
        }
    );
}