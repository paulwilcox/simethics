module.exports = {

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
    }

}