let intervals = require('./intervals')

let numbers = 
    new intervals()
    .merge(true, 5, 9, true)
    .merge(false, 7, Infinity, true)
    .merge(true, 1, 3, false)
    .log('Numbers:', true)

let words = 
    new intervals()
    .merge(false, "beach", "node", true)
    .merge(true, "minion", "ponder", true)
    .log('\nWords:', true)

console.log(`\ntests`, [
    !numbers.has(-3),
    !numbers.has(0.5),
    numbers.has(1),
    numbers.has(2.2),
    !numbers.has(3),
    !numbers.has(4),
    numbers.has(5),
    numbers.has(999999),
    numbers.has(Infinity),
])

console.log(`\nwordTtests`, [
    !words.has("apple"),
    !words.has("beach"),
    words.has("monty"),
    words.has("ponder"),
    !words.has("zebra")
])