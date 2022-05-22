var self = module.exports = { // stackoverflow.com/q/10462223

    // Function names are otherwise read-only.  
    renameFunc: function (func, newName) {
        Object.defineProperty(func, 'name', { value: newName });
    },

    arraySum: function (array, func) {
        try {
            let agg = 0;
            for (let element of array) 
                agg += func(element);
            return agg;
        }
        catch(e) {
            if (e.message.match('not iterable')) {
                console.log('Non-iterable object (error message follows):')
                console.log(array);
            }
            throw e;
        }
    },

    isString: input =>
        typeof input === 'string' 
        || input instanceof String,

    // Thanks domino at https://stackoverflow.com/questions/18884249
    isIterable: (input, includeStrings = false) => 
        !includeStrings && self.isString(includeStrings) ? false
        : Symbol.iterator in Object(input),
      
    // For use with JSON.stringify to get around circular reference errors
    // developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
    getCircularReplacer: () => {
        let seen = new WeakSet();
        return (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    },

    noUndefined: obj => {
    
        for(let key of Object.keys(obj))
            if (obj[key] === undefined) 
                delete obj[key];
    
        return obj;
    
    },    

    // Comparing the functions will not produce expected result.
    // Have to stringify the functions first, then compare.
    // Perhaps there are multiple native forms of toString?
    isToStringOverwritten: obj => 
          obj.toString.toString() !== Object.prototype.toString.toString(),

    tableToString: function (
        data, 
        caption,
        mapper = x => x, 
        limit = 50, 
        headers = true,
        preferEmptyString = true, // if false, '<null>' and '<undefined>' can show
        bordersBefore = null // [[a,b,c],[x,y,z]], borders before resp. row and col ix posits
    ) {

        if (self.isToStringOverwritten(data)) 
            return data.toString();

        let props = [];
        let vals = [];

        if (data.length == 0) {
            data = [{ empty: '' }];
            headers = false;
        }

        let safeToString = (val) =>  
                val === null ? (preferEmptyString ? '' : '<null>') 
            : val === undefined ? (preferEmptyString ? '' : '<undefined>')
            : val.toString();

        // Initially, values are multi-line.  Even if just 
        // one line they're represented as an array.
        let toStringArray = (val) => safeToString(val).split(`\r\n`);

        for(let r = 0; r < data.length; r++) {
            
            if (r >= limit)
                break;

            let row = mapper(data[r]);
            if (row == null)
                row = '<null>';

            if (typeof row === 'object') 
                row = self.noUndefined(row);
            else 
                row = { '<primitive>': row }; 

            let rowVals = [];
            let rowProps = Object.getOwnPropertyNames(row);

            // force the order of props in previous rows
            for(let i = 0; i < props.length; i++) {
                let prop = props[i];
                let arrayVal = toStringArray(row[prop]);
                rowVals.push(arrayVal);
            }

            // add new props if not previously known
            for(let i = 0; i < rowProps.length; i++) {
                let prop = rowProps[i];
                let arrayVal = toStringArray(row[prop]);

                if (!props.includes(prop)) {
                    props.push(prop);
                    rowVals.push(arrayVal);
                }
            }

            // spread out the arrayVals into different lines
            // [['one line'],['two','lines']] becomes 
            // [['one line', 'two'], ['', 'lines']]
            let maxLen = Math.max(...rowVals.map(arrayVal => arrayVal.length));
            for(let i = 0; i < maxLen; i++) {
                let flattened = [];
                for (let arrayVal of rowVals) 
                    flattened.push(arrayVal[i] || '');
                vals.push(flattened);
            }

        }    

        let lengths = [];

        for (let i = 0; i < props.length; i++) 
            lengths[i] = Math.max(
                ...vals.map(row => safeToString(row[i]).length), 
                headers ? props[i].length : 0
            );

        for(let i = 0; i < props.length; i++)
            props[i] = props[i].padEnd(lengths[i]);

        for(let row of vals)
            for(let i = 0; i < props.length; i++) 
                row[i] = safeToString(row[i]).padEnd(lengths[i]);

        let chr = (notBb,bb) => bordersBefore ? bb : notBb;
        let tl = chr('\u250c', '\u2554');
        let tm = chr('\u252c', '\u2564');
        let tr = chr('\u2510', '\u2557');
        let ml = chr('\u251c', '\u2560');
        let mm = chr('\u253c', '\u256a');
        let mr = chr('\u2524', '\u2563');
        let bl = chr('\u2514', '\u255a');
        let bm = chr('\u2534', '\u2567');
        let br = chr('\u2518', '\u255d');
        let hz = chr('\u2500', '\u2550');
        let vl = chr('\u2502', '\u2551');
        let vm = chr('\u2502', '\u250a');
        let vr = chr('\u2502', '\u2551');
        let nl = '\r\n';
        let sp = ' ';

        let topBorder = tl+hz + lengths.map(l => ''.padStart(l,hz+hz+hz)).join(hz+tm+hz) + hz+tr+nl;
        let headerRow = vl+sp + props.join(sp+vm+sp) + sp+vr+nl;
        let divider = ml+hz + lengths.map(l => ''.padStart(l,hz+hz+hz)).join(hz+mm+hz) + hz+mr+nl;
        let dataRows = vals.map(row => vl+sp + row.join(sp+vm+sp) + sp+vr).join(nl) + nl;
        let botBorder = bl+hz + lengths.map(l => ''.padStart(l,hz+hz+hz)).join(hz+bm+hz) + hz+br;

        // add special row borders
        if (bordersBefore && bordersBefore[0]) {
            dataRows = dataRows.split(nl)
            let bbRev = [...bordersBefore[0]];
            bbRev.reverse();
            for (let bb of bbRev)
                dataRows.splice(bb, 0, 
                    divider
                        .replace(new RegExp(hz,'g'), '\u2550')
                        .replace(nl,'')
                );
            dataRows = dataRows.join(nl);
        }

        let result = 
            topBorder +
            (headers ? headerRow : '') + 
            (headers ? divider : '') +
            dataRows +
            botBorder;

        // add special column borders
        if (bordersBefore && bordersBefore[1]) {

            bordersBefore[1] = // convert col posit to char posit
                [...topBorder]
                .map((chr,ix) => chr == tm ? ix : null)
                .filter(ix => ix !== null)
                .filter((x,ix) => bordersBefore[1].includes(ix));

            for(let bb of bordersBefore[1]) {
                let replacer = (val,rep) => 
                    result.replace(new RegExp(`(?<=^.{${bb}})${val}`,'gm'), rep);
                result = replacer(vm,vl);
                result = replacer(tm, '\u2566');
                result = replacer(mm, '\u256c');
                result = replacer(bm, '\u2569');
            }

        }

        result = (caption ? (caption+nl) : '') + result;
        return result;

    }

}